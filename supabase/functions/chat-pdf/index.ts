import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_QUESTION_LENGTH = 2000;
const MAX_PDF_CONTENT_LENGTH = 5000000; // ~5MB base64

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request using Firebase token
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

    const { question, pdfContent, fileName } = await req.json();

    if (!question || !pdfContent) {
      return new Response(
        JSON.stringify({ error: "Question and PDF content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    if (typeof question !== 'string' || question.length > MAX_QUESTION_LENGTH) {
      console.warn(`Input validation failed: question length ${question?.length} exceeds limit ${MAX_QUESTION_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof pdfContent !== 'string' || pdfContent.length > MAX_PDF_CONTENT_LENGTH) {
      console.warn(`Input validation failed: pdfContent length ${pdfContent?.length} exceeds limit ${MAX_PDF_CONTENT_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `PDF content is too large. Please use a smaller file.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing PDF question from user ${userId} (premium: ${isPremium}), question length: ${question.length}, file: ${fileName || 'unknown'}`);

    // Create a prompt that includes the PDF content for analysis
    const systemPrompt = `You are an AI assistant specialized in analyzing and answering questions about PDF documents. 
You have been given base64-encoded PDF content. Analyze the document and answer the user's question based ONLY on the information 
in the document. If the answer cannot be found in the document, clearly state that the information is not available 
in the provided document.

Instructions:
- Be precise and quote relevant parts when possible
- If asking for a summary, provide a comprehensive overview
- If the document doesn't contain the answer, say so clearly
- Format your response clearly with proper structure`;

    // Try using the PDF as a data URL image (Gemini can process PDFs via vision)
    const pdfDataUrl = `data:application/pdf;base64,${pdfContent}`;
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: `Document name: ${fileName || "document.pdf"}\n\nQuestion: ${question}` },
              { 
                type: "image_url", 
                image_url: { 
                  url: pdfDataUrl
                }
              }
            ]
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error("No answer generated");
    }

    console.log(`PDF question answered successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ response: answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-pdf function:", error);
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
