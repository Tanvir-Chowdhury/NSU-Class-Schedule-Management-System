"""
Constants for the Class Schedule Management System.
"""

TIME_SLOTS = {
    1: "08:00 AM - 09:30 AM",
    2: "09:40 AM - 11:10 AM",
    3: "11:20 AM - 12:50 PM",
    4: "01:00 PM - 02:30 PM",
    5: "02:40 PM - 04:10 PM",
    6: "04:20 PM - 05:50 PM",
    7: "06:00 PM - 07:30 PM"
}

# Lab Time Slots (Merged Standard Slots)
# Slot 1+2, 3+4, 5+6
# Keys are the STARTING Theory Slot ID (1, 3, 5)
LAB_TIME_SLOTS = {
    1: "08:00 AM - 11:10 AM", # Covers Slot 1 & 2
    3: "11:20 AM - 02:30 PM", # Covers Slot 3 & 4
    5: "02:40 PM - 05:50 PM"  # Covers Slot 5 & 6
}

# Mapping from Lab Slot Index (1,3,5) to Standard Slot IDs
# 1 -> [1, 2]
# 3 -> [3, 4]
# 5 -> [5, 6]
LAB_SLOT_MAPPING = {
    1: [1, 2],
    3: [3, 4],
    5: [5, 6]
}

SPECIAL_LAB_CODES = ['CSE115L', 'CSE215L', 'CSE225L']

LAB_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday']

THEORY_DAYS = {
    'ST': ['Sunday', 'Tuesday'],
    'MW': ['Monday', 'Wednesday'],
    'RA': ['Thursday', 'Saturday']
}
