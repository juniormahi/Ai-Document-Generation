import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_PROMPT_LENGTH = 10000;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, type = "document" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation to prevent abuse
    if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH) {
      console.warn(`Input validation failed: prompt length ${prompt?.length} exceeds limit ${MAX_PROMPT_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating content for authenticated user ${userId} (premium: ${isPremium}), prompt length: ${prompt.length}`);

    // Create system prompts based on content type
    let systemPrompt = "You are a helpful AI assistant that creates high-quality content.";
    
    if (type === "document") {
      systemPrompt = "You are an expert document writer. Create professional, well-structured documents with clear sections, proper formatting, and comprehensive content. Use markdown formatting for headers, lists, and emphasis.";
    } else if (type === "presentation") {
      systemPrompt = "You are an expert presentation creator. Generate compelling slide content with clear titles, concise bullet points, and engaging narratives. Structure content in a way that's easy to present. Use markdown formatting.";
    } else if (type === "story") {
      systemPrompt = "You are a creative storyteller. Write engaging, imaginative stories with vivid descriptions, compelling characters, and interesting plots. Be creative and entertaining.";
    } else if (type === "writer") {
      systemPrompt = "You are a professional content writer. Create clear, engaging, and well-structured content that meets the user's specific requirements. Adapt your tone and style based on the context.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    console.log(`Content generated successfully for user ${userId}`);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-content function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});