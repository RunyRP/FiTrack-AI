from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, meal, user, workout, log
from app.db.session import engine, Base
from app.models.user import User, UserProfile
from app.models.log import DailyLog
from app.models.machinery import Machinery

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FitTrack AI")

# CORS middleware to allow the frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(meal.router, prefix="/meal", tags=["meal"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(workout.router, prefix="/workout", tags=["workout"])
app.include_router(log.router, prefix="/log", tags=["log"])

@app.get("/")
def read_root():
    return {"message": "Welcome to FitTrack AI API"}
