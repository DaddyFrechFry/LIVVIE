import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let currentConversationId = null;
let currentUser = null;
let recognition = null;
let synthesis = window.speechSynthesis;
let selectedVoice = null;
let isSpeaking = false;

const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const messagesContainer = document.getElementById('messages-container');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const settingsModal = document.getElementById('settings-modal');
const authError = document.getElementById('auth-error');

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            textInput.value = transcript;
            micBtn.classList.remove('listening');
        };

        recognition.onerror = () => {
            micBtn.classList.remove('listening');
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
        };
    }
}

function loadVoices() {
    const voices = synthesis.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    voiceSelect.innerHTML = '';

    const femaleVoices = voices.filter(v =>
        v.name.includes('Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Ava') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira') ||
        v.name.includes('Tessa')
    );

    const voicesToShow = femaleVoices.length > 0 ? femaleVoices : voices.filter(v => v.lang.startsWith('en'));

    voicesToShow.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });

    selectedVoice = voicesToShow[0];
}

async function speak(text) {
    const prefs = await getUserPreferences();
    if (!prefs?.voice_enabled) return;

    return new Promise((resolve) => {
        if (isSpeaking) {
            synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;
        utterance.rate = 1.1;
        utterance.pitch = 1.2;

        utterance.onstart = () => {
            isSpeaking = true;
            const lastMessage = messagesContainer.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('assistant')) {
                lastMessage.classList.add('speaking');
            }
        };

        utterance.onend = () => {
            isSpeaking = false;
            const lastMessage = messagesContainer.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('assistant')) {
                lastMessage.classList.remove('speaking');
            }
            resolve();
        };

        synthesis.speak(utterance);
    });
}

function showError(message) {
    authError.textContent = message;
    authError.classList.add('show');
    setTimeout(() => authError.classList.remove('show'), 5000);
}

async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        showError(error.message);
        return false;
    }

    await supabase.from('user_preferences').insert({
        user_id: data.user.id,
        voice_enabled: true,
        personality_mode: 'flirty'
    });

    return true;
}

async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        showError(error.message);
        return false;
    }
    return true;
}

async function signOut() {
    await supabase.auth.signOut();
    showAuthScreen();
}

async function getUserPreferences() {
    const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (!data) {
        const { data: newPrefs } = await supabase
            .from('user_preferences')
            .insert({
                user_id: currentUser.id,
                voice_enabled: true,
                personality_mode: 'flirty'
            })
            .select()
            .single();
        return newPrefs;
    }

    return data;
}

async function updateUserPreferences(updates) {
    await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', currentUser.id);
}

async function createConversation() {
    const { data } = await supabase
        .from('conversations')
        .insert({
            user_id: currentUser.id,
            title: 'New Conversation'
        })
        .select()
        .single();

    currentConversationId = data.id;
    return data;
}

async function saveMessage(role, content, contextData = {}) {
    await supabase
        .from('messages')
        .insert({
            conversation_id: currentConversationId,
            role,
            content,
            context_data: contextData
        });
}

function addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '💋';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

async function getLivvieResponse(userMessage) {
    const prefs = await getUserPreferences();
    const personalityMode = prefs?.personality_mode || 'flirty';

    const { data, error } = await supabase.functions.invoke('livvie-chat', {
        body: {
            message: userMessage,
            personality: personalityMode,
            conversationId: currentConversationId
        }
    });

    if (error) {
        console.error('Error calling edge function:', error);
        return getLocalResponse(userMessage, personalityMode);
    }

    return data.response;
}

function getLocalResponse(userMessage, personality) {
    const responses = {
        flirty: [
            "Oh my, you're making me blush... Tell me more.",
            "I love the way you talk to me. What else is on your mind?",
            "You're too charming for your own good. But I like it.",
            "Mmm, I'm all ears, handsome. Keep talking.",
            "You know just how to get my attention, don't you?"
        ],
        friendly: [
            "That's interesting! Tell me more about that.",
            "I'm here to help! What would you like to know?",
            "Great question! Let me think about that.",
            "I appreciate you sharing that with me!",
            "Thanks for chatting with me! How can I assist you?"
        ],
        professional: [
            "I understand. How may I assist you further?",
            "I'm here to help you efficiently. What do you need?",
            "Noted. What would you like me to do?",
            "I'm ready to help. Please provide more details.",
            "Thank you for the information. How can I proceed?"
        ]
    };

    const modeResponses = responses[personality] || responses.friendly;
    return modeResponses[Math.floor(Math.random() * modeResponses.length)];
}

async function handleUserMessage(message) {
    if (!message.trim()) return;

    if (!currentConversationId) {
        await createConversation();
    }

    addMessageToUI('user', message);
    await saveMessage('user', message);

    textInput.value = '';

    const response = await getLivvieResponse(message);

    addMessageToUI('assistant', response);
    await saveMessage('assistant', response);

    await speak(response);
}

function showAuthScreen() {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
}

function showMainScreen() {
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
}

document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
});

document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    const success = await signUp(email, password);
    if (success) {
        showError('Account created! Please sign in.');
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    await signIn(email, password);
});

document.getElementById('logout-btn').addEventListener('click', signOut);

sendBtn.addEventListener('click', () => {
    handleUserMessage(textInput.value);
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserMessage(textInput.value);
    }
});

micBtn.addEventListener('click', () => {
    if (recognition) {
        if (micBtn.classList.contains('listening')) {
            recognition.stop();
        } else {
            micBtn.classList.add('listening');
            recognition.start();
        }
    } else {
        showError('Speech recognition not supported in this browser');
    }
});

document.getElementById('settings-btn').addEventListener('click', async () => {
    const prefs = await getUserPreferences();
    document.getElementById('voice-enabled').checked = prefs?.voice_enabled ?? true;
    document.getElementById('personality-mode').value = prefs?.personality_mode || 'flirty';
    settingsModal.classList.add('active');
});

document.querySelector('.close-modal').addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

document.getElementById('voice-enabled').addEventListener('change', async (e) => {
    await updateUserPreferences({ voice_enabled: e.target.checked });
});

document.getElementById('personality-mode').addEventListener('change', async (e) => {
    await updateUserPreferences({ personality_mode: e.target.value });
});

document.getElementById('voice-select').addEventListener('change', (e) => {
    const voices = synthesis.getVoices();
    selectedVoice = voices[parseInt(e.target.value)];
});

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        showMainScreen();
    } else {
        currentUser = null;
        currentConversationId = null;
        showAuthScreen();
    }
});

if (synthesis.onvoiceschanged !== undefined) {
    synthesis.onvoiceschanged = loadVoices;
}

initSpeechRecognition();
loadVoices();

supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        currentUser = session.user;
        showMainScreen();
    }
});
