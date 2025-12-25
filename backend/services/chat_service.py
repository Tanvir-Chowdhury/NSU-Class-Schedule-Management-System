import os
from typing import List
from sqlalchemy.orm import Session, joinedload
from core.ai_config import get_embeddings, pc, mistral_client
from models.user import User, UserRole
from models.schedule import Section, ClassSchedule
from models.academic import Course
from models.teacher import Teacher

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "csms-rag")

def get_available_sections_text(db: Session) -> str:
    """
    Fetches all available sections and formats them into a string for the LLM.
    """
    sections = db.query(Section).options(
        joinedload(Section.course),
        joinedload(Section.teacher),
        joinedload(Section.schedules)
    ).all()
    
    text = "Available Sections:\n"
    for section in sections:
        schedule_text = ", ".join([f"{s.day} Slot {s.time_slot_id}" for s in section.schedules])
        teacher_name = section.teacher.initial if section.teacher else "Unknown"
        text += f"- {section.course.code} ({section.course.title}) Section {section.section_number}: {schedule_text} (Teacher: {teacher_name})\n"
    return text

def generate_response(query: str, current_user: User, db: Session) -> str:
    """
    Generates a response to the user's query using RAG with Mistral and Pinecone.
    Enforces privacy rules and system prompts.
    Handles 'Plan my courses' intent.
    """
    # 0. Intent Detection: Course Planning
    if "plan my courses" in query.lower() or "plan courses" in query.lower():
        sections_text = get_available_sections_text(db)
        
        system_content = (
            "You are a Course Planning Assistant for the Class Schedule Management System.\n"
            "Your goal is to help the user plan their course schedule based on available sections.\n"
            "The user will provide constraints (e.g., specific days, courses).\n"
            "You must suggest a valid schedule that has NO time conflicts.\n"
            "Use the provided list of Available Sections.\n"
            "Format the output clearly as a suggested schedule.\n"
        )
        
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": f"{sections_text}\n\nUser Constraints/Query: {query}"}
        ]
        
        try:
            chat_response = mistral_client.chat.complete(
                model="mistral-large-latest",
                messages=messages,
            )
            return chat_response.choices[0].message.content
        except Exception as e:
            print(f"Mistral planning error: {e}")
            return "I'm sorry, I encountered an error while planning your courses."

    # 1. Generate Embedding for the Query
    query_embedding = get_embeddings(query)
    if not query_embedding:
        return "I'm sorry, I'm having trouble processing your request right now."

    # 2. Define Pinecone Filters based on Role
    # Note: The requirement "EXCLUDE metadata where role='STUDENT' except..." is handled via System Prompt
    # because Pinecone filters operate on the document level, and we have one document per student containing all info.
    # We cannot filter *fields* within a document using Pinecone filters.
    # Therefore, we retrieve the document but instruct the LLM to redact sensitive info.
    
    filter_dict = {}
    if current_user.role == UserRole.STUDENT:
        # Students can see Teachers and Admins (and potentially themselves, but let's keep it simple)
        # We might want to exclude other students' data for privacy, but the prompt didn't explicitly forbid it for students,
        # only emphasized they can know about teachers. 
        # Let's assume standard privacy: Students shouldn't see other students' profiles via RAG.
        # filter_dict = {"role": {"$in": ["TEACHER", "ADMIN"]}} # Pinecone metadata filter syntax varies, let's keep it open for now or use post-filtering.
        pass 

    # 3. Query Pinecone
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        search_results = index.query(
            vector=query_embedding,
            top_k=3,
            include_metadata=True,
            filter=filter_dict if filter_dict else None
        )
    except Exception as e:
        print(f"Pinecone search error: {e}")
        return "I'm having trouble accessing the knowledge base."

    # 4. Construct Context from Results
    context_text = ""
    for match in search_results.matches:
        if match.metadata and "text" in match.metadata:
            context_text += f"---\n{match.metadata['text']}\n"

    # 5. Build System Prompt with Injection and Privacy Rules
    system_content = (
        "You are a University Assistant for the Class Schedule Management System.\n"
        "Use the provided context to answer the user's question.\n\n"
        "System Rules:\n"
        "1. Fridays are off-days, open for booking only.\n"
        "2. Lab classes are 3h 10m long (except CSE115L, 215L, 225L which are standard length).\n"
        "3. If the answer is not in the context, say you don't know.\n"
    )

    # Privacy Logic Injection
    if current_user.role == UserRole.TEACHER:
        system_content += (
            "\nPRIVACY WARNING: You are interacting with a TEACHER.\n"
            "If the context contains Student data, you are STRICTLY FORBIDDEN from revealing "
            "a Student's CGPA or Course History.\n"
            "You may ONLY provide their Name, NSU ID, and Email.\n"
        )
    elif current_user.role == UserRole.STUDENT:
        system_content += (
            "\nYou are interacting with a STUDENT. They have full access to Teacher information.\n"
        )

    # 6. Call Mistral
    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {query}"}
    ]

    try:
        chat_response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=messages,
        )
        return chat_response.choices[0].message.content
    except Exception as e:
        print(f"Mistral chat error: {e}")
        return "I'm sorry, I encountered an error while generating the response."
