from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.services.ai_chat import get_chat_service
from typing import List, Optional
import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "1"

class ChatMessageSchema(BaseModel):
    id: int
    role: str
    content: str
    thread_id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

@router.get("/history", response_model=List[ChatMessageSchema])
def get_chat_history(
    thread_id: str = "1",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: Fetching chat history for user {current_user.email}, thread {thread_id}")
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == thread_id
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.post("/message")
def send_chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: Message from {current_user.email} in thread {request.thread_id}")
    
    # 1. Save user message
    user_msg = ChatMessage(
        user_id=current_user.id, 
        role="user", 
        content=request.message, 
        thread_id=request.thread_id
    )
    db.add(user_msg)
    
    # 2. Get AI response
    chat_service = get_chat_service()
    
    profile_data = None
    if current_user.profile:
        profile_data = {
            "age": current_user.profile.age,
            "weight": current_user.profile.weight,
            "objective": current_user.profile.objective,
            "name": current_user.profile.name
        }
        
    # Get previous messages for context (last 10 messages)
    history_msgs = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == request.thread_id
    ).order_by(ChatMessage.created_at.desc()).limit(11).all()
    history_msgs.reverse()
    
    context = ""
    for msg in history_msgs[:-1]: # All but the one we just added
        context += f"{msg.role}: {msg.content}\n"

    full_prompt = f"Previous context:\n{context}\nUser: {request.message}" if context else request.message
    ai_reply = chat_service.generate_response(full_prompt, profile_data)
    
    # 3. Save AI message
    assistant_msg = ChatMessage(
        user_id=current_user.id, 
        role="assistant", 
        content=ai_reply, 
        thread_id=request.thread_id
    )
    db.add(assistant_msg)
    
    db.commit()
    db.refresh(assistant_msg)
    
    return assistant_msg

@router.delete("/thread/{thread_id}")
def delete_chat_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: Deleting thread {thread_id} for user {current_user.email}")
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == thread_id
    ).delete()
    db.commit()
    return {"status": "success", "message": f"Thread {thread_id} deleted"}
