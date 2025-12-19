import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Daily credit limits
const FREE_DAILY_IMAGE_CREDITS = 10;
const PRO_DAILY_IMAGE_CREDITS = 100;

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

    // Check daily image credits
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('images_generated')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const imagesGeneratedToday = usageData?.images_generated || 0;
    const dailyLimit = isPremium ? PRO_DAILY_IMAGE_CREDITS : FREE_DAILY_IMAGE_CREDITS;

    if (imagesGeneratedToday >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: "Daily credit limit reached", 
          message: `You've used all ${dailyLimit} image credits for today. ${!isPremium ? 'Upgrade to Pro for 100 daily credits!' : 'Credits reset tomorrow.'}`,
          creditsUsed: imagesGeneratedToday,
          creditLimit: dailyLimit
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, style, count = 1, saveToGallery = true } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const batchCount = Math.min(Math.max(1, count), 4);
    
    // Check if we have enough credits for batch
    if (imagesGeneratedToday + batchCount > dailyLimit) {
      const remaining = dailyLimit - imagesGeneratedToday;
      return new Response(
        JSON.stringify({ 
          error: "Not enough credits", 
          message: `You only have ${remaining} image credit(s) remaining today.`,
          creditsUsed: imagesGeneratedToday,
          creditLimit: dailyLimit
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Enhanced style prompts
    let enhancedPrompt = prompt;
    if (style) {
      const stylePrompts: Record<string, string> = {
        "realistic": `Ultra realistic, high quality photograph: ${prompt}. 8K resolution, professional photography, sharp focus, photorealistic`,
        "artistic": `Artistic digital painting: ${prompt}. Vibrant colors, creative composition, masterpiece quality`,
        "anime": `Anime style illustration: ${prompt}. Japanese anime art style, vibrant colors, detailed character design, studio quality anime artwork`,
        "watercolor": `Watercolor painting: ${prompt}. Soft flowing colors, beautiful watercolor technique, artistic brushstrokes, traditional watercolor medium`,
        "oil-painting": `Classical oil painting: ${prompt}. Rich oil paint textures, museum quality, reminiscent of old masters, detailed brushwork, classical art style`,
        "cyberpunk": `Cyberpunk style: ${prompt}. Neon lights, futuristic dystopian cityscape, high tech low life, glowing elements, purple and cyan color palette, blade runner aesthetic`,
        "minimalist": `Minimalist design: ${prompt}. Clean, simple, elegant, modern aesthetic, negative space`,
        "cartoon": `Cartoon style illustration: ${prompt}. Colorful, fun, animated style, bold outlines`,
        "3d": `3D rendered image: ${prompt}. High quality 3D rendering, realistic lighting, detailed textures, octane render`,
        "vintage": `Vintage style: ${prompt}. Retro aesthetic, nostalgic feel, classic look, aged appearance, film grain`,
      };
      enhancedPrompt = stylePrompts[style] || prompt;
    }

    console.log(`Generating ${batchCount} image(s) for user ${userId}, credits: ${imagesGeneratedToday}/${dailyLimit}`);

    const generatedImages: Array<{ imageUrl: string; description: string }> = [];
    const errors: string[] = [];

    // Generate images in parallel using nano-banana model
    const generatePromises = Array(batchCount).fill(null).map(async (_, index) => {
      try {
        const variedPrompt = batchCount > 1 
          ? `${enhancedPrompt}. Variation ${index + 1}, unique composition.`
          : enhancedPrompt;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview", // nano-banana model
            messages: [{ role: "user", content: variedPrompt }],
            modalities: ["image", "text"]
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded");
          }
          if (response.status === 402) {
            throw new Error("Payment required - please add credits");
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const textContent = data.choices?.[0]?.message?.content;

        if (!imageUrl) {
          throw new Error("No image generated");
        }

        return { imageUrl, description: textContent || "Image generated successfully" };
      } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error);
        errors.push(error instanceof Error ? error.message : "Unknown error");
        return null;
      }
    });

    const results = await Promise.all(generatePromises);
    
    for (const result of results) {
      if (result) {
        generatedImages.push(result);
      }
    }

    if (generatedImages.length === 0) {
      throw new Error(errors[0] || "Failed to generate any images");
    }

    // Update usage tracking
    if (usageData) {
      await supabase
        .from('usage_tracking')
        .update({ images_generated: imagesGeneratedToday + generatedImages.length })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          images_generated: generatedImages.length
        });
    }

    // Save to gallery if requested
    if (saveToGallery && generatedImages.length > 0) {
      const galleryEntries = generatedImages.map((img, index) => ({
        user_id: userId,
        title: `AI Image ${batchCount > 1 ? `(${index + 1}/${generatedImages.length})` : ''} - ${prompt.substring(0, 50)}`,
        description: img.description,
        media_type: 'image',
        file_url: img.imageUrl,
        prompt: prompt,
        style: style || 'default',
        metadata: { generated_at: new Date().toISOString() }
      }));

      const { error: insertError } = await supabase
        .from('generated_media')
        .insert(galleryEntries);

      if (insertError) {
        console.error("Error saving to gallery:", insertError);
      } else {
        console.log(`Saved ${generatedImages.length} image(s) to gallery for user ${userId}`);
      }
    }

    console.log(`Generated ${generatedImages.length} image(s) successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        images: generatedImages,
        savedToGallery: saveToGallery,
        creditsUsed: imagesGeneratedToday + generatedImages.length,
        creditLimit: dailyLimit,
        creditsRemaining: dailyLimit - (imagesGeneratedToday + generatedImages.length),
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});