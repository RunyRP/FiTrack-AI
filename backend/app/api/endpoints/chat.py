from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.services.ai_chat import get_chat_service
from typing import List
import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatMessageSchema(BaseModel):
    role: str
    content: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

@router.get("/history", response_model=List[ChatMessageSchema])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.post("/message")
def send_chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_chat import get_chat_service
    # 1. Save user message
    user_msg = ChatMessage(user_id=current_user.id, role="user", content=request.message)
    db.add(user_msg)
    
    # 2. Get AI response
    chat_service = get_chat_service()
    
    profile_data = None
    if current_user.profile:
        profile_data = {
            "age": current_user.profile.age,
            "weight": current_user.profile.weight,
            "objective": current_user.profile.objective
        }
        
    ai_reply = chat_service.generate_response(request.message, profile_data)
    
    # 3. Save AI message
    assistant_msg = ChatMessage(user_id=current_user.id, role="assistant", content=ai_reply)
    db.add(assistant_msg)
    
    db.commit()
    db.refresh(assistant_msg)
    
    return assistant_msg
