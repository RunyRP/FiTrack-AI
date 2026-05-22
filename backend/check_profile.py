from app.db.session import SessionLocal
from app.models.user import User, UserProfile
from app.models.log import DailyLog
from app.models.chat import ChatMessage
from app.models.workout import WorkoutSession, WorkoutExercise

def check_user_profile():
    db = SessionLocal()
    user = db.query(User).filter(User.id == 1).first()
    if user and user.profile:
        p = user.profile
        print(f"User 1 Profile:")
        print(f"  Target Kcal: {p.target_kcal}")
        print(f"  Target Steps: {p.target_steps}")
    else:
        print("User 1 or profile not found.")
    db.close()

if __name__ == "__main__":
    check_user_profile()
