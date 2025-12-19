import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_MESSAGE_LENGTH = 5000;
const MAX_MESSAGES_COUNT = 50;

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

    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation to prevent abuse
    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES_COUNT) {
      console.warn(`Input validation failed: messages count ${messages?.length} exceeds limit ${MAX_MESSAGES_COUNT} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_MESSAGES_COUNT} messages allowed` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message
    for (const msg of messages) {
      if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
        console.warn(`Input validation failed: message length ${msg.content?.length} exceeds limit ${MAX_MESSAGE_LENGTH} for user ${userId}`);
        return new Response(
          JSON.stringify({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`AI chat request from authenticated user ${userId} (premium: ${isPremium}), messages: ${messages.length}`);

    const systemMessage = {
      role: "system",
      content: `You are Doc AI, an intelligent document assistant made by Maheer Khan. You help users create, edit, and improve their documents, presentations, and spreadsheets.

Your capabilities:
- Help write and edit documents with proper formatting
- Suggest improvements for clarity and professionalism
- Answer questions about document structure and content
- Provide writing tips and best practices
- Help with grammar, spelling, and style improvements

Always be helpful, concise, and provide actionable suggestions. Use markdown formatting in your responses for better readability.`
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [systemMessage, ...messages],
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
      throw new Error("No response generated");
    }

    console.log(`AI chat response generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        choices: [{
          message: {
            role: "assistant",
            content: content
          }
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});