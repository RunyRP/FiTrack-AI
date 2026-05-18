from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.log import DailyLog
from app.models.workout import WorkoutSession
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
    thread_title: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    role: str
    content: str
    thread_id: str
    thread_title: Optional[str]
    created_at: datetime.datetime

@router.get("/threads")
def get_chat_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a list of unique thread IDs and their titles for the current user."""
    # We find unique thread_ids and take the first thread_title found for each
    from sqlalchemy import func
    
    threads = db.query(
        ChatMessage.thread_id,
        func.max(ChatMessage.thread_title).label("title")
    ).filter(
        ChatMessage.user_id == current_user.id
    ).group_by(
        ChatMessage.thread_id
    ).all()
    
    return [{"id": t.thread_id, "title": t.title or f"Session {t.thread_id}"} for t in threads]

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

@router.post("/message", response_model=ChatResponse)
def send_chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: Message from {current_user.email} in thread {request.thread_id}")
    
    # Check if this is the first message in the thread to generate a title
    existing_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == request.thread_id
    ).count()

    chat_service = get_chat_service()
    thread_title = None
    if existing_messages == 0:
        thread_title = chat_service.generate_thread_title(request.message)

    # 1. Save user message
    user_msg = ChatMessage(
        user_id=current_user.id, 
        role="user", 
        content=request.message, 
        thread_id=request.thread_id,
        thread_title=thread_title
    )
    db.add(user_msg)
    db.commit() # Commit immediately so it's visible to history fetches
    
    # 2. Get AI response
    chat_service = get_chat_service()
    
    profile_data = None
    if current_user.profile:
        # Fetch recent logs for context
        recent_logs = db.query(DailyLog).filter(
            DailyLog.user_id == current_user.id
        ).order_by(DailyLog.date.desc()).limit(7).all()
        
        weight_history = [{"date": str(log.date), "weight": log.weight} for log in recent_logs if log.weight]
        kcal_history = [{"date": str(log.date), "kcal": log.total_kcal} for log in recent_logs]
        
        # Fetch recent workouts
        recent_workouts = db.query(WorkoutSession).filter(
            WorkoutSession.user_id == current_user.id
        ).order_by(WorkoutSession.date.desc()).limit(3).all()
        
        workout_summary = [
            {"date": str(w.date.date()), "name": w.name, "exercises_count": len(w.exercises)} 
            for w in recent_workouts
        ]

        # Map diet type from objective
        diet_map = {
            "lose_weight": "Caloric Deficit (Weight Loss)",
            "maintain": "Maintenance",
            "gain_muscle": "Caloric Surplus (Bulking)"
        }
        diet_info = diet_map.get(current_user.profile.objective, "Fitness Balanced")
        if current_user.profile.cut_intensity != "medium":
            diet_info += f" ({current_user.profile.cut_intensity} intensity)"

        # Get workout schedule
        training_days = []
        rest_days = []
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        
        if current_user.workout_schedule:
            gym_days = current_user.workout_schedule.gym_days or []
            training_days = [day_names[d-1] for d in gym_days]
            rest_days = [day_names[d-1] for d in range(1, 8) if d not in gym_days]

        from app.core.calculations import calculate_macros
        target_kcal = current_user.profile.target_kcal or 2000
        macros = calculate_macros(target_kcal, current_user.profile.macro_distribution or "balanced")

        profile_data = {
            "age": current_user.profile.age,
            "weight": current_user.profile.weight,
            "objective": current_user.profile.objective,
            "name": current_user.profile.name,
            "diet_type": diet_info,
            "training_days": training_days,
            "rest_days": rest_days,
            "target_steps": current_user.profile.target_steps,
            "target_kcal": target_kcal,
            "target_protein": macros["protein"],
            "target_carbs": macros["carbs"],
            "target_fat": macros["fat"],
            "weight_history": weight_history,
            "kcal_history": kcal_history,
            "workout_summary": workout_summary
        }
        
    # Get previous messages for context (last 10 messages for better context)
    history_objs = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.thread_id == request.thread_id
    ).order_by(ChatMessage.created_at.desc()).limit(11).all()
    history_objs.reverse()
    
    # Format history for the AI service (excluding the current user message which is passed separately)
    history = [
        {"role": msg.role, "content": msg.content} 
        for msg in history_objs[:-1]
    ]

    ai_reply = chat_service.generate_response(request.message, profile_data, history)
    
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
