from sqlalchemy.orm import Session
from typing import List, Dict
import re
from models.schedule import ClassSchedule, Section
from models.academic import Room, Course, ClassType, DurationMode
from models.teacher import Teacher, TeacherPreference, TeacherTimingPreference
from models.user import User, UserRole
from core.security import get_password_hash
from core.constants import TIME_SLOTS, LAB_DAYS, THEORY_DAYS

def ensure_tba_teacher(db: Session) -> Teacher:
    """
    Ensures that a 'TBA' teacher exists in the database.
    """
    tba = db.query(Teacher).filter(Teacher.initial == "TBA").first()
    if tba:
        return tba
    
    # Create User for TBA
    user = db.query(User).filter(User.email == "tba@northsouth.edu").first()
    if not user:
        user = User(
            email="tba@northsouth.edu",
            password_hash=get_password_hash("tba123"),
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Create Teacher Profile
    tba = Teacher(
        user_id=user.id,
        initial="TBA",
        name="To Be Announced",
        department="General"
    )
    db.add(tba)
    db.commit()
    db.refresh(tba)
    return tba

def assign_remaining_to_tba(db: Session):
    """
    Assigns all unassigned sections to the 'TBA' teacher.
    """
    tba = ensure_tba_teacher(db)
    
    # Find all sections with no teacher
    sections = db.query(Section).filter(Section.teacher_id == None).all()
    
    count = 0
    for section in sections:
        section.teacher_id = tba.id
        count += 1
        
    if count > 0:
        print(f"Assigned {count} remaining sections to TBA.")
    db.commit()

def get_preferred_slots(db: Session, teacher_id: int) -> List[Dict]:
    """
    Returns a list of preferred slots for a teacher.
    Format: [{'day': 'Monday', 'start_time': '08:00 AM', 'end_time': '09:30 AM', 'slot_id': 1}, ...]
    """
    if not teacher_id:
        return []
    
    prefs = db.query(TeacherTimingPreference).filter(TeacherTimingPreference.teacher_id == teacher_id).all()
    preferred_slots = []
    
    for pref in prefs:
        # Map time string to slot ID
        # This is a simplification. In reality, we'd need to parse times.
        # Assuming preferences are stored exactly as TIME_SLOTS values or we match them.
        # Let's try to match start_time with TIME_SLOTS values.
        for slot_id, time_range in TIME_SLOTS.items():
            if pref.start_time in time_range: # e.g. "08:00 AM" in "08:00 AM - 09:30 AM"
                preferred_slots.append({'day': pref.day, 'slot_id': slot_id})
    
    return preferred_slots

def assign_teachers_to_sections(db: Session):
    """
    Assigns teachers to sections based on accepted preferences.
    Only assigns to sections that currently have no teacher.
    Also ensures that if a teacher is assigned to a Theory course, 
    they are also assigned to the corresponding Lab course (if it exists).
    """
    # 1. Fetch all accepted preferences
    preferences = db.query(TeacherPreference).filter(TeacherPreference.status == 'accepted').all()
    
    # 2. Iterate preferences and assign
    for pref in preferences:
        # Find unassigned sections for this course
        sections = db.query(Section).filter(
            Section.course_id == pref.course_id,
            Section.teacher_id == None
        ).limit(pref.section_count).all()
        
        for section in sections:
            section.teacher_id = pref.teacher_id
            
            # Check for corresponding Lab/Theory course
            # Assumption: Lab code is Theory code + 'L' (e.g., CSE115 -> CSE115L)
            course = section.course
            target_code = ""
            if course.code.endswith('L'):
                # It's a lab, look for theory (remove 'L')
                target_code = course.code[:-1]
            else:
                # It's a theory, look for lab (add 'L')
                target_code = course.code + 'L'
            
            target_course = db.query(Course).filter(Course.code == target_code).first()
            
            if target_course:
                # Find a corresponding section for the target course
                # Ideally, we match section numbers (Sec 1 Theory -> Sec 1 Lab)
                target_section = db.query(Section).filter(
                    Section.course_id == target_course.id,
                    Section.section_number == section.section_number,
                    Section.teacher_id == None
                ).first()
                
                if target_section:
                    target_section.teacher_id = pref.teacher_id
                    print(f"Auto-assigned {pref.teacher.initial} to {target_code} Section {target_section.section_number} (Linked to {course.code})")

    db.commit()
    
    # Assign remaining sections to TBA
    assign_remaining_to_tba(db)

class ScheduleMatrix:
    """
    Helper class to manage the schedule matrix and check for conflicts.
    """
    def __init__(self, db: Session):
        self.db = db
        self.matrix = self._initialize_matrix()
        self.teacher_matrix = {} # teacher_id -> day -> slot -> True
        self._load_existing_schedules()

    def _initialize_matrix(self) -> Dict:
        """
        Initializes the schedule matrix with all rooms, days, and slots set to False (Empty).
        Structure: self.matrix[room_id][day][slot] = boolean
        """
        matrix = {}
        rooms = self.db.query(Room).all()
        
        # Days to include in the matrix (excluding Friday as it is blocked)
        # We include all LAB_DAYS which contains all days except Friday
        days = LAB_DAYS 

        for room in rooms:
            matrix[room.id] = {}
            for day in days:
                matrix[room.id][day] = {}
                for slot in TIME_SLOTS.keys():
                    matrix[room.id][day][slot] = False # False means Empty/Available
        return matrix

    def _load_existing_schedules(self):
        """
        Fetches all existing ClassSchedule entries from the DB and marks them as True (Occupied).
        Also populates teacher_matrix.
        """
        schedules = self.db.query(ClassSchedule).join(Section).all()
        for schedule in schedules:
            # Handle combined days (ST, MW, RA)
            days_to_mark = []
            if schedule.day in THEORY_DAYS:
                days_to_mark = THEORY_DAYS[schedule.day]
            else:
                days_to_mark = [schedule.day]

            for day in days_to_mark:
                # Mark Room
                if schedule.room_id in self.matrix and day in self.matrix[schedule.room_id]:
                    if schedule.time_slot_id in self.matrix[schedule.room_id][day]:
                        self.matrix[schedule.room_id][day][schedule.time_slot_id] = True
                
                # Mark Teacher
                if schedule.section.teacher_id:
                    tid = schedule.section.teacher_id
                    if tid not in self.teacher_matrix:
                        self.teacher_matrix[tid] = {}
                    if day not in self.teacher_matrix[tid]:
                        self.teacher_matrix[tid][day] = {}
                    self.teacher_matrix[tid][day][schedule.time_slot_id] = True

    def is_slot_available(self, room_id: int, day: str, slot: int) -> bool:
        """
        Checks if a specific slot is available.
        Returns False if the slot is occupied or if the day is Friday (implicitly handled by not being in matrix).
        """
        if day == 'Friday':
            return False
        
        if room_id not in self.matrix:
            return False
        if day not in self.matrix[room_id]:
            return False
        if slot not in self.matrix[room_id][day]:
            return False
            
        return not self.matrix[room_id][day][slot]

    def is_teacher_available(self, teacher_id: int, day: str, slot: int) -> bool:
        if not teacher_id:
            return True
        if teacher_id in self.teacher_matrix:
            if day in self.teacher_matrix[teacher_id]:
                if slot in self.teacher_matrix[teacher_id][day]:
                    return False
        return True

    def mark_slot_occupied(self, room_id: int, day: str, slot: int):
        """
        Marks a specific slot as occupied in the matrix.
        """
        if room_id in self.matrix and day in self.matrix[room_id] and slot in self.matrix[room_id][day]:
            self.matrix[room_id][day][slot] = True

    def mark_teacher_occupied(self, teacher_id: int, day: str, slot: int):
        if not teacher_id:
            return
        if teacher_id not in self.teacher_matrix:
            self.teacher_matrix[teacher_id] = {}
        if day not in self.teacher_matrix[teacher_id]:
            self.teacher_matrix[teacher_id][day] = {}
        self.teacher_matrix[teacher_id][day][slot] = True

def get_room_level(room_number: str) -> int:
    """
    Extracts the numeric part of the room number to determine the floor level.
    e.g., 'SAC202' -> 202, 'NAC305' -> 305.
    """
    match = re.search(r'\d+', room_number)
    if match:
        return int(match.group())
    return 9999 # Fallback

def schedule_extended_labs(db: Session, matrix: ScheduleMatrix):
    """
    Pass 1: Schedule Extended Labs (2 consecutive slots).
    - Fetches all Sections where Course.type='LAB' AND duration_mode='EXTENDED'.
    - Iterates through LAB type Rooms only.
    - Finds 2 Consecutive Empty Slots on any allowed day.
    - Assigns the section to those slots.
    """
    # Fetch sections that need scheduling
    # Note: In a real scenario, we might want to filter out sections that are already scheduled.
    # For this implementation, we assume we are scheduling unscheduled sections.
    sections = db.query(Section).join(Course).filter(
        Course.type == ClassType.LAB,
        Course.duration_mode == DurationMode.EXTENDED
    ).all()

    # Fetch LAB rooms
    lab_rooms = db.query(Room).filter(Room.type == ClassType.LAB).all()
    # Sort rooms by level (e.g. 200s before 300s)
    lab_rooms.sort(key=lambda r: get_room_level(r.room_number))
    
    scheduled_count = 0
    
    for section in sections:
        # Check if already scheduled (basic check)
        if db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).first():
            continue

        assigned = False
        
        # Get preferred slots for this teacher
        preferred_slots = get_preferred_slots(db, section.teacher_id)
        
        # Create a list of slots to try: Preferred first, then others
        # For Extended Labs, we need 2 consecutive slots.
        # We'll iterate all days/slots, but prioritize those matching preferences.
        
        # Strategy: 
        # 1. Try to find a room/time that matches preference.
        # 2. If not found, try any room/time.
        
        # To implement this cleanly without duplicating loops, we can just iterate normally
        # but maybe sort the days/slots? Or just keep it simple:
        # If we want to strictly enforce "Try Preference First", we should iterate preferences first.
        # But preferences are specific (Day + Slot).
        
        # Let's try to iterate all valid (Day, Slot1, Slot2) combinations.
        # Sort them so preferred ones come first.
        
        valid_combinations = [] # (day, slot1, slot2)
        sorted_slots = sorted(TIME_SLOTS.keys())
        
        for day in LAB_DAYS:
            for i in range(len(sorted_slots) - 1):
                slot1 = sorted_slots[i]
                slot2 = sorted_slots[i+1]
                
                score = 0
                # Check if this combination matches any preference
                for pref in preferred_slots:
                    if pref['day'] == day and (pref['slot_id'] == slot1 or pref['slot_id'] == slot2):
                        score += 10 # High priority
                
                valid_combinations.append({'day': day, 'slot1': slot1, 'slot2': slot2, 'score': score})
        
        # Sort by score descending
        valid_combinations.sort(key=lambda x: x['score'], reverse=True)

        for room in lab_rooms:
            if assigned:
                break
            
            for combo in valid_combinations:
                day = combo['day']
                slot1 = combo['slot1']
                slot2 = combo['slot2']
                
                if matrix.is_slot_available(room.id, day, slot1) and \
                   matrix.is_slot_available(room.id, day, slot2) and \
                   matrix.is_teacher_available(section.teacher_id, day, slot1) and \
                   matrix.is_teacher_available(section.teacher_id, day, slot2):
                    
                    # Assign slots
                    sched1 = ClassSchedule(
                        section_id=section.id,
                        room_id=room.id,
                        day=day,
                        time_slot_id=slot1,
                        availability=room.capacity
                    )
                    sched2 = ClassSchedule(
                        section_id=section.id,
                        room_id=room.id,
                        day=day,
                        time_slot_id=slot2,
                        availability=room.capacity
                    )
                    
                    db.add(sched1)
                    db.add(sched2)
                    
                    # Update Matrix
                    matrix.mark_slot_occupied(room.id, day, slot1)
                    matrix.mark_slot_occupied(room.id, day, slot2)
                    matrix.mark_teacher_occupied(section.teacher_id, day, slot1)
                    matrix.mark_teacher_occupied(section.teacher_id, day, slot2)
                    
                    assigned = True
                    scheduled_count += 1
                    break
        
        if not assigned:
            print(f"Warning: Could not schedule Extended Lab Section {section.id} ({section.course.code})")
            
    db.commit()
    return scheduled_count

