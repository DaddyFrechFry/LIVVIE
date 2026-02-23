import os
import time
import openwakeword
import openwakeword.model
import pyaudio
import numpy as np

# Initialize with candidate model paths (check multiple possible files)
custom_model_candidates = ["LIVVIE.onnx", "LIVVIE.tflite"]

# Select existing models from the candidates
existing = [p for p in custom_model_candidates if os.path.exists(p)]
if not existing:
    print(f"Warning: no custom wakeword models found at {custom_model_candidates}. Using package defaults.")
    oww_model = openwakeword.model.Model(inference_framework="onnx")
else:
    # Prefer ONNX models when available; otherwise use TFLite
    onnx_models = [p for p in existing if p.lower().endswith('.onnx')]
    tflite_models = [p for p in existing if p.lower().endswith('.tflite')]
    if onnx_models:
        print(f"Using ONNX wakeword models: {onnx_models}")
        oww_model = openwakeword.model.Model(wakeword_models=onnx_models, inference_framework="onnx")
    elif tflite_models:
        print(f"Using TFLite wakeword models: {tflite_models}")
        oww_model = openwakeword.model.Model(wakeword_models=tflite_models, inference_framework="tflite")
    else:
        # No supported extensions found; fall back to package defaults
        print(f"No supported model extensions found in {existing}; using package defaults.")
        oww_model = openwakeword.model.Model(inference_framework="onnx")


def wait_for_name(timeout_seconds=None, threshold=0.01):
    """Listen for the wake word. Returns True when detected, False on timeout.

    - timeout_seconds: If set, stop listening after that many seconds and return False.
    - threshold: detection threshold for your model (default 0.5).
    """
    CHUNK = 1280
    RATE = 16000
    audio = pyaudio.PyAudio()

    try:
        stream = audio.open(format=pyaudio.paInt16, channels=1, rate=RATE, input=True, frames_per_buffer=CHUNK)
    except Exception as e:
        print(f"Failed to open microphone stream: {e}")
        audio.terminate()
        return False

    start_time = time.time()
    try:
        while True:
            if timeout_seconds and (time.time() - start_time) > timeout_seconds:
                # Timeout reached
                print("wait_for_name: timeout reached, returning False")
                return False

            try:
                raw = stream.read(CHUNK, exception_on_overflow=False)
            except Exception as e:
                print(f"Audio read error: {e}")
                continue

            data = np.frombuffer(raw, dtype=np.int16)
            try:
                prediction = oww_model.predict(data)
            except Exception as e:
                print(f"Model prediction error: {e}")
                continue

            # Debug: print top prediction value occasionally
            if isinstance(prediction, dict):
                # find highest score
                best = max(prediction.items(), key=lambda kv: kv[1])
                print(f"wakeword prediction: {best[0]}={best[1]:.3f}")
                if best[1] > threshold:
                    print("Wake word detected (threshold passed)")
                    return True
            else:
                # Some models return a sequence; print a summary
                print(f"wakeword prediction (non-dict): {prediction}")
    finally:
        try:
            stream.stop_stream()
            stream.close()
        except Exception:
            pass
        audio.terminate()


if __name__ == "__main__":
    print("Testing wake word detection...")
    result = wait_for_name(timeout_seconds=10)  # Test for 10 seconds
    if result:
        print("Wake word detected!")
    else:
        print("No wake word detected within timeout.")