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
        user_name = "Athlete"
        if user_profile:
            user_name = user_profile.get('name', 'Athlete')
            obj = user_profile.get('objective', 'maintain').replace('_', ' ')
            profile_info = f"UserAge: {user_profile.get('age')}, UserWeight: {user_profile.get('weight')}kg, Goal: {obj}."

        # Strict, concise system prompt
        prompt = (
            f"<|system|>\nYou are a professional AI Fitness Coach. "
            f"Address the user directly as {user_name}. "
            f"Provide objective, scientific advice on workouts and nutrition. "
            f"NEVER provide medical diagnoses or health predictions. "
            f"Keep responses under 3 sentences. {profile_info}</s>\n"
            f"<|user|>\n{user_message}</s>\n"
            f"<|assistant|>\n"
        )

        # Lower temperature for more focused, less 'creative' responses
        response = self.generator(
            prompt, 
            max_new_tokens=150, 
            do_sample=True, 
            temperature=0.5, 
            top_k=40, 
            top_p=0.9,
            repetition_penalty=1.2,
            pad_token_id=self.generator.tokenizer.eos_token_id
        )

        # Clean up the response
        full_text = response[0]['generated_text']
        assistant_reply = full_text.split("<|assistant|>\n")[-1].strip()
        assistant_reply = assistant_reply.split("</s>")[0].strip()

        # Strip any self-addressing or role prefixes
        prefixes = [f"{user_name}:", "Assistant:", "Coach:", "AI:", "Athlete:", "System:"]
        for p in prefixes:
            if assistant_reply.upper().startswith(p.upper()):
                assistant_reply = assistant_reply[len(p):].strip()

        if not assistant_reply:
            return f"I'm here to help you reach your goals, {user_name}. What's on your mind?"

        return assistant_reply


# Lazy initialization
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = FitnessChatService()
    return chat_service
