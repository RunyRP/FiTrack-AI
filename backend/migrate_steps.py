import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

try:
    from app.db.session import SessionLocal
    from sqlalchemy import text
    
    db = SessionLocal()
    # Check if column exists first to avoid error if already added
    res = db.execute(text("PRAGMA table_info(user_profiles)"))
    columns = [row[1] for row in res.fetchall()]
    
    if 'target_steps' not in columns:
        print("Adding target_steps column...")
        db.execute(text("ALTER TABLE user_profiles ADD COLUMN target_steps INTEGER DEFAULT 10000"))
        db.commit()
        print("Column added successfully!")
    else:
        print("Column target_steps already exists.")
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
