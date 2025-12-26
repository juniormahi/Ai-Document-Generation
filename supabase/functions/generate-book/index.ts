import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');

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
  template?: string;
  sourceText?: string;
  sourceType?: 'form' | 'document' | 'text';
}

// Firebase Firestore REST API helper
async function saveToFirestore(userId: string, bookData: any) {
  const projectId = 'document-gen-ai';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/ebooks`;
  
  const firestoreDoc = {
    fields: {
      title: { stringValue: bookData.title },
      targetAge: { stringValue: bookData.targetAge },
      theme: { stringValue: bookData.theme },
      mainCharacter: { stringValue: bookData.mainCharacter },
      template: { stringValue: bookData.template || 'classic' },
      createdAt: { timestampValue: new Date().toISOString() },
      pageCount: { integerValue: bookData.pages.length.toString() },
      pages: {
        arrayValue: {
          values: bookData.pages.map((page: BookPage) => ({
            mapValue: {
              fields: {
                pageNumber: { integerValue: page.pageNumber.toString() },
                text: { stringValue: page.text },
                imagePrompt: { stringValue: page.imagePrompt },
                imageBase64: { stringValue: page.imageBase64 || '' },
              }
            }
          }))
        }
      }
    }
  };

  try {
    const response = await fetch(`${firestoreUrl}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore save error:', errorText);
      return null;
    }

    const result = await response.json();
    console.log('Ebook saved to Firestore successfully');
    return result;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    return null;
  }
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
    console.log('Generating ebook for user:', userId);

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { bookDetails }: { bookDetails: BookDetails } = await req.json();

    if (!bookDetails || !bookDetails.title) {
      throw new Error('Book details are required');
    }

    console.log('Ebook details:', bookDetails);

    // Build story prompt based on source type - AI determines optimal page count
    let storyPrompt = '';
    
    if (bookDetails.sourceType === 'document' || bookDetails.sourceType === 'text') {
      // Calculate suggested page count based on content length
      const contentLength = (bookDetails.sourceText || '').length;
      const suggestedPages = Math.max(5, Math.min(25, Math.ceil(contentLength / 500)));
      
      storyPrompt = `You are a professional ebook author and content transformer. 
Convert the following content into a complete, engaging ebook with illustrations.

SOURCE CONTENT:
${bookDetails.sourceText}

EBOOK REQUIREMENTS:
- Title: ${bookDetails.title}
- Target Audience: ${bookDetails.targetAge}
- Style Template: ${bookDetails.template || 'classic'}

YOUR TASK:
1. Analyze the content and determine the OPTIMAL number of pages (suggested: around ${suggestedPages} pages based on content length)
2. Break the content into logical sections/chapters
3. Rewrite each section in an engaging, professional style
4. Create detailed image/graphic descriptions for each page (charts, diagrams, illustrations, infographics, tables)
5. Include visual elements like:
   - Infographics for data
   - Illustrations for concepts
   - Tables for comparisons
   - Diagrams for processes
   - Charts for statistics

Return as JSON with this structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page content with formatted text, bullet points, key insights...",
      "imagePrompt": "Detailed description for an illustration, chart, diagram, infographic, or table visualization for this page..."
    }
  ]
}

IMPORTANT: Generate as many pages as needed to cover the content completely. Each page should have meaningful content and a relevant visual element. Make it professional, engaging, and visually rich.`;
    } else {
      // Generate from form details - AI determines story length
      storyPrompt = `You are a professional children's ebook author. Create a complete, engaging illustrated ebook.

Ebook Details:
- Title: ${bookDetails.title}
- Target Age: ${bookDetails.targetAge}
- Theme: ${bookDetails.theme}
- Main Character: ${bookDetails.mainCharacter}
- Setting: ${bookDetails.setting}
- Moral/Lesson: ${bookDetails.moral}
- Style Template: ${bookDetails.template || 'classic'}

YOUR TASK:
1. Create a complete story with the OPTIMAL number of pages for this story (typically 8-15 pages for children's books)
2. Each page should have engaging story text (3-5 sentences, age-appropriate)
3. Each page needs a detailed illustration description

Return as JSON with this structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text for this page...",
      "imagePrompt": "Detailed illustration prompt describing the scene, characters, setting, mood, colors..."
    }
  ]
}

IMPORTANT: 
- Create a COMPLETE story with proper beginning, middle, and end
- Include character development and story arc
- Make each page visually distinct and interesting
- End with the moral/lesson naturally woven into the story
- Generate as many pages as the story needs to be complete and engaging`;
    }

    // Generate story using Gemini 2.0 Flash
    console.log('Calling Gemini API for story generation...');
    const storyResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: storyPrompt }] }],
        generationConfig: { 
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      }),
    });

    if (!storyResponse.ok) {
      const errorText = await storyResponse.text();
      console.error('Story generation error:', errorText);
      throw new Error(`Failed to generate story: ${errorText}`);
    }

    const storyData = await storyResponse.json();
    console.log('Story API response received');
    
    const storyContent = storyData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!storyContent) {
      console.error('No content in response:', JSON.stringify(storyData));
      throw new Error('No content generated from AI');
    }
    
    let parsedStory;
    try {
      parsedStory = JSON.parse(storyContent);
    } catch (e) {
      console.error('Failed to parse story JSON:', storyContent);
      throw new Error('Failed to parse generated story');
    }

    const pages: BookPage[] = parsedStory.pages || [];
    console.log(`Generated ${pages.length} pages of story (AI determined)`);

    // Step 2: Generate images using Gemini image generation
    const pagesWithImages: BookPage[] = [];
    const batchSize = 2;
    
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      console.log(`Generating images for pages ${i + 1} to ${Math.min(i + batchSize, pages.length)}...`);
      
      const imagePromises = batch.map(async (page) => {
        // Style based on template
        let stylePrefix = "Professional ebook illustration, clean and modern";
        if (bookDetails.template === 'watercolor') {
          stylePrefix = "Watercolor painting style, soft colors, dreamy, artistic illustration";
        } else if (bookDetails.template === 'comic') {
          stylePrefix = "Comic book style illustration, bold colors, dynamic";
        } else if (bookDetails.template === 'minimal') {
          stylePrefix = "Minimalist illustration, clean lines, simple shapes, modern style";
        } else if (bookDetails.template === 'vintage') {
          stylePrefix = "Vintage illustration, classic style, warm sepia tones, nostalgic";
        } else if (bookDetails.template === 'fantasy') {
          stylePrefix = "Fantasy art illustration, magical, detailed, epic";
        } else if (bookDetails.template === 'business') {
          stylePrefix = "Professional business infographic, clean data visualization, corporate style";
        }
        
        const imagePrompt = `${stylePrefix}. ${page.imagePrompt}. No text in image, high quality, detailed.`;

        try {
          // Using Gemini 2.0 Flash with image generation
          const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate an image: ${imagePrompt}` }] }],
              generationConfig: { 
                responseModalities: ['TEXT', 'IMAGE']
              },
            }),
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error(`Image generation failed for page ${page.pageNumber}:`, errorText);
            return { ...page, imageBase64: undefined };
          }

          const imageData = await imageResponse.json();
          const parts = imageData.candidates?.[0]?.content?.parts || [];
          let imageBase64 = undefined;
          
          for (const part of parts) {
            if (part.inlineData) {
              imageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
          
          console.log(`Image generated for page ${page.pageNumber}: ${imageBase64 ? 'success' : 'no image data'}`);
          return { ...page, imageBase64 };
        } catch (imgError) {
          console.error(`Error generating image for page ${page.pageNumber}:`, imgError);
          return { ...page, imageBase64: undefined };
        }
      });

      const batchResults = await Promise.all(imagePromises);
      pagesWithImages.push(...batchResults);
      
      if (i + batchSize < pages.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Calculate credits based on actual pages generated
    const creditCost = pages.length <= 5 ? 3 : pages.length <= 10 ? 5 : pages.length <= 15 ? 7 : 10;

    const bookResult = {
      title: bookDetails.title,
      targetAge: bookDetails.targetAge,
      theme: bookDetails.theme,
      mainCharacter: bookDetails.mainCharacter,
      template: bookDetails.template || 'classic',
      pages: pagesWithImages,
      creditCost,
    };

    // Save to Firebase Firestore
    const firestoreResult = await saveToFirestore(userId, bookResult);
    
    console.log(`Ebook generated successfully with ${pagesWithImages.length} pages (AI determined optimal length)`);

    return new Response(
      JSON.stringify({
        success: true,
        book: bookResult,
        savedToFirebase: !!firestoreResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error generating ebook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
