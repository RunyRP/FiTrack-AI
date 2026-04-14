import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
import io
import os
from typing import List, Dict

# Advanced Calorie DB with portion types
# kcal is always per 100g
FOOD_DB = {
    # Proteins
    "grilled chicken":     {"kcal": 165, "default_portion": 200, "type": "volume"},
    "fried chicken":       {"kcal": 260, "default_portion": 250, "type": "volume"},
    "beef steak":          {"kcal": 250, "default_portion": 250, "type": "volume"},
    "pork chop":           {"kcal": 242, "default_portion": 200, "type": "unit", "unit_weight": 200},
    "bacon":               {"kcal": 541, "default_portion": 50,  "type": "unit", "unit_weight": 15},
    "salmon":              {"kcal": 208, "default_portion": 180, "type": "volume"},
    "shrimp":              {"kcal": 99,  "default_portion": 150, "type": "volume"},
    "boiled egg":          {"kcal": 155, "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "fried egg":           {"kcal": 196, "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "tofu":                {"kcal": 76,  "default_portion": 150, "type": "volume"},
    
    # Vegetables
    "broccoli":            {"kcal": 34,  "default_portion": 100, "type": "volume"},
    "carrot":              {"kcal": 41,  "default_portion": 80,  "type": "unit", "unit_weight": 60},
    "bell pepper":         {"kcal": 31,  "default_portion": 80,  "type": "unit", "unit_weight": 120},
    "tomato":              {"kcal": 18,  "default_portion": 100, "type": "unit", "unit_weight": 100},
    "cucumber":            {"kcal": 16,  "default_portion": 100, "type": "unit", "unit_weight": 200},
    "spinach":             {"kcal": 23,  "default_portion": 50,  "type": "volume"},
    "lettuce":             {"kcal": 15,  "default_portion": 50,  "type": "volume"},
    "mushroom":            {"kcal": 22,  "default_portion": 80,  "type": "volume"},
    "corn":                {"kcal": 86,  "default_portion": 100, "type": "volume"},
    "asparagus":           {"kcal": 20,  "default_portion": 100, "type": "volume"},
    "onion":               {"kcal": 40,  "default_portion": 50,  "type": "unit", "unit_weight": 110},
    "garlic":              {"kcal": 149, "default_portion": 10,  "type": "unit", "unit_weight": 5},
    
    # Fruits
    "apple":               {"kcal": 52,  "default_portion": 150, "type": "unit", "unit_weight": 180},
    "banana":              {"kcal": 89,  "default_portion": 120, "type": "unit", "unit_weight": 120},
    "orange":              {"kcal": 47,  "default_portion": 130, "type": "unit", "unit_weight": 130},
    "strawberry":          {"kcal": 32,  "default_portion": 100, "type": "volume"},
    "blueberry":           {"kcal": 57,  "default_portion": 100, "type": "volume"},
    "grapes":              {"kcal": 67,  "default_portion": 100, "type": "volume"},
    "watermelon":          {"kcal": 30,  "default_portion": 200, "type": "volume"},
    "avocado":             {"kcal": 160, "default_portion": 100, "type": "unit", "unit_weight": 200},
    
    # Carbs & Grains
    "white rice":          {"kcal": 130, "default_portion": 150, "type": "volume"},
    "brown rice":          {"kcal": 112, "default_portion": 150, "type": "volume"},
    "pasta":               {"kcal": 158, "default_portion": 200, "type": "volume"},
    "french fries":        {"kcal": 312, "default_portion": 150, "type": "volume"},
    "mashed potatoes":     {"kcal": 113, "default_portion": 200, "type": "volume"},
    "roast potatoes":      {"kcal": 149, "default_portion": 200, "type": "volume"},
    "bread":               {"kcal": 265, "default_portion": 60,  "type": "unit", "unit_weight": 30},
    "oatmeal":             {"kcal": 68,  "default_portion": 200, "type": "volume"},
    "quinoa":              {"kcal": 120, "default_portion": 150, "type": "volume"},
    
    # Dishes & Fast Food
    "pizza":               {"kcal": 266, "default_portion": 300, "type": "unit", "unit_weight": 150},
    "hamburger":           {"kcal": 295, "default_portion": 250, "type": "unit", "unit_weight": 250},
    "sushi":               {"kcal": 150, "default_portion": 200, "type": "unit", "unit_weight": 30},
    "tacos":               {"kcal": 218, "default_portion": 200, "type": "unit", "unit_weight": 70},
    "burrito":             {"kcal": 206, "default_portion": 350, "type": "unit", "unit_weight": 350},
    "spaghetti bolognese": {"kcal": 150, "default_portion": 300, "type": "volume"},
    "caesar salad":        {"kcal": 100, "default_portion": 200, "type": "volume"},
    "lasagna":             {"kcal": 135, "default_portion": 300, "type": "volume"},
    
    # Snacks & Desserts
    "yogurt":              {"kcal": 59,  "default_portion": 150, "type": "volume"},
    "cheese":              {"kcal": 402, "default_portion": 30,  "type": "volume"},
    "chocolate":           {"kcal": 546, "default_portion": 40,  "type": "unit", "unit_weight": 10},
    "almonds":             {"kcal": 579, "default_portion": 30,  "type": "volume"},
    "peanut butter":       {"kcal": 588, "default_portion": 32,  "type": "volume"},
    "cookie":              {"kcal": 502, "default_portion": 50,  "type": "unit", "unit_weight": 25},
    "ice cream":           {"kcal": 207, "default_portion": 100, "type": "volume"},
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
        food_labels = list(FOOD_DB.keys())

        # Negative prompts to filter non-food
        negative_labels = ["a person", "a room", "electronics", "an animal", "furniture", "clothing", "building"]
        all_labels = food_labels + negative_labels

        texts = [f"a photo of {lbl}" for lbl in all_labels]

        inputs = self.processor(text=texts, images=image, return_tensors="pt", padding=True).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=-1)[0].cpu().tolist()

        results = []
        for i, prob in enumerate(probs):
            label = all_labels[i]

            # Rejection logic
            if label in negative_labels and prob > 0.20:
                return []

            if label in food_labels and prob > 0.10:
                db_entry = FOOD_DB[label]
                
                # Portion Logic:
                # We can refine this further by analyzing image brightness/coverage
                # but for now, we use a smarter default based on type.
                est_grams = db_entry["default_portion"]
                
                # Heuristic: If confidence is very high, maybe it's a larger portion?
                # This is a placeholder for real volume estimation.
                if prob > 0.50 and db_entry["type"] == "volume":
                    est_grams = int(est_grams * 1.2)
                
                est_kcal = int(est_grams * db_entry["kcal"] / 100)

                results.append({
                    "label": label,
                    "confidence": prob,
                    "grams": est_grams,
                    "kcal": est_kcal,
                    "base_kcal": db_entry["kcal"]
                })

        sorted_results = sorted(results, key=lambda x: x["confidence"], reverse=True)

        if not sorted_results or sorted_results[0]["confidence"] < 0.15:
            return []

        return sorted_results[:5]

# Lazy initialization
ai_service = None

def get_ai_service():
    global ai_service
    if ai_service is None:
        ai_service = AIMealService()
    return ai_service

def search_food(query: str) -> List[Dict]:
    query = query.lower()
    results = []
    for label, data in FOOD_DB.items():
        if query in label:
            results.append({
                "label": label,
                "grams": data["default_portion"],
                "kcal": int(data["default_portion"] * data["kcal"] / 100),
                "base_kcal": data["kcal"]
            })
    return results
