import os
import requests
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import engine
from dotenv import load_dotenv

load_dotenv()

# Import all models to ensure registry is populated
from app.models.user import User, UserProfile
from app.models.log import DailyLog
from app.models.chat import ChatMessage
from app.models.workout import WorkoutSession, WorkoutExercise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Hardcoded for the user ronniepavoni@gmail.com
email = "ronniepavoni@gmail.com"
user = db.query(User).filter(User.email == email).first()

if not user:
    print(f"User {email} not found")
    exit()

if not user.google_refresh_token:
    print(f"User {email} has no refresh token")
    exit()

print(f"DEBUG: Using refresh token: {user.google_refresh_token[:20]}...")

# 1. Refresh token
url = "https://oauth2.googleapis.com/token"
data = {
    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
    "refresh_token": user.google_refresh_token,
    "grant_type": "refresh_token"
}

r = requests.post(url, data=data)
if r.status_code != 200:
    print(f"ERROR: Failed to refresh token: {r.status_code} - {r.text}")
    exit()

access_token = r.json().get("access_token")
print("DEBUG: Successfully refreshed access token")

# 2. Sync steps
now = datetime.datetime.now()
start = datetime.datetime(now.year, now.month, now.day)
end = start + datetime.timedelta(days=1)

print(f"DEBUG: Querying between {start} and {end}")

fit_url = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

def query_fit(aggregate_by):
    body = {
        "aggregateBy": aggregate_by,
        "bucketByTime": {"durationMillis": 86400000},
        "startTimeMillis": int(start.timestamp()*1000),
        "endTimeMillis": int(end.timestamp()*1000)
    }
    res = requests.post(fit_url, json=body, headers={"Authorization": f"Bearer {access_token}"})
    return res

body = {
    "aggregateBy": [
        {"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
        {"dataTypeName": "com.google.weight"}
    ],
    "bucketByTime": {"durationMillis": 86400000},
    "startTimeMillis": int(start.timestamp()*1000),
    "endTimeMillis": int(end.timestamp()*1000)
}

print(f"DEBUG: Syncing Google Fit for {user.email} between {start} and {end}")
res = requests.post(fit_url, json=body, headers={"Authorization": f"Bearer {access_token}"})

if res.status_code == 200:
    d = res.json(); steps = 0; weight = None
    for b in d.get("bucket", []):
        for ds in b.get("dataset", []):
            for p in ds.get("point", []):
                for v in p.get("value", []):
                    if "step_count" in ds.get("dataSourceId", ""): 
                        val = v.get("intVal", 0)
                        steps += val
                    else: 
                        weight = v.get("fpVal")
    
    print(f"RESULT: Steps: {steps}, Weight: {weight}")
else:
    print(f"ERROR: Google Fit API error: {res.status_code} - {res.text}")

db.close()

