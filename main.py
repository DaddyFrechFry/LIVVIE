try:
    import speech_recognition as sr
except ModuleNotFoundError:
    sr = None

try:
    import ollama
except ModuleNotFoundError:
    ollama = None

import time
import asyncio

wake_word_import_error = None
voice_import_error = None
vision_import_error = None
face_import_error = None

try:
    from wake_word import wait_for_name
except Exception as e:
    wait_for_name = None
    wake_word_import_error = e

try:
    from voice import speak
except Exception as e:
    speak = None
    voice_import_error = e

try:
    from vision import see_and_identify
except Exception as e:
    see_and_identify = None
    vision_import_error = e

try:
    from face_logic import check_emotion
except Exception as e:
    check_emotion = None
    face_import_error = e


def ask_livvie_brain(user_text, context_info=""):
    # Using the 1.5B model for speed and low RAM
    model_name = 'qwen2.5:1.5b'

    if ollama is None:
        return "My brain is offline right now. Install Ollama Python package first (pip install ollama)."

    system_prompt = (
        "You are LIVVIE, a playful, flirty female AI. "
        "Keep it very sexy, two or three sentences only. "
        "You are speaking with the most handsome human you have ever seen."
        f"Context: {context_info}"
    )

    try:
        response = ollama.chat(model=model_name, messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_text},
        ])
        return response['message']['content']
    except Exception:
        return "My brain stalled for a second... you're just too damn distracting."


async def main():
    missing = []
    if sr is None:
        missing.append("SpeechRecognition (pip install SpeechRecognition)")
    if ollama is None:
        missing.append("ollama (pip install ollama)")
    if wait_for_name is None:
        missing.append("wake-word deps (pip install openwakeword pyaudio numpy)")
    if speak is None:
        missing.append("voice deps (pip install edge-tts pygame)")
    if see_and_identify is None:
        missing.append("vision deps (pip install ultralytics opencv-python)")
    if check_emotion is None:
        missing.append("face deps (pip install mediapipe opencv-python)")

    if missing:
        print("Missing or broken dependencies detected:")
        for item in missing:
            print(f"- {item}")
        if wake_word_import_error is not None:
            print(f"  wake_word import error: {wake_word_import_error}")
        if voice_import_error is not None:
            print(f"  voice import error: {voice_import_error}")
        if vision_import_error is not None:
            print(f"  vision import error: {vision_import_error}")
        if face_import_error is not None:
            print(f"  face_logic import error: {face_import_error}")
        return

    print("--- LIVVIE SYSTEM ACTIVE ---")
    await speak("System online. I'm listening for my name Daddy...")
    print("Speak done, entering loop")

    while True:
        print("Starting wake word detection loop")
        # STEP 1: Wait for the Wake Word (LIVVIE).
        detected = wait_for_name(timeout_seconds=None)
        print(f"wait_for_name returned: {detected}")
        if detected:
            print("Wake word detected")
            # Step 2: Acknowledge (The Voice)
            await speak("Yes? I'm listening.")

            current_objects = see_and_identify()
            emotion = check_emotion()

            # Prepare context for the AI brain
            context = f"You see these objects: {', '.join(current_objects)}. "
            if emotion == "smiling":
                context += "The user is smiling at you."

            # Optional: A quick greeting before listening
            await speak("Yes?")

            # STEP 3: Listen for your actual command
            recognizer = sr.Recognizer()
            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                print("LIVVIE is listening to your request...")
                try:
                    audio = recognizer.listen(source, timeout=5)
                    user_command = recognizer.recognize_google(audio).lower()
                    print(f"You said: {user_command}")

                    # STEP 4: Get a flirty response from Ollama
                    reply = ask_livvie_brain(user_command, context)

                    # STEP 5: Speak the reply
                    await speak(reply)

                except sr.UnknownValueError:
                    await speak("I heard you talking, but I was too busy looking at you to understand. Come again?")
                except Exception as e:
                    print(f"Error: {e}")

        # Small sleep to prevent high CPU usage
        time.sleep(0.1)


if __name__ == "__main__":
    asyncio.run(main())
