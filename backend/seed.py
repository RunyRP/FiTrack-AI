from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def seed_machinery():
    db = SessionLocal()
    
    # Base URL for static assets - using absolute URL for local dev
    IMG_BASE = "http://localhost:8000/static/machinery/"
    
    # Full Technogym Catalog based on provided images
    machinery_data = [
        # ARTIS / SELECTION LINE (Standard Gym)
        {
            "name": "Technogym Artis Chest Press",
            "description": "Ergonomic chest training from the Artis line.",
            "image_url": f"{IMG_BASE}chest_press.jpg",
            "exercises": [{"name": "Machine Chest Press", "muscles": ["Chest", "Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Artis Leg Extension",
            "description": "Premium isolation for the quadriceps.",
            "image_url": f"{IMG_BASE}leg_extension.jpg",
            "exercises": [{"name": "Leg Extension", "muscles": ["Quads"]}]
        },
        {
            "name": "Technogym Artis Leg Curl",
            "description": "Premium isolation for the hamstrings.",
            "image_url": f"{IMG_BASE}leg_curl.jpg",
            "exercises": [{"name": "Seated Leg Curl", "muscles": ["Hamstrings"]}]
        },
        {
            "name": "Technogym Artis Leg Press",
            "description": "Standard leg press for lower body training.",
            "image_url": f"{IMG_BASE}leg_press.jpg",
            "exercises": [{"name": "Leg Press", "muscles": ["Quads", "Glutes"]}]
        },
        {
            "name": "Technogym Artis Shoulder Press",
            "description": "Overhead press for deltoid development.",
            "image_url": f"{IMG_BASE}shoulder_press.jpg",
            "exercises": [{"name": "Machine Shoulder Press", "muscles": ["Shoulders", "Triceps"]}]
        },
        {
            "name": "Technogym Artis Lat Pulldown",
            "description": "Vertical pulling for lat development.",
            "image_url": f"{IMG_BASE}lat_pulldown.jpg",
            "exercises": [{"name": "Lat Pulldown", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Technogym Artis Low Row",
            "description": "Horizontal pulling for back thickness.",
            "image_url": f"{IMG_BASE}low_row.jpg",
            "exercises": [{"name": "Machine Row", "muscles": ["Back", "Biceps"]}]
        },
        {
            "name": "Technogym Artis Pectoral",
            "description": "Fly machine for chest isolation.",
            "image_url": f"{IMG_BASE}pectoral.jpg",
            "exercises": [{"name": "Pectoral Fly", "muscles": ["Chest"]}]
        },
        {
            "name": "Technogym Artis Abdominal",
            "description": "Targeted core training.",
            "image_url": f"{IMG_BASE}abdominal.jpg",
            "exercises": [{"name": "Abdominal Crunch", "muscles": ["Core"]}]
        },
        {
            "name": "Technogym Artis Lower Back",
            "description": "Lower back strengthening.",
            "image_url": f"{IMG_BASE}lower_back.jpg",
            "exercises": [{"name": "Back Extension", "muscles": ["Lower Back"]}]
        },
        {
            "name": "Technogym Artis Arm Curl",
            "description": "Bicep isolation.",
            "image_url": f"{IMG_BASE}arm_curl.jpg",
            "exercises": [{"name": "Bicep Curl", "muscles": ["Biceps"]}]
        },
        {
            "name": "Technogym Artis Arm Extension",
            "description": "Tricep isolation.",
            "image_url": f"{IMG_BASE}arm_ext.jpg",
            "exercises": [{"name": "Tricep Extension", "muscles": ["Triceps"]}]
        },
        {
            "name": "Technogym Artis Abductor",
            "description": "Outer thigh and glute isolation.",
            "image_url": f"{IMG_BASE}abductor.jpg",
            "exercises": [{"name": "Hip Abduction", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Artis Adductor",
            "description": "Inner thigh isolation.",
            "image_url": f"{IMG_BASE}adductor.jpg",
            "exercises": [{"name": "Hip Adduction", "muscles": ["Legs"]}]
        },
        
        # PURE STRENGTH LINE (Plate Loaded)
        {
            "name": "Technogym Pure Wide Chest Press",
            "description": "Plate-loaded chest press for heavy training.",
            "image_url": f"{IMG_BASE}pure_wide_chest.jpg",
            "exercises": [{"name": "Pure Chest Press", "muscles": ["Chest"]}]
        },
        {
            "name": "Technogym Pure Incline Chest Press",
            "description": "Targeted upper chest development.",
            "image_url": f"{IMG_BASE}pure_incline_chest.jpg",
            "exercises": [{"name": "Incline Pure Press", "muscles": ["Chest"]}]
        },
        {
            "name": "Technogym Pure Pulldown",
            "description": "Heavy lat training.",
            "image_url": f"{IMG_BASE}pure_pulldown.jpg",
            "exercises": [{"name": "Pure Pulldown", "muscles": ["Back"]}]
        },
        {
            "name": "Technogym Pure Row",
            "description": "Plate-loaded rowing machine.",
            "image_url": f"{IMG_BASE}pure_row.jpg",
            "exercises": [{"name": "Pure Row", "muscles": ["Back"]}]
        },
        {
            "name": "Technogym Pure Shoulder Press",
            "description": "Heavy shoulder isolation.",
            "image_url": f"{IMG_BASE}pure_shoulder_press.jpg",
            "exercises": [{"name": "Pure Shoulder Press", "muscles": ["Shoulders"]}]
        },
        {
            "name": "Technogym Pure Leg Press",
            "description": "Massive plate-loaded leg press.",
            "image_url": f"{IMG_BASE}pure_leg_press.jpg",
            "exercises": [{"name": "Pure Leg Press", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Bicep",
            "description": "Focused plate-loaded bicep curl.",
            "image_url": f"{IMG_BASE}pure_bicep.jpg",
            "exercises": [{"name": "Pure Bicep Curl", "muscles": ["Biceps"]}]
        },
        {
            "name": "Technogym Pure Leg Extension",
            "description": "Plate-loaded quad isolation.",
            "image_url": f"{IMG_BASE}pure_leg_extension.jpg",
            "exercises": [{"name": "Pure Leg Extension", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Standing Leg Curl",
            "description": "Unilateral plate-loaded hamstring curl.",
            "image_url": f"{IMG_BASE}pure_leg_curl.jpg",
            "exercises": [{"name": "Pure Standing Leg Curl", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Hack Squat",
            "description": "Ultimate quad development machine.",
            "image_url": f"{IMG_BASE}pure_hack_squat.jpg",
            "exercises": [{"name": "Pure Hack Squat", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Hip Thrust",
            "description": "The gold standard for glute development.",
            "image_url": f"{IMG_BASE}pure_hip_thrust.jpg",
            "exercises": [{"name": "Pure Hip Thrust", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Pullover",
            "description": "Classic movement for lat and chest expansion.",
            "image_url": f"{IMG_BASE}pure_pullover.jpg",
            "exercises": [{"name": "Pure Pullover", "muscles": ["Back", "Chest"]}]
        },
        {
            "name": "Technogym Pure Standing Abductor",
            "description": "Plate-loaded glute medius training.",
            "image_url": f"{IMG_BASE}pure_standing_abductor.jpg",
            "exercises": [{"name": "Pure Standing Abductor", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Belt Squat",
            "description": "Heavy squats without spinal loading.",
            "image_url": f"{IMG_BASE}pure_belt_squat.jpg",
            "exercises": [{"name": "Pure Belt Squat", "muscles": ["Legs"]}]
        },
        {
            "name": "Technogym Pure Deadlift",
            "description": "Safe plate-loaded deadlift pattern.",
            "image_url": f"{IMG_BASE}pure_deadlift.jpg",
            "exercises": [{"name": "Pure Deadlift", "muscles": ["Legs", "Back"]}]
        },
        {
            "name": "Technogym T-Bar Row",
            "description": "Classic back builder.",
            "image_url": f"{IMG_BASE}t_bar_row.jpg",
            "exercises": [{"name": "T-Bar Row", "muscles": ["Back"]}]
        }
    ]

    # Clean delete old machinery to avoid duplicates
    db.query(Machinery).delete()
    db.commit()

    for m_data in machinery_data:
        machine = Machinery(**m_data)
        db.add(machine)
    
    db.commit()
    db.close()
    print(f"Successfully seeded {len(machinery_data)} Technogym machines with actual images.")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_machinery()
