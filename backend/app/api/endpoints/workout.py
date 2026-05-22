from fastapi import APIRouter, Depends, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.machinery import Machinery
from app.core.auth import get_current_user
from app.models.user import User
from typing import List, Optional
import os
import uuid
import shutil
import json
import re

from app.models.workout import WorkoutSession, WorkoutExercise, WorkoutSplit, WorkoutSchedule
from app.schemas.workout import (
    WorkoutSessionCreate, WorkoutSession as WorkoutSessionSchema, 
    ExerciseProgression, WorkoutSplitCreate, WorkoutSplit as WorkoutSplitSchema,
    WorkoutScheduleCreate, WorkoutSchedule as WorkoutScheduleSchema,
    PredictionRequest, PlateauRequest, SessionHistory
)
from typing import List, Dict
import datetime
from app.services.ai_chat import get_chat_service

router = APIRouter()

@router.post("/analyze-plateau")
async def analyze_plateau(
    request: PlateauRequest,
    current_user: User = Depends(get_current_user)
):
    # Se abbiamo meno di 3 sessioni, non abbiamo dati sufficienti per definire un "plateau"
    if len(request.history) < 3:
         return {"success": True, "analysis": {"is_plateau": False, "suggested_phase": "Maintain", "reasoning": "Dati insufficienti per valutare un plateau."}}

    # Formattiamo le ultime 4 sessioni in testo
    history_text = ""
    for idx, session in enumerate(request.history[-4:]):
        history_text += f"Date: {session.date} | {session.sets} sets of {session.reps} reps @ {session.weight_kg}kg | RPE: {session.rpe}\n"

    # Il Prompt Diagnostico (Il tuo "Controllore")
    prompt = f"""
    You are an expert Sports Scientist acting as the controller in a closed-loop fitness system.
    Analyze the recent training history for the exercise: {request.exercise_name}.
    
    RECENT HISTORY:
    {history_text}

    DIAGNOSTIC RULES:
    1. Define a 'Plateau': 3 or more consecutive sessions where weight AND reps DO NOT increase, AND the RPE is very high (9 or 10).
    2. If a Plateau IS detected: You MUST trigger a 'Deload' phase. Calculate a Deload Weight: take the Last_Weight and reduce it by 20% (Last_Weight * 0.8).
    3. If NO Plateau is detected (user is progressing, or RPE is low/fluctuating normally): The phase remains 'Progression'.

    TASK: You MUST show your step-by-step logic in the 'diagnostic_scratchpad' field.
    Respond EXCLUSIVELY with a valid JSON object using this exact structure:
    {{
      "diagnostic_scratchpad": "Look at the last 3 sessions. Did the weight increase? No. Did the reps increase? No. Is RPE >= 9? Yes. Therefore, Plateau = True. Deload weight = X * 0.8 = Y kg.",
      "is_plateau": true_or_false,
      "suggested_phase": "Deload" or "Progression",
      "recommended_deload_weight_kg": 0.0,
      "reasoning": "Scientific explanation of why we are deloading (CNS recovery) or continuing to push."
    }}
    """
    
    try:
        chat_service = get_chat_service()
        ai_response = chat_service.generate_response(
            user_message=prompt,
            user_profile={"name": current_user.email}, # Minimal profile
            system_instruction="You are a data-driven fitness analyst. Respond only with valid JSON."
        )
        
        # Extract JSON from potential markdown markers
        start_idx = ai_response.find('{')
        end_idx = ai_response.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_text = ai_response[start_idx:end_idx+1]
        else:
            clean_text = ai_response.strip()
            
        analysis_data = json.loads(clean_text)
        return {"success": True, "analysis": analysis_data}
    except Exception as e:
        print(f"Plateau Analysis Error: {e}")
        return {"success": False, "error": str(e)}

@router.get("/machinery")
def get_all_machinery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Return global machinery and user's custom machinery
    return db.query(Machinery).filter(
        or_(Machinery.user_id == None, Machinery.user_id == current_user.id)
    ).all()

