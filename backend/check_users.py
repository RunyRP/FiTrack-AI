import sys
import os

sys.path.append(os.getcwd())

try:
    from app.db.session import SessionLocal
    # Import all models to avoid relationship resolution errors
    from app.models.user import User, UserProfile
    from app.models.log import DailyLog
    from app.models.workout import WorkoutSession, WorkoutSplit, WorkoutSchedule
    from app.models.chat import ChatMessage
    
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Total users: {len(users)}")
    for u in users:
        profile_info = f"Profile exists: {u.profile is not None}"
        if u.profile:
            profile_info += f", target_steps: {getattr(u.profile, 'target_steps', 'MISSING')}"
        print(f"ID: {u.id}, Email: {u.email}, Verified: {u.is_verified}, {profile_info}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
