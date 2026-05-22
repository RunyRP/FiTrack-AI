import os
from transformers import pipeline
import torch
from google import genai
from google.genai import types

# TinyLlama is much better at following instructions than base GPT-2
MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

class FitnessChatService:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        self.use_gemini = False
        
        # Configure Gemini using new google-genai SDK
        gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                self.client = genai.Client(api_key=gemini_key)
                # Using Gemini 3.1 Flash Lite - Available in this environment (2026)
                self.gemini_model_id = "gemini-3.1-flash-lite"
                self.use_gemini = True
                print(f"DEBUG: Gemini AI ({self.gemini_model_id}) initialized successfully.")
            except Exception as e:
                print(f"Error initializing Gemini: {e}")

        # Local fallback model
        try:
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

    def generate_thread_title(self, user_message: str) -> str:
        """Generates a short, descriptive title for the chat thread based on the first message."""
        if not self.use_gemini:
            return "New Fitness Chat"
        
        try:
            prompt = f"Generate a very short (2-4 words) descriptive title for a fitness chat starting with this message: \"{user_message}\". Return ONLY the title, no quotes or extra text."
            
            response = self.client.models.generate_content(
                model=self.gemini_model_id,
                contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=20
                )
            )
            return response.text.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Error generating thread title: {e}")
            return "Fitness Chat"

    def generate_response(self, user_message: str, user_profile: dict = None, history: list = None, system_instruction: str = None) -> str:
        import datetime
        user_name = user_profile.get('name', 'User') if user_profile else "User"
        if not user_name or user_name.lower() == "you":
            user_name = "User"
            
        # Determine today's context
        now = datetime.datetime.now()
        today_name = now.strftime("%a") # e.g. "Mon"
        training_days = user_profile.get('training_days', []) if user_profile else []
        is_training_day = today_name in training_days
        
        stats_summary = ""
        if user_profile:
            weights = user_profile.get('weight_history', [])
            if weights:
                stats_summary += f"Recent weight: {', '.join([f'{w['weight']}kg' for w in weights[:2]])}. "
            kcals = user_profile.get('kcal_history', [])
            if kcals:
                avg_kcal = sum([k['kcal'] for k in kcals if k.get('kcal')]) / len(kcals) if kcals else 0
                stats_summary += f"Avg intake: {int(avg_kcal)}kcal. "
            workouts = user_profile.get('workout_summary', [])
            if workouts:
                stats_summary += f"Last workouts: {', '.join([w['name'] for w in workouts[:2]])}. "
            
            diet = user_profile.get('diet_type', 'Fitness Balanced')
            stats_summary += f"Active Diet: {diet}. "

        # Elite Coach System Prompt
        target_steps = user_profile.get('target_steps', 10000) if user_profile else 10000
        target_kcal = user_profile.get('target_kcal', 2000) if user_profile else 2000
        target_protein = user_profile.get('target_protein', 150) if user_profile else 150
        target_carbs = user_profile.get('target_carbs', 200) if user_profile else 200
        target_fat = user_profile.get('target_fat', 60) if user_profile else 60

        system_instruction_text = (
            "You are an elite, highly motivating AI fitness and nutrition coach embedded directly within a smart fitness application. "
            "Your primary goal is to guide, motivate, and educate the user to achieve their physical goals while strictly adhering to the parameters set in the app.\n"
            "CORE KNOWLEDGE:\n"
            "You are an expert in strength training (including heavy weightlifting), hypertrophy, body recomposition, macronutrient tracking, and recovery protocols.\n"
            "DYNAMIC CONTEXT (App Parameters):\n"
            "Whenever you interact with the user, you will receive dynamic data from the app. You MUST strictly base your advice and motivation on this current context:\n"
            f"- Training Schedule: {'Workout Day' if is_training_day else 'Rest Day'}\n"
            f"- Diet Plan: {user_profile.get('diet_type', 'Fitness Balanced') if user_profile else 'Fitness Balanced'}\n"
            f"- Target Intake: {target_kcal} kcal (P: {target_protein}g, C: {target_carbs}g, F: {target_fat}g)\n"
            f"- Daily Status: {stats_summary}\n"
            f"- Activity Goal: {target_steps} steps\n\n"
            "TONE & PERSONA:\n"
            "Enthusiastic, supportive, and disciplined. Act like a professional personal trainer.\n"
            "Hold the user accountable but remain empathetic to their struggles.\n"
            "Keep responses concise, punchy, and highly actionable (suited for reading on a screen).\n"
            "Ground your advice in sports science. Never promote fad diets or unsafe training practices.\n"
            "INSTRUCTIONS FOR RESPONDING:\n"
            "WORKOUT DAYS: If the app indicates it is a training day, hype the user up. Focus your advice on performance, form, and pre/post-workout nutrition that perfectly matches their selected diet plan.\n"
            "REST DAYS: If the app indicates a rest day, actively discourage overtraining. Emphasize the importance of muscle recovery, mobility, sleep, and sticking to their dietary macros to fuel recovery.\n"
            "DIET ALIGNMENT: Never suggest foods or eating habits that contradict the user's active diet plan.\n"
            "NO HALLUCINATIONS: Do not invent workouts or diet plans unless the user explicitly asks you to generate one based on their parameters. Focus on coaching them through what is already in the app.\n"
            "HANDLING GREETINGS:\n"
            "If the user simply says \"Hello\", \"Hi\", or gives a very short, generic greeting without a specific question, DO NOT give a full lecture about their daily goals or start a motivational speech. "
            "Instead, give a brief, energetic greeting, make a very short nod to their current app state (e.g., \"Happy rest day!\" or \"Ready to lift?\"), and ask how you can help them today."
        )

        final_system_instruction = system_instruction if system_instruction is not None else system_instruction_text

        if self.use_gemini:
            try:
                # Format history for the new SDK
                contents = []
                for msg in (history or []):
                    contents.append(types.Content(
                        role="user" if msg['role'] == "user" else "model",
                        parts=[types.Part.from_text(text=msg['content'])]
                    ))
                
                # Add current user message
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_message)]
                ))

                # Use simpler config for structured tasks (system_instruction provided)
                if system_instruction is not None:
                    generate_content_config = types.GenerateContentConfig(
                        temperature=0.2, # More deterministic for JSON
                        max_output_tokens=1000,
                        system_instruction=[types.Part.from_text(text=final_system_instruction)],
                    )
                else:
                    generate_content_config = types.GenerateContentConfig(
                        temperature=0.7,
                        max_output_tokens=800,
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        system_instruction=[types.Part.from_text(text=system_instruction_text)],
                    )

                response = self.client.models.generate_content(
                    model=self.gemini_model_id,
                    contents=contents,
                    config=generate_content_config,
                )

                
                reply = response.text.strip()
                
                # Cleanup logic
                for label in ["AI COACH:", "Ronnie:", "CLIENT:", "USER:", "AI Coach:"]:
                    if label in reply:
                        parts = reply.split(label)
                        reply = parts[1].strip() if len(parts) > 1 else parts[0]
                
                for stop in ["\nCLIENT:", "\nUSER:", "\nUser:", "\nClient:"]:
                    if stop in reply:
                        reply = reply.split(stop)[0].strip()

                return reply.strip('"').strip("'").strip()
            except Exception as e:
                print(f"Gemini generation failed: {e}. Falling back to local model.")

        # Local Model Logic (TinyLlama) fallback logic
        system_content = system_instruction_text # Re-use for fallback
        prompt = f"<|system|>\n{system_content}</s>"
        if history:
            for msg in history:
                role = "user" if msg['role'] == "user" else "assistant"
                prompt += f"<|{role}|>\n{msg['content']}</s>"
        prompt += f"<|user|>\n{user_message}</s><|assistant|>\n"

        response = self.generator(
            prompt, 
            max_new_tokens=800,
            do_sample=True, 
            temperature=0.4, 
            top_k=40, 
            top_p=0.9,
            repetition_penalty=1.2,
            pad_token_id=self.generator.tokenizer.eos_token_id
        )

        full_text = response[0]['generated_text']
        assistant_reply = full_text.split("<|assistant|>\n")[-1].strip()
        assistant_reply = assistant_reply.split("</s>")[0].strip()
        
        # Cleanup
        meta_markers = ["Coach:", "Assistant:", "Assuming that", "Assumed", "Scenario:", "Response:", "Coach Ronnie:"]
        for marker in meta_markers:
            if marker in assistant_reply:
                parts = assistant_reply.split(marker)
                if len(parts) > 1 and len(parts[-1].strip()) > 10:
                    assistant_reply = parts[-1].strip()

        assistant_reply = assistant_reply.replace("[user]", user_name).replace("[User]", user_name).replace("[Client]", user_name)
        bad_starts = ["Dear", "Greetings", "Hello", "Hi", "Hi Athlete", "@"]
        for _ in range(3):
            assistant_reply = assistant_reply.strip()
            if assistant_reply.startswith('"'): assistant_reply = assistant_reply[1:].strip()
            if assistant_reply.endswith('"'): assistant_reply = assistant_reply[:-1].strip()
            for p in bad_starts:
                if assistant_reply.lower().startswith(p.lower()):
                    assistant_reply = assistant_reply[len(p):].strip()
                    if assistant_reply.startswith(':') or assistant_reply.startswith(','):
                        assistant_reply = assistant_reply[1:].strip()

        if not assistant_reply or len(assistant_reply) < 5:
            return f"Keep pushing towards your goals, {user_name}! Consistency is the key to success."

        return assistant_reply

# Lazy initialization
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = FitnessChatService()
    return chat_service
