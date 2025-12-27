from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Dict, Optional, Tuple, Set
from models.schedule import ClassSchedule, Section
from models.academic import Room, Course, ClassType, DurationMode
from models.teacher import Teacher, TeacherPreference, TeacherTimingPreference
from core.constants import TIME_SLOTS, LAB_TIME_SLOTS, LAB_SLOT_MAPPING, THEORY_DAYS, LAB_DAYS

class AutoScheduler:
    def __init__(self, db: Session):
        self.db = db
        self.rooms = []
        self.instructors = []
        self.sections = []
        self.room_matrix = {} # room_id -> day -> slot -> bool
        self.instructor_matrix = {} # teacher_id -> day -> slot -> bool
        self.scheduled_section_ids = set()
        self.pattern_usage = {'ST': 0, 'MW': 0, 'RA': 0} # Track usage for load balancing
        
        # Load Data
        self._load_data()
        self._init_matrices()

    def _load_data(self):
        self.rooms = self.db.query(Room).all()
        self.instructors = self.db.query(Teacher).all()
        self.sections = self.db.query(Section).all()
        
        # Clear existing schedules
        self.db.query(ClassSchedule).delete()
        
        # Reset teacher assignments
        for section in self.sections:
            section.teacher_id = None
        self.db.flush()

    def _init_matrices(self):
        # Initialize Room Matrix
        for room in self.rooms:
            self.room_matrix[room.id] = {}
            for day in LAB_DAYS:
                self.room_matrix[room.id][day] = {slot: False for slot in TIME_SLOTS.keys()}

        # Initialize Instructor Matrix
        for instructor in self.instructors:
            self.instructor_matrix[instructor.id] = {}
            for day in LAB_DAYS:
                self.instructor_matrix[instructor.id][day] = {slot: False for slot in TIME_SLOTS.keys()}

    def _check_matrix_availability(self, matrix, entity_id, day, slot, is_lab):
        if entity_id not in matrix: return True 
        if day not in matrix[entity_id]: return False

        slots_to_check = []
        if is_lab:
            # Lab Slot L overlaps Theory Slots defined in MAPPING
            if slot in LAB_SLOT_MAPPING:
                slots_to_check = LAB_SLOT_MAPPING[slot]
            else:
                return False
        else:
            # Theory Slot T overlaps itself (and implicitly Lab slots that cover it)
            slots_to_check = [slot]

        for s in slots_to_check:
            if matrix[entity_id][day].get(s, True): # Default True (Occupied)
                return False
        return True

    def is_slot_valid(self, section: Section, teacher_id: Optional[int], room: Room, days: List[str], time_slot: int, is_lab: bool) -> bool:
        # 1. Check Room & Instructor Availability for ALL days in the pattern
        for day in days:
            # Check Room
            if not self._check_matrix_availability(self.room_matrix, room.id, day, time_slot, is_lab):
                return False
            
            # Check Instructor
            if teacher_id and not self._check_matrix_availability(self.instructor_matrix, teacher_id, day, time_slot, is_lab):
                return False

        # 2. Sibling Conflict Check
        # Ensure this section does not overlap with its sibling (Theory vs Lab)
        course_code = section.course.code
        sibling_code = course_code[:-1] if course_code.endswith('L') else course_code + 'L'
        
        # Find sibling section (same section number)
        # We check the DB for existing schedules for the sibling.
        # Since we flush after each schedule, DB query should return recently added schedules.
        
        sibling_schedules = self.db.query(ClassSchedule).join(Section).join(Course).filter(
            Course.code == sibling_code,
            Section.section_number == section.section_number
        ).all()

        for sched in sibling_schedules:
            # Check overlap
            # Sched Day vs Current Days
            sched_days = THEORY_DAYS.get(sched.day, [sched.day])
            
            for d1 in days:
                for d2 in sched_days:
                    if d1 == d2:
                        # Same day, check time overlap
                        # Get occupied slots for the sibling
                        sibling_slots = []
                        is_sibling_lab = sched.section.course.type == ClassType.LAB
                        if is_sibling_lab:
                            sibling_slots = LAB_SLOT_MAPPING.get(sched.time_slot_id, [])
                        else:
                            sibling_slots = [sched.time_slot_id]
                        
                        # Get occupied slots for current
                        current_slots = []
                        if is_lab:
                            current_slots = LAB_SLOT_MAPPING.get(time_slot, [])
                        else:
                            current_slots = [time_slot]
                            
                        # Intersection check
                        if set(sibling_slots) & set(current_slots):
                            return False

        return True

    def mark_occupied(self, teacher_id: Optional[int], room_id: int, days: List[str], slot: int, is_lab: bool):
        slots_to_mark = []
        if is_lab:
            slots_to_mark = LAB_SLOT_MAPPING.get(slot, [])
        else:
            slots_to_mark = [slot]

        for day in days:
            for s in slots_to_mark:
                self.room_matrix[room_id][day][s] = True
                if teacher_id:
                    self.instructor_matrix[teacher_id][day][s] = True

    def _normalize_time(self, time_str: str) -> str:
        """
        Normalize time string to HH:MM AM/PM format.
        Handles '8:00 AM' -> '08:00 AM'
        """
        try:
            parts = time_str.split()
            time_part = parts[0]
            meridiem = parts[1] if len(parts) > 1 else ""
            
            if ':' in time_part:
                h, m = time_part.split(':')
                return f"{int(h):02d}:{m} {meridiem}".strip()
            return time_str
        except:
            return time_str

    def _is_preferred(self, teacher_id: int, days: List[str], slot_id: int, is_lab: bool) -> bool:
        prefs = self.db.query(TeacherTimingPreference).filter(TeacherTimingPreference.teacher_id == teacher_id).all()
        if not prefs:
            return False
            
        # Get start time string for this slot
        slot_time_str = ""
        if is_lab:
            slot_time_str = LAB_TIME_SLOTS.get(slot_id, "")
        else:
            slot_time_str = TIME_SLOTS.get(slot_id, "")
            
        if not slot_time_str:
            return False
            
        # Extract start time "08:00 AM" from "08:00 AM - 09:30 AM"
        current_start_time = slot_time_str.split(" - ")[0]
        normalized_current = self._normalize_time(current_start_time)
        
        for pref in prefs:
            # Check if day matches any of the days in the pattern
            # Preference day might be "Sunday", "Monday" etc.
            # Current days is a list ['Sunday', 'Tuesday']
            
            day_match = False
            for d in days:
                if d == pref.day:
                    day_match = True
                    break
            
            if day_match:
                # Check time match with normalization
                normalized_pref = self._normalize_time(pref.start_time)
                if normalized_pref == normalized_current:
                    return True
                    
        return False

    def schedule_section(self, section: Section, teacher_id: Optional[int]) -> bool:
        if section.id in self.scheduled_section_ids:
            return True

        is_lab = section.course.type == ClassType.LAB
        
        # Filter Rooms by Type
        valid_rooms = [r for r in self.rooms if r.type == section.course.type]
        if not valid_rooms:
            print(f"No rooms found for {section.course.code} (Type: {section.course.type})")
            return False

        # Determine Slots and Patterns to try
        # If Teacher has preferences, try them first
        preferred_options = []
        other_options = []

        # Generate all possible options
        all_options = []
        if is_lab:
            # Lab: Single Days, Slots 1-3
            for day in LAB_DAYS:
                for slot in LAB_TIME_SLOTS.keys():
                    all_options.append({'days': [day], 'slot': slot, 'pattern': day})
        else:
            # Theory: Patterns, Slots 1-7
            # Sort patterns by usage (least used first) to balance load
            sorted_patterns = sorted(THEORY_DAYS.items(), key=lambda item: self.pattern_usage.get(item[0], 0))
            
            for pattern, days in sorted_patterns:
                for slot in TIME_SLOTS.keys():
                    all_options.append({'days': days, 'slot': slot, 'pattern': pattern})

        # Sort/Filter based on preferences
        # CRITICAL: We must prioritize teacher preferences first.
        # If a teacher has a preferred slot, we try that first.
        # If not (or if preferred slots are full), we fall back to the load-balanced 'other_options'.
        if teacher_id:
            for opt in all_options:
                if self._is_preferred(teacher_id, opt['days'], opt['slot'], is_lab):
                    preferred_options.append(opt)
                else:
                    other_options.append(opt)
        else:
            # For TBA (No Teacher), we strictly follow the load-balanced order (ST, MW, RA based on usage)
            other_options = all_options

        # Combine: Preferences > Load Balanced Options
        # This ensures that:
        # 1. Teachers get their preferred times if available.
        # 2. If no preference/TBA, we pick the day pattern that is least used (Load Balancing).
        final_options = preferred_options + other_options

        # Try to find a valid slot
        for opt in final_options:
            days = opt['days']
            slot = opt['slot']
            pattern = opt['pattern']
            
            for room in valid_rooms:
                if self.is_slot_valid(section, teacher_id, room, days, slot, is_lab):
                    # Found a slot!
                    # 1. Assign Teacher
                    section.teacher_id = teacher_id
                    self.db.add(section)
                    
                    # 2. Create Schedule
                    slots_to_create = []
                    if is_lab:
                        slots_to_create = LAB_SLOT_MAPPING.get(slot, [slot])
                    else:
                        slots_to_create = [slot]

                    for s_id in slots_to_create:
                        sched = ClassSchedule(
                            section_id=section.id,
                            room_id=room.id,
                            day=pattern, # 'ST', 'MW', or 'RA'
                            time_slot_id=s_id,
                            availability=room.capacity
                        )
                        self.db.add(sched)
                    
                    # 3. Update Matrix
                    self.mark_occupied(teacher_id, room.id, days, slot, is_lab)
                    
                    # 4. Update Pattern Usage (for Theory)
                    if not is_lab and pattern in self.pattern_usage:
                        self.pattern_usage[pattern] += 1

                    # 5. Mark Scheduled
                    self.scheduled_section_ids.add(section.id)
                    
                    # Flush to make it visible for sibling checks
                    self.db.flush()
                    return True
        
        print(f"Failed to schedule {section.course.code} Sec {section.section_number}")
        return False

    def find_sibling_section(self, section: Section) -> Optional[Section]:
        course_code = section.course.code
        sibling_code = course_code[:-1] if course_code.endswith('L') else course_code + 'L'
        
        # Find in self.sections
        for s in self.sections:
            if s.course.code == sibling_code and s.section_number == section.section_number:
                return s
        return None

    def run(self):
        print("Starting AutoScheduler...")
        
        # Step 3: Round-Robin Assignment
        # Build queues
        teacher_queues = {}
        for teacher in self.instructors:
            prefs = self.db.query(TeacherPreference).filter(
                TeacherPreference.teacher_id == teacher.id,
                TeacherPreference.status == 'accepted'
            ).all()
            
            queue = []
            for pref in prefs:
                # Find sections of this course
                # We just put the Course object in the queue
                for _ in range(pref.section_count):
                    queue.append(pref.course)
            
            teacher_queues[teacher.id] = queue

        if not teacher_queues:
            max_rounds = 0
        else:
            max_rounds = max(len(q) for q in teacher_queues.values())

        print(f"Max rounds: {max_rounds}")

        for r in range(max_rounds):
            for teacher in self.instructors:
                queue = teacher_queues.get(teacher.id, [])
                if r < len(queue):
                    course = queue[r]
                    
                    # Find an unassigned section of this course
                    candidate_section = None
                    for s in self.sections:
                        if s.course_id == course.id and s.teacher_id is None:
                            candidate_section = s
                            break
                    
                    if candidate_section:
                        # Try to schedule
                        if self.schedule_section(candidate_section, teacher.id):
                            # Handle Sibling
                            sibling = self.find_sibling_section(candidate_section)
                            if sibling and sibling.teacher_id is None:
                                self.schedule_section(sibling, teacher.id)

        # Step 4: TBA Handling
        print("Assigning remaining sections to TBA...")
        for section in self.sections:
            if section.id not in self.scheduled_section_ids:
                self.schedule_section(section, None)

        # Step 5: Save
        self.db.commit()
        print("Scheduling Complete.")
        return len(self.scheduled_section_ids)
