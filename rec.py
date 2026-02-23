import sounddevice as sd, numpy as np
fs=16000
print("Recording 3s...")
rec = sd.rec(int(3*fs), samplerate=fs, channels=1, dtype='int16')
sd.wait()
print("Recording done — playing back")
sd.play(rec, fs); sd.wait()
print("Playback finished")