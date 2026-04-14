from transformers import pipeline
import torch

class FitnessChatService:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        # Using a small, fast model for CPU/Basic GPU
        self.generator = pipeline('text-generation', model='gpt2', device=self.device)

    def generate_response(self, user_message: str, user_profile: dict = None) -> str:
        # Construct a context-aware prompt
        profile_str = ""
        if user_profile:
            profile_str = f"The user is {user_profile.get('age')} years old, weighs {user_profile.get('weight')}kg, and their goal is to {user_profile.get('objective').replace('_', ' ')}."

        prompt = f"System: You are a professional fitness and nutrition assistant. Give concise, helpful advice.\n{profile_str}\nUser: {user_message}\nAssistant:"

        # Generate
        response = self.generator(prompt, max_new_tokens=100, num_return_sequences=1, truncation=True)
        
        # Clean up the response
        full_text = response[0]['generated_text']
        assistant_reply = full_text.split("Assistant:")[-1].strip()
        
        # If it's too short or contains system tags, we might need more cleanup
        if not assistant_reply:
            return "I'm here to help with your fitness journey! Could you tell me more about what you're looking for?"
            
        return assistant_reply

# Lazy initialization
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = FitnessChatService()
    return chat_service
