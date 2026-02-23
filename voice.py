import edge_tts
import pygame
import asyncio
import os

# Create a playful voice: slightly higher pitch (+10%) and a bit faster
VOICE = "en-US-AvaMultilingualNeural" 

async def _generate_and_play(text):
    # Generate speech using edge_tts
    communicate = edge_tts.Communicate(text=text, voice=VOICE, rate="+10%", pitch="+10Hz")
    
    # Save to temporary file
    temp_file = "temp_speech.mp3"
    await communicate.save(temp_file)
    
    # Play using pygame
    pygame.mixer.init()
    pygame.mixer.music.load(temp_file)
    pygame.mixer.music.play()
    
    # Wait for playback to finish
    while pygame.mixer.music.get_busy():
        await asyncio.sleep(0.1)
    
    # Clean up
    os.remove(temp_file)

async def speak(text):
    await _generate_and_play(text)