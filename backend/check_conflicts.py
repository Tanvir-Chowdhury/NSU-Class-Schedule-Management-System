import sys
import os
from collections import defaultdict
from sqlalchemy import func

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Import all models to ensure they are registered with SQLAlchemy
from models import academic, admin, booking, schedule, settings, student, teacher, user, verification

from core.database import SessionLocal
from models.schedule import ClassSchedule, Section
from models.academic import Course, Room
from models.teacher import Teacher

def check_conflicts():
    db = SessionLocal()
    try:
        print("--- Checking for Schedule Conflicts ---")
        schedules = db.query(ClassSchedule).all()
        
        # 1. Room Conflicts
        print("\n1. Checking Room Conflicts...")
        room_map = defaultdict(list)
        room_conflicts = 0
        for s in schedules:
            key = (s.room_id, s.day, s.time_slot_id)
            room_map[key].append(s)
            
        for key, conflicts in room_map.items():
            if len(conflicts) > 1:
                room_conflicts += 1
                room = db.query(Room).get(key[0])
                print(f"  [CONFLICT] Room {room.room_number} at {key[1]} Slot {key[2]}:")
                for c in conflicts:
                    sec = db.query(Section).get(c.section_id)
                    course = db.query(Course).get(sec.course_id)
                    print(f"    - {course.code} Sec {sec.section_number} (ID: {c.id})")

        if room_conflicts == 0:
            print("  No room conflicts found.")

        # 2. Teacher Conflicts
        print("\n2. Checking Teacher Conflicts...")
        teacher_map = defaultdict(list)
        teacher_conflicts = 0
        for s in schedules:
            sec = db.query(Section).get(s.section_id)
            if sec.teacher_id: # Skip TBA
                key = (sec.teacher_id, s.day, s.time_slot_id)
                teacher_map[key].append(s)
        
        for key, conflicts in teacher_map.items():
            if len(conflicts) > 1:
                teacher_conflicts += 1
                teacher = db.query(Teacher).get(key[0])
                print(f"  [CONFLICT] Teacher {teacher.initial} at {key[1]} Slot {key[2]}:")
                for c in conflicts:
                    sec = db.query(Section).get(c.section_id)
                    course = db.query(Course).get(sec.course_id)
                    print(f"    - {course.code} Sec {sec.section_number} (Room {c.room_id})")

        if teacher_conflicts == 0:
            print("  No teacher conflicts found.")

        # 3. Linked Section Conflicts (Theory vs Lab)
        print("\n3. Checking Linked Section Conflicts (Theory vs Lab)...")
        # Group sections by (BaseCode, SectionNumber)
        # BaseCode: CSE101L -> CSE101
        linked_map = defaultdict(list)
        
        all_sections = db.query(Section).all()
        for sec in all_sections:
            course = db.query(Course).get(sec.course_id)
            code = course.code.strip().upper()
            base_code = code[:-1] if code.endswith('L') else code
            linked_map[(base_code, sec.section_number)].append(sec)
            
        linked_conflicts = 0
        for (base_code, sec_num), sections in linked_map.items():
            if len(sections) > 1:
                # Check for time overlaps
                # Get schedules for these sections
                section_schedules = []
                for sec in sections:
                    scheds = db.query(ClassSchedule).filter(ClassSchedule.section_id == sec.id).all()
                    for sched in scheds:
                        section_schedules.append({
                            'course': sec.course.code,
                            'type': sec.course.type,
                            'day': sched.day,
                            'slot': sched.time_slot_id,
                            'sched_id': sched.id
                        })
                
                # Compare all pairs
                for i in range(len(section_schedules)):
                    for j in range(i + 1, len(section_schedules)):
                        s1 = section_schedules[i]
                        s2 = section_schedules[j]
                        
                        # Check overlap
                        # Days: ST vs ST, or ST vs Sunday/Tuesday
                        days1 = get_days(s1['day'])
                        days2 = get_days(s2['day'])
                        
                        common_days = set(days1) & set(days2)
                        if common_days and s1['slot'] == s2['slot']:
                            linked_conflicts += 1
                            print(f"  [CONFLICT] Linked Section {base_code} Sec {sec_num}:")
                            print(f"    - {s1['course']} ({s1['type']}) at {s1['day']} Slot {s1['slot']}")
                            print(f"    - {s2['course']} ({s2['type']}) at {s2['day']} Slot {s2['slot']}")

        if linked_conflicts == 0:
            print("  No linked section conflicts found.")

    finally:
        db.close()

def get_days(day_str):
    if day_str == 'ST': return ['Sunday', 'Tuesday']
    if day_str == 'MW': return ['Monday', 'Wednesday']
    if day_str == 'RA': return ['Thursday', 'Saturday']
    return [day_str]

if __name__ == "__main__":
    check_conflicts()
