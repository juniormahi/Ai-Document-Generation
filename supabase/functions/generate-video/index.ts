import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Daily credit limits for video
const FREE_DAILY_VIDEO_CREDITS = 2;
const PRO_DAILY_VIDEO_CREDITS = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    
    if (auth.error) {
      console.error("Authentication failed:", auth.error);
      return unauthorizedResponse(corsHeaders, auth.error);
    }

    const { userId, isPremium } = auth;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check daily video credits
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    // Use voiceovers_generated as proxy for video credits (we can add a dedicated column later)
    const videosGeneratedToday = usageData?.voiceovers_generated || 0;
    const dailyLimit = isPremium ? PRO_DAILY_VIDEO_CREDITS : FREE_DAILY_VIDEO_CREDITS;

    if (videosGeneratedToday >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: "Daily credit limit reached", 
          message: `You've used all ${dailyLimit} video credits for today. ${!isPremium ? 'Upgrade to Pro for 20 daily credits!' : 'Credits reset tomorrow.'}`,
          creditsUsed: videosGeneratedToday,
          creditLimit: dailyLimit
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, prompt, duration = 5, saveToGallery = true } = await req.json();

    if (!imageUrl && !prompt) {
      return new Response(
        JSON.stringify({ error: 'Either image URL or prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating video for user ${userId} (premium: ${isPremium}), credits: ${videosGeneratedToday}/${dailyLimit}`);

    // Build the message content based on input type
    let messageContent: any;
    if (imageUrl) {
      messageContent = [
        { 
          type: "text", 
          text: `Create a cinematic ${duration}-second video animation from this image. ${prompt || 'Add smooth camera motion, subtle parallax effects, and bring the scene to life with gentle movements.'} Make it professional and visually stunning with smooth transitions.`
        },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    } else {
      messageContent = `Create a cinematic ${duration}-second video scene: ${prompt}. Include smooth camera movements, professional lighting, and make it visually stunning and engaging.`;
    }

    // Note: Using nano-banana for video previews. Full video generation with Veo would require additional integration
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview", // nano-banana for preview
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required - please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const previewUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content;

    if (!previewUrl) {
      throw new Error("No video preview generated");
    }

    // Update usage tracking
    if (usageData) {
      await supabase
        .from('usage_tracking')
        .update({ voiceovers_generated: videosGeneratedToday + 1 })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          voiceovers_generated: 1
        });
    }

    // Save to gallery
    if (saveToGallery) {
      const { error: insertError } = await supabase
        .from('generated_media')
        .insert({
          user_id: userId,
          title: `AI Video - ${(prompt || 'Image to Video').substring(0, 50)}`,
          description: textContent || "Video preview generated successfully",
          media_type: 'video',
          file_url: previewUrl,
          thumbnail_url: previewUrl,
          prompt: prompt || 'Image to video conversion',
          metadata: { 
            source_image: imageUrl,
            duration: duration,
            generated_at: new Date().toISOString() 
          }
        });

      if (insertError) {
        console.error("Error saving to gallery:", insertError);
      }
    }

    console.log(`Video preview generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        videoUrl: previewUrl,
        previewUrl: previewUrl,
        description: textContent || "Video preview generated successfully",
        creditsUsed: videosGeneratedToday + 1,
        creditLimit: dailyLimit,
        creditsRemaining: dailyLimit - (videosGeneratedToday + 1),
        savedToGallery: saveToGallery,
        note: "Video preview generated. Full video generation with Veo coming soon!"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Video generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});