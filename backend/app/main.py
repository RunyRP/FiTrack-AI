import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import auth, meal, user, workout, log, chat
from app.db.session import engine, Base
from app.models.user import User, UserProfile
from app.models.log import DailyLog
from app.models.machinery import Machinery
from app.models.chat import ChatMessage
from app.models.workout import WorkoutSession, WorkoutExercise

# Create database tables
# Force reload for new routes
Base.metadata.create_all(bind=engine)

# Manual migration for SQLite as create_all doesn't handle schema changes
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS custom_meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                label VARCHAR NOT NULL,
                kcal_per_100g FLOAT DEFAULT 0.0,
                protein_per_100g FLOAT DEFAULT 0.0,
                carbs_per_100g FLOAT DEFAULT 0.0,
                fat_per_100g FLOAT DEFAULT 0.0,
                fiber_per_100g FLOAT DEFAULT 0.0,
                salt_per_100g FLOAT DEFAULT 0.0,
                is_whole_meal BOOLEAN DEFAULT 0,
                default_grams FLOAT DEFAULT 100.0
            )
        """))
        conn.commit()
        
        # Add columns if table already existed (idempotent migration)
        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN is_whole_meal BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception: pass
        
        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN default_grams FLOAT DEFAULT 100.0"))
            conn.commit()
        except Exception: pass

        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN fiber_per_100g FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception: pass

        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN salt_per_100g FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception: pass

        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN ingredients JSON"))
            conn.commit()
        except Exception: pass

        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN is_quantifiable BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception: pass

        try:
            conn.execute(text("ALTER TABLE custom_meals ADD COLUMN unit_name VARCHAR"))
            conn.commit()
        except Exception: pass
        
        print("DEBUG: Ensured custom_meals table and columns exist")
    except Exception:
        pass

    try:
        conn.execute(text("ALTER TABLE machinery ADD COLUMN user_id INTEGER REFERENCES users(id)"))
        conn.commit()
        print("DEBUG: Added user_id column to machinery table")
    except Exception:
        # Column likely already exists
        pass

    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN google_refresh_token VARCHAR"))
        conn.commit()
    except Exception:
        pass

    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
        conn.commit()
        print("DEBUG: Added is_verified column to users table")
    except Exception:
        pass

    try:
        conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN split_id INTEGER REFERENCES workout_splits(id)"))
        conn.commit()
        print("DEBUG: Added split_id column to workout_sessions table")
    except Exception:
        # Column likely already exists
        pass

    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN target_steps INTEGER DEFAULT 10000"))
        conn.commit()
        print("DEBUG: Added target_steps column to user_profiles table")
    except Exception:
        # Column likely already exists
        pass

    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN macro_distribution VARCHAR DEFAULT 'balanced'"))
        conn.commit()
    except Exception: pass

    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN cut_intensity VARCHAR DEFAULT 'medium'"))
        conn.commit()
    except Exception: pass

    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN manual_target_kcal INTEGER"))
        conn.commit()
    except Exception: pass

    try:
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN thread_title VARCHAR"))
        conn.commit()
        print("DEBUG: Added thread_title column to chat_messages table")
    except Exception:
        # Column likely already exists
        pass

app = FastAPI(title="FitTrack AI")

@app.middleware("http")
async def log_origin_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        print(f"DEBUG ORIGIN: Request from {origin}")
    response = await call_next(request)
    return response

# CORS middleware to allow the frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "https://fittrack-ai-omega.vercel.app",
        "https://fittrack-ai-omega.vercel.app/",
        "https://fit-track-ai.vercel.app",
        "https://fit-track-ai.vercel.app/",
        "https://fittrack-ai.vercel.app",
        "https://fittrack-ai.vercel.app/",
        "https://unconservative-nonadjudicatively-kathlyn.ngrok-free.dev",
        "https://unconservative-nonadjudicatively-kathlyn.ngrok-free.dev/",
    ],  
    allow_origin_regex="https://.*\.vercel\.app", # Allow any Vercel subdomain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(meal.router, prefix="/meal", tags=["meal"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(workout.router, prefix="/workout", tags=["workout"])
app.include_router(log.router, prefix="/log", tags=["log"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to FitTrack AI API"}

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.1"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
