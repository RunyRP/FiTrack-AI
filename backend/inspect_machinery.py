from app.db.session import SessionLocal
from app.models.machinery import Machinery

db = SessionLocal()
machines = db.query(Machinery).all()
for m in machines:
    print(f"ID: {m.id}, Name: {m.name}, Image: {m.image_url}")
db.close()
