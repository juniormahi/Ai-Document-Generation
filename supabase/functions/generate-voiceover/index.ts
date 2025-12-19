import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_TEXT_LENGTH = 5000;

// ElevenLabs voice options
const VOICE_OPTIONS = {
  "aria-female": "9BWtsMINqrJLrRacOk9x",
  "roger-male": "CwhRBWXzGAHq8TQ4Fs17",
  "sarah-female": "EXAVITQu4vr4xnSDxMaL",
  "laura-female": "FGY2WhTYpPnrIDTdsKH5",
  "charlie-male": "IKne3meq5aSn9XLyUdCD",
  "george-male": "JBFqnCBsd6RMkjVDRZzb",
  "callum-male": "N2lVS1w4EtoT3dr4eOWO",
  "river-neutral": "SAz9YHcvj6GT2YYXdXww",
  "liam-male": "TX3LPaxmHKxFdv7VOQHJ",
  "charlotte-female": "XB0fDUnXU5powFXDhCwa",
  "alice-female": "Xb7hH8MSUJpSbSDYk0k2",
  "matilda-female": "XrExE9yKIg1WjnnlVkGX",
  "will-male": "bIHbv24MWmeRgasZH58o",
  "jessica-female": "cgSgspJ2msm6clMCkdW9",
  "eric-male": "cjVigY5qzO86Huf0OWal",
  "chris-male": "iP95p4xoKVk53GoZ742B",
  "brian-male": "nPczCjzI2devNBz1zQrb",
  "daniel-male": "onwK4e9ZLuTAKqWW03F9",
  "lily-female": "pFZP5JQG7iQjIQuC4Bku",
  "bill-male": "pqHfZKP75CvOlQylNhV4",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request - verify Firebase token and get user info
    const auth = await authenticateRequest(req);
    
    if (auth.error) {
      console.error("Authentication failed:", auth.error);
      return unauthorizedResponse(corsHeaders, auth.error);
    }

    const { userId, isPremium } = auth;

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, voice = "aria-female", model = "eleven_turbo_v2_5" } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required for voice generation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation to prevent abuse and cost overruns
    if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
      console.warn(`Input validation failed: text length ${text?.length} exceeds limit ${MAX_TEXT_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get voice ID from our mapping or use directly if it's already an ID
    const voiceId = VOICE_OPTIONS[voice as keyof typeof VOICE_OPTIONS] || voice;

    console.log(`Generating voiceover for authenticated user ${userId} (premium: ${isPremium}) with voice ${voice} (${voiceId}), text length: ${text.length}`);

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    console.log(`Voiceover generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        audio: audioBase64,
        contentType: "audio/mpeg",
        message: "Voiceover generated successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-voiceover function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});