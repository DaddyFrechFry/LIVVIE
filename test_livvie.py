# Save this as test_livvie.py and run it
try:
    import openwakeword
    print("✅ Ears (openwakeword) - READY")
except: print("❌ Ears (openwakeword) - MISSING")

try:
    import edge_tts
    print("✅ Voice (edge-tts) - READY")
except: print("❌ Voice (edge-tts) - MISSING")
