from sqlalchemy.orm import Session
from typing import List, Dict
from models.schedule import ClassSchedule, Section
from models.academic import Room, Course, ClassType, DurationMode
from core.constants import TIME_SLOTS, LAB_DAYS, THEORY_DAYS

class ScheduleMatrix:
    """
    Helper class to manage the schedule matrix and check for conflicts.
    """
    def __init__(self, db: Session):
        self.db = db
        self.matrix = self._initialize_matrix()
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
        """
        schedules = self.db.query(ClassSchedule).all()
        for schedule in schedules:
            # Handle combined days (ST, MW, RA)
            days_to_mark = []
            if schedule.day in THEORY_DAYS:
                days_to_mark = THEORY_DAYS[schedule.day]
            else:
                days_to_mark = [schedule.day]

            for day in days_to_mark:
                # Skip if room or day is not in our matrix (e.g. if data is corrupted or Friday booking exists manually)
                if schedule.room_id in self.matrix and day in self.matrix[schedule.room_id]:
                    if schedule.time_slot_id in self.matrix[schedule.room_id][day]:
                        self.matrix[schedule.room_id][day][schedule.time_slot_id] = True

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

    def mark_slot_occupied(self, room_id: int, day: str, slot: int):
        """
        Marks a specific slot as occupied in the matrix.
        """
        if room_id in self.matrix and day in self.matrix[room_id] and slot in self.matrix[room_id][day]:
            self.matrix[room_id][day][slot] = True

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
    
    scheduled_count = 0
    
    for section in sections:
        # Check if already scheduled (basic check)
        if db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).first():
            continue

        assigned = False
        for room in lab_rooms:
            if assigned:
                break
            
            for day in LAB_DAYS:
                if assigned:
                    break
                
                # Check for 2 consecutive slots
                # Slots are 1-indexed keys in TIME_SLOTS
                sorted_slots = sorted(TIME_SLOTS.keys())
                for i in range(len(sorted_slots) - 1):
                    slot1 = sorted_slots[i]
                    slot2 = sorted_slots[i+1]
                    
                    if matrix.is_slot_available(room.id, day, slot1) and \
                       matrix.is_slot_available(room.id, day, slot2):
                        
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

    scheduled_count = 0

    for section in sections:
        # Check if already scheduled
        if db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).first():
            continue

        assigned = False
        
        # Determine target rooms based on course type
        if section.course.type == ClassType.THEORY:
            target_rooms = theory_rooms
        else: # Special Labs
            target_rooms = lab_rooms

        for room in target_rooms:
            if assigned:
                break
            
            # Iterate through patterns (ST, MW, RA)
            for pattern, days in THEORY_DAYS.items():
                if assigned:
                    break
                
                day1, day2 = days[0], days[1]
                
                # Iterate through slots
                for slot in TIME_SLOTS.keys():
                    if matrix.is_slot_available(room.id, day1, slot) and \
                       matrix.is_slot_available(room.id, day2, slot):
                        
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
                        
                        assigned = True
                        scheduled_count += 1
                        break
        
        if not assigned:
            print(f"Warning: Could not schedule Standard Section {section.id} ({section.course.code})")

    db.commit()
    return scheduled_count
