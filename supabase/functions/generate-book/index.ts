import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

interface BookPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageBase64?: string;
}

interface BookDetails {
  title: string;
  targetAge: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  moral: string;
  pageCount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);

    if (auth.error) {
      return unauthorizedResponse(corsHeaders, auth.error);
    }

    const userId = auth.userId;
    console.log('Generating book for user:', userId);

    const { bookDetails }: { bookDetails: BookDetails } = await req.json();

    if (!bookDetails || !bookDetails.title) {
      throw new Error('Book details are required');
    }

    console.log('Book details:', bookDetails);

    // Step 1: Generate the story structure with text for each page
    const storyPrompt = `You are a children's book author. Create a ${bookDetails.pageCount}-page picture book story.

Book Details:
- Title: ${bookDetails.title}
- Target Age: ${bookDetails.targetAge}
- Theme: ${bookDetails.theme}
- Main Character: ${bookDetails.mainCharacter}
- Setting: ${bookDetails.setting}
- Moral/Lesson: ${bookDetails.moral}

Generate the complete story with exactly ${bookDetails.pageCount} pages. For each page, provide:
1. The story text (2-4 sentences, age-appropriate language)
2. A detailed image description for illustration (describe the scene, characters, colors, style)

Return as JSON array with this structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text for this page...",
      "imagePrompt": "Detailed illustration prompt: A colorful scene showing..."
    }
  ]
}

Make the story engaging, educational, and suitable for children. Use vivid descriptions for the image prompts that would work well for AI image generation.`;

    // Generate story structure
    const storyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: storyPrompt }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!storyResponse.ok) {
      const errorText = await storyResponse.text();
      console.error('Story generation error:', errorText);
      throw new Error('Failed to generate story');
    }

    const storyData = await storyResponse.json();
    const storyContent = storyData.choices?.[0]?.message?.content;
    
    let parsedStory;
    try {
      parsedStory = JSON.parse(storyContent);
    } catch (e) {
      console.error('Failed to parse story JSON:', storyContent);
      throw new Error('Failed to parse generated story');
    }

    const pages: BookPage[] = parsedStory.pages || [];
    console.log(`Generated ${pages.length} pages of story`);

    // Step 2: Generate images for each page using Nano Banana
    const pagesWithImages: BookPage[] = [];

    for (const page of pages) {
      console.log(`Generating image for page ${page.pageNumber}...`);
      
      const imagePrompt = `Children's book illustration, colorful and whimsical style, ${page.imagePrompt}. Style: Pixar-like, vibrant colors, child-friendly, warm lighting, no text in image.`;

      try {
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              { role: 'user', content: imagePrompt }
            ],
            modalities: ['image', 'text'],
          }),
        });

        if (!imageResponse.ok) {
          console.error(`Image generation failed for page ${page.pageNumber}`);
          pagesWithImages.push({ ...page, imageBase64: undefined });
          continue;
        }

        const imageData = await imageResponse.json();
        const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        pagesWithImages.push({
          ...page,
          imageBase64: imageUrl || undefined,
        });

        console.log(`Image generated for page ${page.pageNumber}`);
      } catch (imgError) {
        console.error(`Error generating image for page ${page.pageNumber}:`, imgError);
        pagesWithImages.push({ ...page, imageBase64: undefined });
      }

      // Small delay between image generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Track usage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate credits based on page count
    const creditCost = pages.length <= 5 ? 3 : pages.length <= 10 ? 5 : 7;

    await supabase.rpc('increment_usage', {
      _user_id: userId,
      _usage_type: 'books',
      _amount: creditCost,
    });

    console.log(`Book generated successfully with ${pagesWithImages.length} pages, charged ${creditCost} credits`);

    return new Response(
      JSON.stringify({
        success: true,
        book: {
          title: bookDetails.title,
          targetAge: bookDetails.targetAge,
          theme: bookDetails.theme,
          mainCharacter: bookDetails.mainCharacter,
          pages: pagesWithImages,
          creditCost,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error generating book:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
