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
        user_name = "User"
        if user_profile:
            user_name = user_profile.get('name', 'User')
            obj = user_profile.get('objective', 'maintain').replace('_', ' ')
            profile_info = f"User: {user_name}, Age {user_profile.get('age')}, Weight {user_profile.get('weight')}kg, Goal: {obj}."

        # Strict, concise system prompt with no-nonsense instructions
        prompt = (
            f"<|system|>\nYou are a professional AI Fitness Coach. "
            f"You MUST address the user directly as {user_name}. "
            f"NEVER use formal greetings like 'Dear' or 'Hi Athlete'. "
            f"Never introduce yourself. Just give the coaching advice directly. "
            f"Respond in exactly 2 short sentences. {profile_info}</s>\n"
            f"<|user|>\n{user_message}</s>\n"
            f"<|assistant|>\n"
        )

        # Focus parameters
        response = self.generator(
            prompt, 
            max_new_tokens=100, 
            do_sample=True, 
            temperature=0.4, 
            top_k=40, 
            top_p=0.9,
            repetition_penalty=1.2,
            pad_token_id=self.generator.tokenizer.eos_token_id
        )

        # Clean up the response
        full_text = response[0]['generated_text']
        assistant_reply = full_text.split("<|assistant|>\n")[-1].strip()
        assistant_reply = assistant_reply.split("</s>")[0].strip()

        # Aggressive cleanup of hallucinated roles and salutations
        bad_starts = [
            f"{user_name}:", "Assistant:", "Coach:", "AI:", "Athlete:", "System:", 
            "Dear", "Greetings", "Hello", "Hi", "Hi Athlete", "@"
        ]

        # Run multiple passes to clean up nested prefixes
        for _ in range(3):
            assistant_reply = assistant_reply.strip()
            for p in bad_starts:
                if assistant_reply.lower().startswith(p.lower()):
                    # Remove the prefix and the following character if it's a colon or comma
                    assistant_reply = assistant_reply[len(p):].strip()
                    if assistant_reply.startswith(':') or assistant_reply.startswith(','):
                        assistant_reply = assistant_reply[1:].strip()

        if not assistant_reply:
            return f"{user_name}, keep pushing towards your fitness goals today!"

        return assistant_reply

# Lazy initialization
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = FitnessChatService()
    return chat_service
