from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.machinery import Machinery

def seed_machinery():
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Machinery).first():
        print("Machinery already seeded")
        db.close()
        return

    default_machinery = [
        {
            "name": "Chest Press Machine",
            "description": "Targets the pectoral muscles, triceps, and anterior deltoids.",
            "exercises": [
                {"name": "Seated Chest Press", "muscles": ["Pectorals", "Triceps", "Shoulders"]}
            ]
        },
        {
            "name": "Leg Extension Machine",
            "description": "Isolates the quadriceps muscles on the front of the thigh.",
            "exercises": [
                {"name": "Leg Extension", "muscles": ["Quadriceps"]}
            ]
        },
        {
            "name": "Lat Pulldown Machine",
            "description": "Targets the latissimus dorsi, biceps, and rear deltoids.",
            "exercises": [
                {"name": "Lat Pulldown", "muscles": ["Back", "Biceps"]}
            ]
        },
        {
            "name": "Leg Press Machine",
            "description": "Compound exercise targeting quadriceps, glutes, and hamstrings.",
            "exercises": [
                {"name": "Leg Press", "muscles": ["Quadriceps", "Glutes", "Hamstrings"]}
            ]
        },
        {
            "name": "Cable Machine",
            "description": "Versatile machine for various exercises.",
            "exercises": [
                {"name": "Cable Flyes", "muscles": ["Pectorals"]},
                {"name": "Tricep Pushdowns", "muscles": ["Triceps"]},
                {"name": "Bicep Curls", "muscles": ["Biceps"]}
            ]
        }
    ]

    for machine_data in default_machinery:
        machine = Machinery(**machine_data)
        db.add(machine)
    
    db.commit()
    db.close()
    print("Machinery seeded successfully")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_machinery()
