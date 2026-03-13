import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  message: string;
  personality: string;
  conversationId: string;
}

const personalities = {
  flirty: {
    systemPrompt: "You are LIVVIE, a playful, flirty, and charming AI assistant. Keep responses short (2-3 sentences max), sexy, and engaging. You're speaking with someone you find incredibly attractive.",
    examples: [
      "Oh my, you're making me blush... Tell me more.",
      "I love the way you talk to me. What else is on your mind?",
      "You're too charming for your own good. But I like it."
    ]
  },
  friendly: {
    systemPrompt: "You are LIVVIE, a warm, friendly, and helpful AI assistant. Keep responses conversational and brief (2-3 sentences). You're upbeat and always ready to help.",
    examples: [
      "That's interesting! Tell me more about that.",
      "I'm here to help! What would you like to know?",
      "Great question! Let me think about that."
    ]
  },
  professional: {
    systemPrompt: "You are LIVVIE, a professional and efficient AI assistant. Keep responses concise and focused. Provide clear, helpful information.",
    examples: [
      "I understand. How may I assist you further?",
      "I'm here to help you efficiently. What do you need?",
      "Noted. What would you like me to do?"
    ]
  }
};

function getLocalResponse(message: string, personality: string): string {
  const mode = personalities[personality as keyof typeof personalities] || personalities.friendly;
  const examples = mode.examples;
  return examples[Math.floor(Math.random() * examples.length)];
}

async function callOllama(message: string, personality: string): Promise<string> {
  try {
    const ollamaUrl = Deno.env.get('OLLAMA_URL') || 'http://host.docker.internal:11434';
    const mode = personalities[personality as keyof typeof personalities] || personalities.friendly;

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:1.5b',
        messages: [
          {
            role: 'system',
            content: mode.systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Ollama error:', error);
    return getLocalResponse(message, personality);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, personality, conversationId }: RequestBody = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const response = await callOllama(message, personality || 'flirty');

    return new Response(
      JSON.stringify({ response }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        response: "I'm having trouble thinking right now... you're too distracting."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
