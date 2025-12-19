// Image Processor - Processes ai_prompt elements and replaces with base64 images
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import type { DocumentSchema, AnyDocumentElement, ImageElement } from "./documentSchema";

interface ImageProcessingResult {
  schema: DocumentSchema;
  imagesGenerated: number;
  errors: string[];
  subscriptionRequired?: boolean;
}

// Check if user has paid subscription for image generation
async function checkPaidSubscription(userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!subscription;
}

// Process all image elements with ai_prompt and generate actual images
export async function processDocumentImages(
  schema: DocumentSchema,
  onProgress?: (current: number, total: number) => void,
  userId?: string
): Promise<ImageProcessingResult> {
  const errors: string[] = [];
  let imagesGenerated = 0;
  
  // Check if user has paid subscription - image generation is paid-only
  const isPaidUser = await checkPaidSubscription(userId);
  if (!isPaidUser) {
    return { 
      schema, 
      imagesGenerated: 0, 
      errors: ['AI Image Generation requires a Standard or Premium subscription.'],
      subscriptionRequired: true
    };
  }
  
  // Find all image elements that need processing
  const imageElements: { sectionIdx: number; elementIdx: number; element: ImageElement }[] = [];
  
  schema.sections.forEach((section, sectionIdx) => {
    section.elements.forEach((element, elementIdx) => {
      if (element.type === 'image' && (element as ImageElement).ai_prompt && !(element as ImageElement).url) {
        imageElements.push({ 
          sectionIdx, 
          elementIdx, 
          element: element as ImageElement 
        });
      }
    });
  });

  const totalImages = imageElements.length;
  if (totalImages === 0) {
    return { schema, imagesGenerated: 0, errors: [] };
  }

  // Create a deep copy of the schema
  const newSchema: DocumentSchema = JSON.parse(JSON.stringify(schema));
  
  // Process images in parallel (max 3 at a time to avoid rate limits)
  const batchSize = 3;
  for (let i = 0; i < imageElements.length; i += batchSize) {
    const batch = imageElements.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async ({ sectionIdx, elementIdx, element }) => {
        try {
          const headers = await getAuthHeaders();
          const { data, error } = await supabase.functions.invoke('generate-document-image', {
            body: { 
              prompt: element.ai_prompt,
              style: 'professional diagram',
              userId
            },
            headers
          });

          if (error) throw error;
          if (!data?.image_url) throw new Error('No image URL returned');

          // Update the element with the generated image URL
          const targetElement = newSchema.sections[sectionIdx].elements[elementIdx] as ImageElement;
          targetElement.url = data.image_url;
          
          return true;
        } catch (err: any) {
          console.error(`Failed to generate image for: ${element.ai_prompt}`, err);
          throw err;
        }
      })
    );

    results.forEach((result, idx) => {
      const batchIdx = i + idx;
      if (result.status === 'fulfilled') {
        imagesGenerated++;
      } else {
        errors.push(`Image ${batchIdx + 1}: ${result.reason?.message || 'Unknown error'}`);
      }
    });

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, totalImages), totalImages);
    }
  }

  return { schema: newSchema, imagesGenerated, errors };
}

// Check if a document has unprocessed images
export function hasUnprocessedImages(schema: DocumentSchema): boolean {
  return schema.sections.some(section =>
    section.elements.some(element =>
      element.type === 'image' && 
      (element as ImageElement).ai_prompt && 
      !(element as ImageElement).url
    )
  );
}

// Count images in document
export function countImages(schema: DocumentSchema): { total: number; processed: number; pending: number } {
  let total = 0;
  let processed = 0;
  
  schema.sections.forEach(section => {
    section.elements.forEach(element => {
      if (element.type === 'image') {
        total++;
        if ((element as ImageElement).url) {
          processed++;
        }
      }
    });
  });

  return { total, processed, pending: total - processed };
}