def schedule_standard_courses(db: Session, matrix: ScheduleMatrix):
    """
    Pass 2: Schedule Standard Courses (Theory & Special Labs).
    - Fetches all Sections where duration_mode='STANDARD'.
    - Theory Logic:
        - Try to fit into THEORY rooms.
        - Must match Patterns: ST (Sun+Tue), MW (Mon+Wed), or RA (Thu+Sat) at the same time slot.
        - ECE Dept -> SAC Rooms (SAC%)
        - Other Depts -> NAC Rooms (NAC%)
    - Special Lab Logic:
        - Try to fit into LAB rooms.
        - Must match Patterns: ST (Sun+Tue), MW (Mon+Wed), or RA (Thu+Sat) at the same time slot.
    """
    sections = db.query(Section).join(Course).filter(
        Course.duration_mode == DurationMode.STANDARD
    ).all()

    # Separate rooms by type
    theory_rooms = db.query(Room).filter(Room.type == ClassType.THEORY).all()
    lab_rooms = db.query(Room).filter(Room.type == ClassType.LAB).all()

    # Sort rooms by level (e.g. 200s before 300s)
    theory_rooms.sort(key=lambda r: get_room_level(r.room_number))
    lab_rooms.sort(key=lambda r: get_room_level(r.room_number))

    scheduled_count = 0

    for section in sections:
        # Check if already scheduled
        if db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).first():
            continue

        assigned = False
        
        # Determine target rooms based on course type and teacher department
        if section.course.type == ClassType.THEORY:
            # Filter rooms based on department
            teacher = section.teacher
            if teacher and teacher.department == "ECE":
                # ECE gets SAC rooms
                target_rooms = [r for r in theory_rooms if r.room_number.startswith("SAC")]
            else:
                # Others get NAC rooms (or anything not SAC if NAC doesn't exist, but assuming NAC exists)
                target_rooms = [r for r in theory_rooms if r.room_number.startswith("NAC")]
                
            # Fallback: If no specific rooms found (e.g. no SAC rooms), use all theory rooms
            if not target_rooms:
                target_rooms = theory_rooms
        else: # Special Labs
            target_rooms = lab_rooms

        # Get preferred slots
        preferred_slots = get_preferred_slots(db, section.teacher_id)

        # Generate all valid pattern/slot combinations and sort by preference
        valid_combinations = [] # (pattern, day1, day2, slot)
        
        for pattern, days in THEORY_DAYS.items():
            day1, day2 = days[0], days[1]
            for slot in TIME_SLOTS.keys():
                score = 0
                for pref in preferred_slots:
                    if (pref['day'] == day1 or pref['day'] == day2) and pref['slot_id'] == slot:
                        score += 10 # High priority for matching preference
                valid_combinations.append({'pattern': pattern, 'day1': day1, 'day2': day2, 'slot': slot, 'score': score})
        
        valid_combinations.sort(key=lambda x: x['score'], reverse=True)

        for room in target_rooms:
            if assigned:
                break
            
            for combo in valid_combinations:
                pattern = combo['pattern']
                day1 = combo['day1']
                day2 = combo['day2']
                slot = combo['slot']
                
                if matrix.is_slot_available(room.id, day1, slot) and \
                   matrix.is_slot_available(room.id, day2, slot) and \
                   matrix.is_teacher_available(section.teacher_id, day1, slot) and \
                   matrix.is_teacher_available(section.teacher_id, day2, slot):
                    
                    # Assign slots - Single entry with pattern
                    sched = ClassSchedule(
                        section_id=section.id,
                        room_id=room.id,
                        day=pattern, # 'ST', 'MW', or 'RA'
                        time_slot_id=slot,
                        availability=room.capacity
                    )
                    
                    db.add(sched)
                    
                    # Update Matrix
                    matrix.mark_slot_occupied(room.id, day1, slot)
                    matrix.mark_slot_occupied(room.id, day2, slot)
                    matrix.mark_teacher_occupied(section.teacher_id, day1, slot)
                    matrix.mark_teacher_occupied(section.teacher_id, day2, slot)
                    
                    assigned = True
                    scheduled_count += 1
                    break
        
        if not assigned:
            print(f"Warning: Could not schedule Standard Section {section.id} ({section.course.code})")

    db.commit()
    return scheduled_count
