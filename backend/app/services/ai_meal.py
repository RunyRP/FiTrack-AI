import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
import io
import os
from typing import List, Dict

# Calorie DB from food_calorie_analyzer.py
FOOD_DB = {
    "grilled chicken":     {"kcal": 165, "density": 1.0, "portion": 200},
    "fried chicken":       {"kcal": 260, "density": 1.1, "portion": 250},
    "beef steak":          {"kcal": 250, "density": 1.1, "portion": 250},
    "pork chop":           {"kcal": 242, "density": 1.0, "portion": 200},
    "bacon":               {"kcal": 541, "density": 0.6, "portion": 50},
    "salmon":              {"kcal": 208, "density": 1.0, "portion": 180},
    "shrimp":              {"kcal": 99,  "density": 0.9, "portion": 150},
    "boiled egg":          {"kcal": 155, "density": 1.0, "portion": 50},
    "fried egg":           {"kcal": 196, "density": 1.0, "portion": 50},
    "tofu":                {"kcal": 76,  "density": 1.0, "portion": 150},
    "broccoli":            {"kcal": 34,  "density": 0.4, "portion": 100},
    "carrot":              {"kcal": 41,  "density": 0.6, "portion": 80},
    "bell pepper":         {"kcal": 31,  "density": 0.4, "portion": 80},
    "tomato":              {"kcal": 18,  "density": 0.5, "portion": 100},
    "cucumber":            {"kcal": 16,  "density": 0.5, "portion": 100},
    "spinach":             {"kcal": 23,  "density": 0.2, "portion": 50},
    "lettuce":             {"kcal": 15,  "density": 0.1, "portion": 50},
    "mushroom":            {"kcal": 22,  "density": 0.3, "portion": 80},
    "corn":                {"kcal": 86,  "density": 0.7, "portion": 100},
    "avocado":             {"kcal": 160, "density": 0.9, "portion": 100},
    "white rice":          {"kcal": 130, "density": 0.8, "portion": 150},
    "brown rice":          {"kcal": 112, "density": 0.8, "portion": 150},
    "pasta":               {"kcal": 158, "density": 0.7, "portion": 200},
    "french fries":        {"kcal": 312, "density": 0.5, "portion": 150},
    "mashed potatoes":     {"kcal": 113, "density": 1.0, "portion": 200},
    "roast potatoes":      {"kcal": 149, "density": 0.9, "portion": 200},
    "bread":               {"kcal": 265, "density": 0.4, "portion": 60},
    "pizza":               {"kcal": 266, "density": 0.6, "portion": 300},
    "hamburger":           {"kcal": 295, "density": 0.8, "portion": 250},
    "sushi":               {"kcal": 150, "density": 0.9, "portion": 200},
    "tacos":               {"kcal": 218, "density": 0.7, "portion": 200},
}

MODEL_ID = "openai/clip-vit-base-patch32"

class AIMealService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = CLIPProcessor.from_pretrained(MODEL_ID)
        self.model = CLIPModel.from_pretrained(MODEL_ID).to(self.device)
        self.model.eval()

    def analyze_image(self, image_bytes: bytes) -> List[Dict]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        labels = list(FOOD_DB.keys())
        texts = [f"a photo of {lbl}" for lbl in labels]
        
        inputs = self.processor(text=texts, images=image, return_tensors="pt", padding=True).to(self.device)
        
        with torch.no_grad():
            logits = self.model(**inputs).logits_per_image
            probs = logits.softmax(dim=-1)[0].cpu().tolist()

        results = []
        for i, prob in enumerate(probs):
            if prob > 0.05:  # Confidence threshold
                lbl = labels[i]
                db_entry = FOOD_DB[lbl]
                # Simplified portion estimation for MVP
                est_grams = db_entry["portion"]
                est_kcal = int(est_grams * db_entry["kcal"] / 100)
                results.append({
                    "label": lbl,
                    "confidence": prob,
                    "grams": est_grams,
                    "kcal": est_kcal
                })
        
        return sorted(results, key=lambda x: x["confidence"], reverse=True)

# Lazy initialization
ai_service = None

def get_ai_service():
    global ai_service
    if ai_service is None:
        ai_service = AIMealService()
    return ai_service
