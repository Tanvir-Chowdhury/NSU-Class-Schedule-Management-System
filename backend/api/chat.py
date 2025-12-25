from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from services.chat_service import generate_response

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

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
