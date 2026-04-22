from transformers import pipeline
import torch

# TinyLlama is much better at following instructions than base GPT-2
MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

class FitnessChatService:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        try:
            # Using TinyLlama Chat which is optimized for conversation
            self.generator = pipeline(
                "text-generation", 
                model=MODEL_ID, 
                torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                device=self.device if not torch.cuda.is_available() else None
            )
        except Exception as e:
            print(f"Error loading TinyLlama: {e}. Falling back to GPT-2.")
            self.generator = pipeline('text-generation', model='gpt2', device=self.device)

    def generate_response(self, user_message: str, user_profile: dict = None) -> str:
        # Construct a context-aware prompt using TinyLlama's chat format
        profile_info = ""
        if user_profile:
            obj = user_profile.get('objective', 'maintain').replace('_', ' ')
            profile_info = f"User Profile: Age {user_profile.get('age')}, Weight {user_profile.get('weight')}kg, Goal: {obj}."

        # TinyLlama Chat template: <|system|>\n{system_message}</s>\n<|user|>\n{user_message}</s>\n<|assistant|>\n
        prompt = (
            f"<|system|>\nYou are a professional, motivating fitness and nutrition coach. "
            f"Provide scientific, concise, and actionable advice. {profile_info}</s>\n"
            f"<|user|>\n{user_message}</s>\n"
            f"<|assistant|>\n"
        )

        # Generate with better parameters for variety and coherence
        response = self.generator(
            prompt, 
            max_new_tokens=150, 
            do_sample=True, 
            temperature=0.7, 
            top_k=50, 
            top_p=0.95,
            repetition_penalty=1.2,
            pad_token_id=self.generator.tokenizer.eos_token_id
        )
        
        # Clean up the response
        full_text = response[0]['generated_text']
        if "<|assistant|>\n" in full_text:
            assistant_reply = full_text.split("<|assistant|>\n")[-1].strip()
        else:
            assistant_reply = full_text.replace(prompt, "").strip()
            
        # Stop at the end of the first assistant turn if it generates extra
        assistant_reply = assistant_reply.split("</s>")[0].strip()
        
        if not assistant_reply:
            return "I'm here to support your fitness goals! What specific questions do you have today?"
            
        return assistant_reply

# Lazy initialization
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = FitnessChatService()
    return chat_service
