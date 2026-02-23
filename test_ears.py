import pyaudio
import numpy as np
from openwakeword.model import Model

# 1. Initialize the model using ONNX (bypasses TFLite error)
custom_model_path = "LIVVIE.onnx"
oww_model = Model(
    wakeword_models=[custom_model_path], 
    inference_framework="onnx"  # Forces the use of ONNX
)

# 2. Audio settings (Standard for OpenWakeWord)
CHUNK = 1280
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000

# 3. Setup Microphone
audio = pyaudio.PyAudio()
mic_stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, 
                        input=True, frames_per_buffer=CHUNK)

print(f"LIVVIE is listening for '{custom_model_path}'...")

# 4. Main Loop
try:
    while True:
        # Get audio from mic
        audio_data = np.frombuffer(mic_stream.read(CHUNK), dtype=np.int16)
        
        # Feed to model
        prediction = oww_model.predict(audio_data)
        
        # Check scores (0.0 to 1.0)
        for model_name, score in prediction.items():
            if score > 0.5:
                print(f"Detected {model_name} with confidence {score:.2f}!")
except KeyboardInterrupt:
    print("Stopping...")
finally:
    mic_stream.stop_stream()
    mic_stream.close()
    audio.terminate()