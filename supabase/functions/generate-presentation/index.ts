import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_TOPIC_LENGTH = 2000;
const MAX_SLIDE_COUNT = 50;

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

    const { topic, slideCount = 10 } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation to prevent abuse
    if (typeof topic !== 'string' || topic.length > MAX_TOPIC_LENGTH) {
      console.warn(`Input validation failed: topic length ${topic?.length} exceeds limit ${MAX_TOPIC_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Topic exceeds maximum length of ${MAX_TOPIC_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validatedSlideCount = Math.min(Math.max(1, Number(slideCount) || 10), MAX_SLIDE_COUNT);

    console.log(`Generating presentation for authenticated user ${userId} (premium: ${isPremium}), topic length: ${topic.length}, slides: ${validatedSlideCount}`);

    const systemPrompt = `You are an expert presentation creator. You must return ONLY valid JSON in this exact format:
{
  "presentation_title": "Title Here",
  "slides": [
    {
      "title": "Slide Title",
      "subtitle": "Optional Subtitle",
      "slide_layout": "title_slide"
    },
    {
      "title": "Agenda",
      "slide_layout": "agenda",
      "bullets": [
        {"content": "Topic 1", "level": 0},
        {"content": "Topic 2", "level": 0}
      ]
    },
    {
      "title": "Content Slide Title",
      "slide_layout": "title_and_content",
      "bullets": [
        {"content": "Main point", "level": 0},
        {"content": "Sub-point", "level": 1}
      ]
    }
  ]
}

Rules:
- First slide MUST use "slide_layout": "title_slide" with title and subtitle
- Second slide should be "slide_layout": "agenda" with bullet list of topics
- Content slides use "slide_layout": "title_and_content" with bullets array
- Each bullet has "content" (text) and "level" (0 for main, 1 for sub-points)
- Return ONLY the JSON, no markdown formatting`;

    const userPrompt = `Create a ${validatedSlideCount}-slide presentation about: ${topic}

Structure:
1. Title slide with compelling title and subtitle
2. Agenda slide listing all main topics  
3. ${validatedSlideCount - 3} content slides with informative titles and 3-5 bullet points each
4. Closing slide with next steps and contact info

Return ONLY valid JSON in the specified format.`;

    console.log("Calling Lovable AI for presentation generation...");
    
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
          { role: "user", content: userPrompt }
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
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("Parsing presentation JSON...");
    const presentationData = JSON.parse(content);

    console.log(`Presentation generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify(presentationData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-presentation function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});