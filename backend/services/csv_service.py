import pandas as pd
from fastapi import UploadFile, HTTPException
from typing import List
import io

from models.academic import ClassType, DurationMode
from schemas.academic import CourseCreate, RoomCreate
from schemas.teacher import TeacherCreate
from core.constants import SPECIAL_LAB_CODES

async def parse_course_csv(file: UploadFile) -> List[CourseCreate]:
    """
    Parses an uploaded CSV file containing course information and returns a list of CourseCreate objects.
    
    Auto-Detection Logic:
    - Reads 'Code', 'Title', 'Credits' columns.
    - If 'Code' ends with 'L':
        - Sets type to 'LAB'.
        - Checks if 'Code' is in SPECIAL_LAB_CODES.
            - If Yes: Sets duration_mode to 'STANDARD' (1 slot).
            - If No: Sets duration_mode to 'EXTENDED' (2 slots).
    - Else:
        - Sets type to 'THEORY'.
        - Sets duration_mode to 'STANDARD'.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_columns = ['Code', 'Title', 'Credits']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_columns)}")

        courses = []
        for _, row in df.iterrows():
            code = str(row['Code']).strip()
            title = str(row['Title']).strip()
            credits = int(row['Credits'])
            
            # Optional Sections column
            sections_count = 0
            if 'Sections' in df.columns:
                try:
                    val = row['Sections']
                    if pd.notna(val):
                        sections_count = int(val)
                except ValueError:
                    sections_count = 0
            
            if code.endswith('L'):
                course_type = ClassType.LAB
                if code in SPECIAL_LAB_CODES:
                    duration_mode = DurationMode.STANDARD
                else:
                    duration_mode = DurationMode.EXTENDED
            else:
                course_type = ClassType.THEORY
                duration_mode = DurationMode.STANDARD
            
            course = CourseCreate(
                code=code,
                title=title,
                credits=credits,
                type=course_type,
                duration_mode=duration_mode,
                sections_count=sections_count
            )
            courses.append(course)
            
        return courses

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CSV: {str(e)}")

async def parse_teacher_csv(file: UploadFile) -> List[TeacherCreate]:
    """
    Parses an uploaded CSV file containing teacher information.
    Columns: Initial, Name, Email
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_columns = ['Initial', 'Name', 'Email']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_columns)}")

        teachers = []
        for _, row in df.iterrows():
            initial = str(row['Initial']).strip()
            name = str(row['Name']).strip()
            email = str(row['Email']).strip()
            
            teacher = TeacherCreate(
                initial=initial,
                name=name,
                email=email
            )
            teachers.append(teacher)
            
        return teachers

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CSV: {str(e)}")

async def parse_room_csv(file: UploadFile) -> List[RoomCreate]:
    """
    Parses an uploaded CSV file containing room information.
    Columns: Room Number, Capacity, Type
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_columns = ['Room Number', 'Capacity', 'Type']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_columns)}")

        rooms = []
        for _, row in df.iterrows():
            room_number = str(row['Room Number']).strip()
            capacity = int(row['Capacity'])
            room_type_str = str(row['Type']).strip().upper()
            
            if room_type_str == 'LAB':
                room_type = ClassType.LAB
            else:
                room_type = ClassType.THEORY
            
            room = RoomCreate(
                room_number=room_number,
                capacity=capacity,
                type=room_type
            )
            rooms.append(room)
            
        return rooms

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CSV: {str(e)}")
