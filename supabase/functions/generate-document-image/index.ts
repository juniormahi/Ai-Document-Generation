import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Free users: 4 images/day, Premium: 100 images/day
const FREE_IMAGE_LIMIT = 4;
const PREMIUM_IMAGE_LIMIT = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, style = "professional diagram", userId } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage limits if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check if user can generate more images
      const { data: canGenerate, error: limitError } = await supabase.rpc('check_usage_limit', {
        _user_id: userId,
        _limit_type: 'images',
        _free_limit: FREE_IMAGE_LIMIT,
        _premium_limit: PREMIUM_IMAGE_LIMIT
      });

      if (limitError) {
        console.error("Error checking usage limit:", limitError);
      } else if (!canGenerate) {
        return new Response(
          JSON.stringify({ 
            error: "Image limit reached",
            message: `You've reached your daily limit of ${FREE_IMAGE_LIMIT} AI images. Upgrade to Premium for ${PREMIUM_IMAGE_LIMIT} images/day.`
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Generating image for prompt: ${prompt.substring(0, 100)}...`);

    // Enhanced prompt for document-appropriate images
    const enhancedPrompt = `Create a ${style} illustration for a professional document: ${prompt}. 
Style: Clean, minimalist, professional, suitable for business documents. 
Colors: Use a cohesive color palette. 
Format: Vector-style, flat design, clear and readable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: enhancedPrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      
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
      
      throw new Error(`Image API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content;

    if (!imageData) {
      console.log("No image generated, response:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "No image generated",
          message: textContent || "The model could not generate an image for this prompt"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment usage after successful generation
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.rpc('increment_usage', {
        _user_id: userId,
        _usage_type: 'images'
      });
    }

    console.log("Image generated successfully");

    return new Response(
      JSON.stringify({ 
        image_url: imageData,
        description: textContent || prompt
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-document-image function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});