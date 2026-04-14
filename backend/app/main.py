import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, meal, user, workout, log, chat
from app.db.session import engine, Base
from app.models.user import User, UserProfile
from app.models.log import DailyLog
from app.models.machinery import Machinery
from app.models.chat import ChatMessage

# Create database tables
Base.metadata.create_all(bind=engine)

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
        "https://fitrack-ai-omega.vercel.app",
        "https://fitrack-ai-omega.vercel.app/",
        "https://fit-track-ai.vercel.app",
        "https://fittrack-ai.vercel.app",
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

@app.get("/")
def read_root():
    return {"message": "Welcome to FitTrack AI API"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
