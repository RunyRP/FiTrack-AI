import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
import io
import os
from typing import List, Dict

# Advanced Calorie DB with portion types and macro profiles (per 100g)
# p: Protein, c: Carbs, f: Fat
FOOD_DB = {
    # Proteins
    "grilled chicken":     {"kcal": 165, "p": 31, "c": 0,  "f": 3.6, "default_portion": 200, "type": "volume"},
    "fried chicken":       {"kcal": 260, "p": 25, "c": 10, "f": 15,  "default_portion": 250, "type": "volume"},
    "beef steak":          {"kcal": 250, "p": 26, "c": 0,  "f": 17,  "default_portion": 250, "type": "volume"},
    "pork chop":           {"kcal": 242, "p": 27, "c": 0,  "f": 14,  "default_portion": 200, "type": "unit", "unit_weight": 200},
    "bacon":               {"kcal": 541, "p": 37, "c": 1.4,"f": 42,  "default_portion": 50,  "type": "unit", "unit_weight": 15},
    "salmon":              {"kcal": 208, "p": 20, "c": 0,  "f": 13,  "default_portion": 180, "type": "volume"},
    "shrimp":              {"kcal": 99,  "p": 24, "c": 0.2,"f": 0.3, "default_portion": 150, "type": "volume"},
    "boiled egg":          {"kcal": 155, "p": 13, "c": 1.1,"f": 11,  "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "fried egg":           {"kcal": 196, "p": 14, "c": 0.8,"f": 15,  "default_portion": 50,  "type": "unit", "unit_weight": 50},
    "tofu":                {"kcal": 76,  "p": 8,  "c": 1.9,"f": 4.8, "default_portion": 150, "type": "volume"},
    
    # Vegetables
    "broccoli":            {"kcal": 34,  "p": 2.8, "c": 7,  "f": 0.4, "default_portion": 100, "type": "volume"},
    "carrot":              {"kcal": 41,  "p": 0.9, "c": 10, "f": 0.2, "default_portion": 80,  "type": "unit", "unit_weight": 60},
    "bell pepper":         {"kcal": 31,  "p": 1,   "c": 6,  "f": 0.3, "default_portion": 80,  "type": "unit", "unit_weight": 120},
    "tomato":              {"kcal": 18,  "p": 0.9, "c": 3.9,"f": 0.2, "default_portion": 100, "type": "unit", "unit_weight": 100},
    "cucumber":            {"kcal": 16,  "p": 0.7, "c": 3.6,"f": 0.1, "default_portion": 100, "type": "unit", "unit_weight": 200},
    "spinach":             {"kcal": 23,  "p": 2.9, "c": 3.6,"f": 0.4, "default_portion": 50,  "type": "volume"},
    "lettuce":             {"kcal": 15,  "p": 1.4, "c": 2.9,"f": 0.2, "default_portion": 50,  "type": "volume"},
    "mushroom":            {"kcal": 22,  "p": 3.1, "c": 3.3,"f": 0.3, "default_portion": 80,  "type": "volume"},
    "corn":                {"kcal": 86,  "p": 3.2, "c": 19, "f": 1.2, "default_portion": 100, "type": "volume"},
    "asparagus":           {"kcal": 20,  "p": 2.2, "c": 3.9,"f": 0.1, "default_portion": 100, "type": "volume"},
    "onion":               {"kcal": 40,  "p": 1.1, "c": 9,  "f": 0.1, "default_portion": 50,  "type": "unit", "unit_weight": 110},
    "garlic":              {"kcal": 149, "p": 6.4, "c": 33, "f": 0.5, "default_portion": 10,  "type": "unit", "unit_weight": 5},
    
    # Fruits
    "apple":               {"kcal": 52,  "p": 0.3, "c": 14, "f": 0.2, "default_portion": 150, "type": "unit", "unit_weight": 180},
    "banana":              {"kcal": 89,  "p": 1.1, "c": 23, "f": 0.3, "default_portion": 120, "type": "unit", "unit_weight": 120},
    "orange":              {"kcal": 47,  "p": 0.9, "c": 12, "f": 0.1, "default_portion": 130, "type": "unit", "unit_weight": 130},
    "strawberry":          {"kcal": 32,  "p": 0.7, "c": 7.7,"f": 0.3, "default_portion": 100, "type": "volume"},
    "blueberry":           {"kcal": 57,  "p": 0.7, "c": 14, "f": 0.3, "default_portion": 100, "type": "volume"},
    "grapes":              {"kcal": 67,  "p": 0.6, "c": 18, "f": 0.4, "default_portion": 100, "type": "volume"},
    "watermelon":          {"kcal": 30,  "p": 0.6, "c": 7.6,"f": 0.2, "default_portion": 200, "type": "volume"},
    "avocado":             {"kcal": 160, "p": 2,   "c": 8.5,"f": 15,  "default_portion": 100, "type": "unit", "unit_weight": 200},
    
    # Carbs & Grains
    "white rice":          {"kcal": 130, "p": 2.7, "c": 28, "f": 0.3, "default_portion": 150, "type": "volume"},
    "brown rice":          {"kcal": 112, "p": 2.6, "c": 23, "f": 0.9, "default_portion": 150, "type": "volume"},
    "pasta":               {"kcal": 158, "p": 5.8, "c": 31, "f": 0.9, "default_portion": 200, "type": "volume"},
    "french fries":        {"kcal": 312, "p": 3.4, "c": 41, "f": 15,  "default_portion": 150, "type": "volume"},
    "mashed potatoes":     {"kcal": 113, "p": 2,   "c": 15, "f": 4.2, "default_portion": 200, "type": "volume"},
    "roast potatoes":      {"kcal": 149, "p": 2.5, "c": 30, "f": 4.5, "default_portion": 200, "type": "volume"},
    "bread":               {"kcal": 265, "p": 9,   "c": 49, "f": 3.2, "default_portion": 60,  "type": "unit", "unit_weight": 30},
    "oatmeal":             {"kcal": 68,  "p": 2.4, "c": 12, "f": 1.4, "default_portion": 200, "type": "volume"},
    "quinoa":              {"kcal": 120, "p": 4.4, "c": 21, "f": 1.9, "default_portion": 150, "type": "volume"},
    
    # Dishes & Fast Food
    "pizza":               {"kcal": 266, "p": 11,  "c": 33, "f": 10,  "default_portion": 300, "type": "unit", "unit_weight": 150},
    "hamburger":           {"kcal": 295, "p": 17,  "c": 24, "f": 14,  "default_portion": 250, "type": "unit", "unit_weight": 250},
    "sushi":               {"kcal": 150, "p": 5,   "c": 28, "f": 1,   "default_portion": 200, "type": "unit", "unit_weight": 30},
    "tacos":               {"kcal": 218, "p": 10,  "c": 20, "f": 12,  "default_portion": 200, "type": "unit", "unit_weight": 70},
    "burrito":             {"kcal": 206, "p": 10,  "c": 25, "f": 8,   "default_portion": 350, "type": "unit", "unit_weight": 350},
    "spaghetti bolognese": {"kcal": 150, "p": 7,   "c": 18, "f": 6,   "default_portion": 300, "type": "volume"},
    "caesar salad":        {"kcal": 100, "p": 5,   "c": 8,  "f": 6,   "default_portion": 200, "type": "volume"},
    "lasagna":             {"kcal": 135, "p": 7,   "c": 15, "f": 5,   "default_portion": 300, "type": "volume"},
    
    # Snacks & Desserts
    "yogurt":              {"kcal": 59,  "p": 10,  "c": 3.6,"f": 0.4, "default_portion": 150, "type": "volume"},
    "cheese":              {"kcal": 402, "p": 25,  "c": 1.3,"f": 33,  "default_portion": 30,  "type": "volume"},
    "chocolate":           {"kcal": 546, "p": 4.9, "c": 61, "f": 31,  "default_portion": 40,  "type": "unit", "unit_weight": 10},
    "almonds":             {"kcal": 579, "p": 21,  "c": 22, "f": 50,  "default_portion": 30,  "type": "volume"},
    "peanut butter":       {"kcal": 588, "p": 25,  "c": 20, "f": 50,  "default_portion": 32,  "type": "volume"},
    "cookie":              {"kcal": 502, "p": 4.8, "c": 68, "f": 25,  "default_portion": 50,  "type": "unit", "unit_weight": 25},
    "ice cream":           {"kcal": 207, "p": 3.5, "c": 24, "f": 11,  "default_portion": 100, "type": "volume"},
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
        
        # Portion size prompts for better estimation
        portion_labels = ["a small portion", "a normal portion", "a large portion", "a giant portion"]
        
        all_labels = food_labels + negative_labels + portion_labels
        texts = [f"a photo of {lbl}" for lbl in all_labels]

        inputs = self.processor(text=texts, images=image, return_tensors="pt", padding=True).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=-1)[0].cpu().tolist()

        # Extract probabilities for different categories
        food_probs = probs[:len(food_labels)]
        neg_probs = probs[len(food_labels):len(food_labels)+len(negative_labels)]
        size_probs = probs[len(food_labels)+len(negative_labels):]

        # 1. Rejection Logic
        max_neg_prob = max(neg_probs)
        if max_neg_prob > 0.25:
            return []

        # 2. Size Multiplier
        size_multipliers = [0.7, 1.0, 1.3, 1.6]
        max_size_idx = size_probs.index(max(size_probs))
        base_size_multiplier = size_multipliers[max_size_idx]

        results = []
        for i, prob in enumerate(food_probs):
            label = food_labels[i]

            if prob > 0.08:
                db_entry = FOOD_DB[label]
                est_multiplier = base_size_multiplier
                if prob > 0.40:
                    est_multiplier *= 1.1

                est_grams = int(db_entry["default_portion"] * est_multiplier)
                
                # Calculate Macros
                results.append({
                    "label": label,
                    "confidence": prob,
                    "grams": est_grams,
                    "kcal": int(est_grams * db_entry["kcal"] / 100),
                    "protein": round(est_grams * db_entry["p"] / 100, 1),
                    "carbs": round(est_grams * db_entry["c"] / 100, 1),
                    "fat": round(est_grams * db_entry["f"] / 100, 1),
                    "base_kcal": db_entry["kcal"],
                    "portion_note": portion_labels[max_size_idx].replace("a ", "")
                })

        sorted_results = sorted(results, key=lambda x: x["confidence"], reverse=True)
        return sorted_results[:5] if sorted_results and sorted_results[0]["confidence"] > 0.12 else []

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
                "protein": round(data["default_portion"] * data["p"] / 100, 1),
                "carbs": round(data["default_portion"] * data["c"] / 100, 1),
                "fat": round(data["default_portion"] * data["f"] / 100, 1),
                "base_kcal": data["kcal"]
            })
    return results
