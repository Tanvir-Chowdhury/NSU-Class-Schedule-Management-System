from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from models.chat import ChatMessage
from services.chat_service import generate_response

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

class ChatMessageSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime

    class Config:
        orm_mode = True

@router.get("/history", response_model=List[ChatMessageSchema])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get chat history for the current user.
    """
    messages = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp.asc()).all()
    return messages

@router.post("/message", response_model=ChatResponse)
def chat_endpoint(
    request: ChatRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Chat with the AI Assistant.
    """
    response_text = generate_response(request.query, current_user, db)
    return {"response": response_text}