@router.post("/machinery")
async def create_custom_machinery(
    name: str = Form(...),
    muscle_group: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check for duplicate name
    existing = db.query(Machinery).filter(
        Machinery.user_id == current_user.id,
        Machinery.name == name.strip()
    ).first()
    if existing:
        return {"status": "error", "message": f"A machine with the name '{name}' already exists."}, 400

    # Save the file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join("app", "static", "machinery", filename)
    
    # Ensure directory exists (should exist but just in case)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    image_url = f"/static/machinery/{filename}"
    
    # Create the machinery
    # For custom machinery, we simplify: the machinery name is the exercise name
    new_machine = Machinery(
        user_id=current_user.id,
        name=name.strip(),
        image_url=image_url,
        exercises=[{"name": name.strip(), "muscles": [muscle_group]}]
    )
    
    db.add(new_machine)
    db.commit()
    db.refresh(new_machine)
    
    return new_machine

@router.put("/machinery/{machine_id}")
async def update_custom_machinery(
    machine_id: int,
    name: Optional[str] = Form(None),
    muscle_group: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    import json

    machine = db.query(Machinery).filter(
        Machinery.id == machine_id,
        Machinery.user_id == current_user.id
    ).first()
    
    if not machine:
        return {"status": "error", "message": "Machine not found"}, 404
    
    try:
        new_name = name.strip() if name else machine.name
        
        # Check for duplicate name if name is being changed
        if name and new_name != machine.name:
            existing = db.query(Machinery).filter(
                Machinery.user_id == current_user.id,
                Machinery.name == new_name,
                Machinery.id != machine_id
            ).first()
            if existing:
                return {"status": "error", "message": f"A machine with the name '{new_name}' already exists."}, 400

        # Build new exercises JSON
        current_muscles = machine.exercises[0]["muscles"] if machine.exercises else ["Other"]
        new_muscles = [muscle_group] if muscle_group else current_muscles
        new_exercises_json = json.dumps([{"name": new_name, "muscles": new_muscles}])
        
        # Use a raw SQL update to bypass any SQLAlchemy session/detection issues
        db.execute(
            text("UPDATE machinery SET name = :name, exercises = :exercises WHERE id = :id"),
            {"name": new_name, "exercises": new_exercises_json, "id": machine_id}
        )
        
        if file and file.filename:
            file_ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{file_ext}"
            file_path = os.path.join("app", "static", "machinery", filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            image_url = f"/static/machinery/{filename}"
            db.execute(
                text("UPDATE machinery SET image_url = :url WHERE id = :id"),
                {"url": image_url, "id": machine_id}
            )
        
        db.commit()
        
        # Fetch fresh object
        machine = db.query(Machinery).get(machine_id)
        return machine
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}, 500

@router.delete("/machinery/{machine_id}")
def delete_custom_machinery(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    machine = db.query(Machinery).filter(
        Machinery.id == machine_id,
        Machinery.user_id == current_user.id
    ).first()
    
    if not machine:
        return {"status": "error", "message": "Machine not found or access denied"}, 404
    
    db.delete(machine)
    db.commit()
    return {"status": "ok"}

# --- Splits CRUD ---

@router.post("/splits", response_model=WorkoutSplitSchema)
def create_split(
    split_data: WorkoutSplitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    split = WorkoutSplit(
        user_id=current_user.id,
        name=split_data.name,
        exercises=[ex.dict() for ex in split_data.exercises]
    )
    db.add(split)
    db.commit()
    db.refresh(split)
    return split

@router.get("/splits", response_model=List[WorkoutSplitSchema])
def get_splits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WorkoutSplit).filter(WorkoutSplit.user_id == current_user.id).all()

@router.delete("/splits/{split_id}")
def delete_split(
    split_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    split = db.query(WorkoutSplit).filter(
        WorkoutSplit.id == split_id,
        WorkoutSplit.user_id == current_user.id
    ).first()
    if split:
        db.delete(split)
        db.commit()
    return {"status": "ok"}

# --- Schedule CRUD ---

@router.get("/schedule", response_model=WorkoutScheduleSchema)
def get_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        schedule = WorkoutSchedule(user_id=current_user.id)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
    return schedule

@router.post("/schedule", response_model=WorkoutScheduleSchema)
def update_schedule(
    schedule_data: WorkoutScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        schedule = WorkoutSchedule(user_id=current_user.id)
        db.add(schedule)
    
    schedule.split_mode = schedule_data.split_mode
    schedule.gym_days = schedule_data.gym_days
    schedule.fixed_schedule = schedule_data.fixed_schedule
    schedule.split_sequence = schedule_data.split_sequence
    
    db.commit()
    db.refresh(schedule)
    return schedule

# --- Session & Next Workout ---

@router.post("/session", response_model=WorkoutSessionSchema)
def log_workout_session(
    workout_data: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create the session
    session = WorkoutSession(
        user_id=current_user.id,
        name=workout_data.name,
        notes=workout_data.notes,
        split_id=workout_data.split_id,
        date=datetime.datetime.utcnow()
    )
    db.add(session)
    db.flush() # Get session ID

    # Create the exercises and sets
    for ex_data in workout_data.exercises:
        exercise = WorkoutExercise(
            session_id=session.id,
            exercise_name=ex_data.exercise_name,
            machine_id=ex_data.machine_id,
            sets=[set_data.dict() for set_data in ex_data.sets]
        )
        db.add(exercise)
    
    db.commit()
    db.refresh(session)
    return session

@router.get("/next")
def get_next_workout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        return {"message": "No schedule configured"}

    today = datetime.datetime.utcnow().weekday() # 0-6 (Mon-Sun)
    
    # Check if today is a gym day
    is_gym_day = today in schedule.gym_days
    
    suggested_split = None
    
    if schedule.split_mode == "fixed":
        split_id = schedule.fixed_schedule.get(str(today))
        if split_id:
            suggested_split = db.query(WorkoutSplit).get(split_id)
    else: # dynamic
        if is_gym_day:
            # Find the last workout session to see what split was done
            last_session = db.query(WorkoutSession).filter(
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.split_id != None
            ).order_by(WorkoutSession.date.desc()).first()
            
            if last_session and schedule.split_sequence:
                try:
                    last_idx = schedule.split_sequence.index(last_session.split_id)
                    next_idx = (last_idx + 1) % len(schedule.split_sequence)
                    next_split_id = schedule.split_sequence[next_idx]
                    suggested_split = db.query(WorkoutSplit).get(next_split_id)
                except ValueError:
                    # Last split not in sequence, start from first
                    suggested_split = db.query(WorkoutSplit).get(schedule.split_sequence[0])
            elif schedule.split_sequence:
                suggested_split = db.query(WorkoutSplit).get(schedule.split_sequence[0])

    if not suggested_split:
        return {"is_gym_day": is_gym_day, "message": "No split suggested for today"}

    # Fetch last performance for each exercise in this split
    exercises_with_history = []
    for ex in suggested_split.exercises:
        # Find last time this exercise was performed in a session with this split_id
        last_ex = db.query(WorkoutExercise).join(WorkoutSession).filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.split_id == suggested_split.id,
            WorkoutExercise.exercise_name == ex["name"]
        ).order_by(WorkoutSession.date.desc()).first()
        
        sets = last_ex.sets if last_ex else [{"reps": ex["target_reps"], "weight": 0}]
        
        exercises_with_history.append({
            "exercise_name": ex["name"],
            "machine_id": ex["machine_id"],
            "target_sets": ex["target_sets"],
            "target_reps": ex["target_reps"],
            "last_sets": sets
        })

    return {
        "is_gym_day": is_gym_day,
        "split_id": suggested_split.id,
        "split_name": suggested_split.name,
        "exercises": exercises_with_history
    }

@router.get("/ai-suggest")
def get_ai_workout_suggestion(
    muscle_group: str = Query(..., description="Target muscle group (e.g., Chest, Back, Total Body)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get user's available equipment
    machine_ids = current_user.profile.selected_machinery if current_user.profile else []
    if not machine_ids:
        return {"status": "error", "message": "Please configure your gym equipment in the Setup section first."}
    
    machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    equipment_list = [m.name for m in machines]
    
    if not equipment_list:
        return {"status": "error", "message": "No equipment found. Please update your gym setup."}

    # 2. Build the AI prompt
    system_instruction = "You are an expert Personal Trainer specializing in absolute beginners."
    
    # Get user profile data for adaptation
    gender = current_user.profile.gender if current_user.profile else "Not specified"
    height = current_user.profile.height if current_user.profile else "Not specified"
    weight = current_user.profile.weight if current_user.profile else "Not specified"
    
    prompt = f"""Your task is to create a simple, safe, and effective {muscle_group} workout using EXCLUSIVELY the equipment provided in this list:
[{', '.join(equipment_list)}]

USER PROFILE:
- Gender: {gender}
- Height: {height} cm
- Weight: {weight} kg

RULES:
1. Select a maximum of 4 exercises. Do not invent or suggest equipment that is not on the list.
2. The absolute focus must be on safety, injury prevention, and proper form.
3. ADAPTATION: You MUST adapt the exercise selection, volume (sets and reps), and safety warnings to the user's specific physical profile. For example, if the weight indicates potential obesity or heavy joint load, strictly avoid high-impact movements and prioritize seated or supported machines.
4. Output the workout EXCLUSIVELY as a valid JSON array, using this exact structure and nothing else (no markdown, no conversational text):

[
  {{
    "exercise_name": "Name of the exercise",
    "equipment_used": "Name of the equipment from the list",
    "sets_and_reps": "e.g., 3x10 (adapted to the user's profile)",
    "basic_instructions": "Step-by-step on how to perform the movement",
    "safety_warning": "Highly specific safety warning tailored to the user's gender, weight, and height"
  }}
]"""

    # 3. Call AI Service
    from app.services.ai_chat import get_chat_service
    chat_service = get_chat_service()
    
    # Use a custom system instruction to ensure JSON-only output
    ai_response = chat_service.generate_response(prompt, {}, system_instruction=system_instruction)
    
    # 4. Parse and return
    try:
        # Robust JSON extraction: Find the outermost [ and ]
        start_idx = ai_response.find('[')
        end_idx = ai_response.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned_response = ai_response[start_idx:end_idx+1]
        else:
            # Fallback to current cleaning
            cleaned_response = ai_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
        
        workout_array = json.loads(cleaned_response)
        
        if not isinstance(workout_array, list):
            raise ValueError("AI response is not a JSON array")

        # Match back to machine_ids for the frontend to easily link
        for ex in workout_array:
            # Normalize keys to be safe (AI sometimes hallucinates slightly different keys)
            equipment_key = "equipment_used"
            if "equipment" in ex: equipment_key = "equipment"
            if "machine" in ex: equipment_key = "machine"
            
            equipment_name = ex.get(equipment_key, "").lower().strip()
            
            # Lenient matching: check if equipment_name is in machine name or vice-versa
            matched_machine = None
            for m in machines:
                m_name = m.name.lower().strip()
                if equipment_name == m_name or equipment_name in m_name or m_name in equipment_name:
                    matched_machine = m
                    break
            
            if matched_machine:
                ex["machine_id"] = matched_machine.id
                ex["image_url"] = matched_machine.image_url
                ex["equipment_used"] = matched_machine.name # Standardize back
            else:
                ex["machine_id"] = None
                ex["image_url"] = None

        return {
            "muscle_group": muscle_group,
            "workout": workout_array
        }
    except Exception as e:
        print(f"AI Workout Parsing Error: {str(e)}")
        print(f"Raw AI Output: {ai_response}")
        return {"status": "error", "message": "Failed to generate a valid workout. Please try again.", "raw": ai_response}

@router.delete("/session/{session_id}")
def delete_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    if session:
        db.delete(session)
        db.commit()
        return {"status": "ok"}
    return {"status": "error", "message": "Session not found"}, 404

@router.get("/history", response_model=List[WorkoutSessionSchema])
def get_workout_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id
    ).order_by(WorkoutSession.date.desc()).limit(limit).all()

@router.get("/progression/{exercise_name}", response_model=List[ExerciseProgression])
def get_exercise_progression(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all sessions for this user that included this exercise
    exercises = db.query(WorkoutExercise).join(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutExercise.exercise_name == exercise_name
    ).order_by(WorkoutSession.date.asc()).all()
    
    progression = []
    for ex in exercises:
        if not ex.sets: continue
        
        max_weight = max([s["weight"] for s in ex.sets])
        avg_reps = sum([s["reps"] for s in ex.sets]) / len(ex.sets)
        total_volume = sum([s["weight"] * s["reps"] for s in ex.sets])
        
        progression.append({
            "date": ex.session.date,
            "max_weight": float(max_weight),
            "avg_reps": float(avg_reps),
            "total_volume": float(total_volume)
        })
        
    return progression

@router.post("/predict-next-load")
async def predict_next_load(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user)
):
    # 1. Format history for the AI
    history_text = ""
    for idx, session in enumerate(request.history):
        history_text += f"Session {idx + 1} ({session.date}): {session.sets} sets of {session.reps} reps @ {session.weight_kg}kg, RPE: {session.rpe}\n"

    # 2. Analytical Prompt
    prompt = f"""
    You are an elite Sports Data Scientist.
    Analyze the recent training history for the exercise: {request.exercise_name}.
    
    TRAINING HISTORY:
    {history_text}

    LOGIC FOR PROGRESSIVE OVERLOAD:
    - Identify the exact weight used in the VERY LAST session (Last_Weight).
    - PLATEAU CHECK: If the last 3 sessions have the SAME weight and reps, AND RPE was >= 9: This is a PLATEAU. Trigger a DELOAD. New_Weight = Last_Weight * 0.8.
    - If NO plateau, but RPE dropped (< 8): Increase load. New_Weight = Last_Weight + 2.5. Apply to all sets.
    - If NO plateau, but RPE is stable (8-8.5): Top Set approach. Set 1 = Last_Weight + 2.5. Back-off sets = Last_Weight.
    - If RPE is 9-10 (but not yet a plateau): Maintain. All sets = Last_Weight.

    TASK: You MUST show your calculation process in the 'math_scratchpad' field BEFORE outputting the sets.
    Respond EXCLUSIVELY with a valid JSON object using this exact structure:
    {{
      "math_scratchpad": "The last weight was X kg. The RPE was Y. Therefore, X + 2.5 = Z kg.",
      "recommended_sets": [
        {{"set_number": 1, "target_reps": 8, "weight_kg": 0.0}},
        {{"set_number": 2, "target_reps": 8, "weight_kg": 0.0}}
      ],
      "reasoning": "Scientific reasoning here."
    }}
    """
    
    # 3. Call AI Service
    from app.services.ai_chat import get_chat_service
    chat_service = get_chat_service()
    
    # Use low temperature for logical reasoning
    ai_response = chat_service.generate_response(prompt, {}, system_instruction="You are a data-driven powerlifting coach. Respond ONLY with valid JSON.")
    
    try:
        # Robust JSON extraction
        start_idx = ai_response.find('{')
        end_idx = ai_response.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_text = ai_response[start_idx:end_idx+1]
        else:
            clean_text = ai_response.strip()
            
        prediction_data = json.loads(clean_text)
        return {"success": True, "prediction": prediction_data}
    except Exception as e:
        print(f"AI Prediction Parsing Error: {str(e)}")
        print(f"Raw AI Output: {ai_response}")
        return {"success": False, "error": "Failed to parse AI prediction", "raw": ai_response}

@router.get("/suggest")
def suggest_workouts(
    machine_ids: List[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If no IDs provided, use the ones from the user profile
    if not machine_ids and current_user.profile and current_user.profile.selected_machinery:
        machine_ids = current_user.profile.selected_machinery
    
    if not machine_ids:
        return {"objective": "N/A", "parameters": {}, "suggestions": [], "message": "Please configure your gym equipment in the Setup section."}

    # Fetch machines matching the provided IDs
    machines = []
    if machine_ids:
        machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    
    # Get user objective
    objective = current_user.profile.objective if current_user.profile else "maintain"
    
    goal_params = {
        "lose_weight": {"reps": "12-15", "sets": "3-4", "rest": "60s", "focus": "Calorie burn & endurance"},
        "gain_muscle": {"reps": "8-12", "sets": "4-5", "rest": "90s", "focus": "Hypertrophy & strength"},
        "body_recomposition": {"reps": "10-12", "sets": "4", "rest": "75s", "focus": "Fat loss & muscle growth"},
        "maintain": {"reps": "10-12", "sets": "3", "rest": "60s", "focus": "General fitness & tone"}
    }
    
    params = goal_params.get(objective, goal_params["maintain"])
    
    suggestions = []
    
    # If no machines selected, add default bodyweight exercises
    if not machines:
        bodyweight_exercises = [
            {"exercise_name": "Push-ups", "muscles": ["Chest", "Triceps", "Shoulders"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Bodyweight Squats", "muscles": ["Quads", "Glutes"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Plank", "muscles": ["Core"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1566241142559-40e1bfc26ddc?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Lunges", "muscles": ["Quads", "Hamstrings"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop"}
        ]
        for ex in bodyweight_exercises:
            suggestions.append({
                "machine_id": None,
                "machine_name": ex["machine_name"],
                "machine_image": ex["image_url"],
                "exercise_name": ex["exercise_name"],
                "muscles": ex["muscles"],
                "reps": params["reps"],
                "sets": params["sets"],
                "rest": params["rest"],
                "focus": params["focus"]
            })
    else:
        for machine in machines:
            for exercise in machine.exercises:
                suggestions.append({
                    "machine_id": machine.id,
                    "machine_name": machine.name,
                    "machine_image": machine.image_url,
                    "exercise_name": exercise["name"],
                    "muscles": exercise["muscles"],
                    "reps": params["reps"],
                    "sets": params["sets"],
                    "rest": params["rest"],
                    "focus": params["focus"]
                })
            
    return {
        "objective": objective,
        "parameters": params,
        "suggestions": suggestions
    }
