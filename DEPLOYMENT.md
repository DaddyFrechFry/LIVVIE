# LIVVIE Deployment Guide

## What Changed?

LIVVIE is now a **web application** that works on both your laptop and Android phone. The old Python desktop app has been replaced with a modern web interface that uses:

- Browser-based speech recognition and synthesis
- Supabase for cloud data storage
- Responsive design that works on any device

## Using LIVVIE

### On Your Laptop

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The app will open at http://localhost:5173

2. **Create an Account:**
   - Open the app in your browser
   - Click "Sign Up" and create an account with your email and password

3. **Start Chatting:**
   - Click the microphone button to speak
   - Or type your message and press Enter
   - LIVVIE will respond with voice and text

### On Your Android Phone

**Option 1: Access via Local Network (Same WiFi)**
1. On your laptop, note the local IP address shown when you run `npm run dev`
2. On your Android phone, open Chrome or any browser
3. Navigate to `http://YOUR_LAPTOP_IP:5173`
4. Sign in with the same account you created

**Option 2: Deploy to the Web (Recommended)**
1. Deploy the `dist` folder to any hosting service:
   - **Vercel** (easiest): Connect your GitHub repo
   - **Netlify**: Drag and drop the `dist` folder
   - **Supabase Hosting**: Use the Supabase CLI

2. Your LIVVIE app will have a permanent URL you can access from anywhere

## Features

### Voice Interaction
- **Click the microphone** to speak to LIVVIE
- She'll respond with voice synthesis (works on both desktop and mobile)
- Browser permissions required for microphone access

### Settings
- **Voice Responses**: Toggle voice on/off
- **Personality Mode**: Choose between Flirty, Friendly, or Professional
- **Voice Selection**: Pick from available browser voices

### Conversation History
- All conversations are saved to Supabase
- Sign in from any device to see your chat history
- Each conversation is private to your account

## Optional: Connect Ollama for Smarter Responses

By default, LIVVIE uses pre-written responses. For AI-powered conversations:

1. **Install Ollama on your laptop:**
   ```bash
   # Download from https://ollama.ai
   ollama pull qwen2.5:1.5b
   ```

2. **Allow Docker network access:**
   The Edge Function is configured to connect to Ollama at `http://host.docker.internal:11434`

3. **Test it:**
   LIVVIE will automatically use Ollama when available, falling back to pre-written responses if not

## Browser Compatibility

### Desktop
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

### Mobile
- Chrome Android: Full support
- Samsung Internet: Full support
- Safari iOS: Full support (requires microphone permission)

## Troubleshooting

### Microphone not working
- Grant microphone permission when prompted
- On Android: Settings > Apps > Chrome > Permissions > Microphone

### Voice not speaking
- Check Settings > Voice Responses is enabled
- Ensure device volume is turned up
- Some browsers require user interaction before allowing speech

### Can't sign in
- Check that your email and password are correct
- Password must be at least 6 characters
- Check browser console for errors

## Security

- All data is encrypted in transit
- Passwords are securely hashed by Supabase
- Row Level Security ensures users only see their own data
- No payment information required

## Architecture

```
┌─────────────────┐
│  Your Browser   │
│  (Laptop/Phone) │
└────────┬────────┘
         │
         ├─── Speech Recognition (Browser API)
         ├─── Speech Synthesis (Browser API)
         │
         ▼
┌─────────────────┐
│    Supabase     │
├─────────────────┤
│ • Auth          │
│ • Database      │
│ • Edge Function │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ollama (Optional)│
│ AI Brain        │
└─────────────────┘
```

## What Happened to the Python Files?

The original Python implementation (`main.py`, `wake_word.py`, etc.) is still in the project folder but won't work on Android. The web version provides:

- Cross-platform compatibility
- No installation required
- Cloud sync across devices
- Better mobile experience
- Easier deployment

## Next Steps

1. Run `npm run dev` to test locally
2. Create an account and try LIVVIE
3. Deploy to Vercel/Netlify for mobile access
4. Optionally install Ollama for AI responses

Enjoy chatting with LIVVIE!
