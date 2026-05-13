from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.log import DailyLog
from app.models.user import User

def update_coach_message():
    db = SessionLocal()
    try:
        # Find user Ronnie
        user = db.query(User).filter(User.email == 'ronnie@example.com').first()
        if not user:
            # Try to find by name if email doesn't match
            from app.models.user import Profile
            profile = db.query(Profile).filter(Profile.name == 'Ronnie').first()
            if profile:
                user = db.query(User).filter(User.id == profile.user_id).first()
        
        if user:
            print(f"Found user: {user.email}")
            # Find the latest log or the one with the specific message
            logs = db.query(DailyLog).filter(DailyLog.user_id == user.id).all()
            for log in logs:
                if log.ai_summary and "Coach John" in log.ai_summary:
                    print(f"Updating log for date: {log.date}")
                    log.ai_summary = "Remember that every calorie you consume is one less calorie your body can burn off during exercise. Increase your water intake by at least 50% to help keep your body hydrated throughout your workout."
            db.commit()
            print("Update complete.")
        else:
            print("User Ronnie not found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_coach_message()
