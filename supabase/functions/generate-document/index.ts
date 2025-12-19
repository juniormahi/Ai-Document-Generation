import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

// Input validation limits
const MAX_TOPIC_LENGTH = 2000;

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

    const { topic } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation to prevent abuse
    if (typeof topic !== 'string' || topic.length > MAX_TOPIC_LENGTH) {
      console.warn(`Input validation failed: topic length ${topic?.length} exceeds limit ${MAX_TOPIC_LENGTH} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: `Topic exceeds maximum length of ${MAX_TOPIC_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating document for authenticated user ${userId} (premium: ${isPremium}), topic length: ${topic.length}`);

    const wordLimit = isPremium ? "8000-12000" : "1500-2500";

    const systemPrompt = `You are an expert document writer for ${isPremium ? 'DocGen-Pro (Premium)' : 'DocGen-Free'}. Create professional, well-structured content using proper formatting.

CRITICAL FORMATTING RULES:
- Use # for the main title (only one per document)
- Use ## for major section headings
- Use ### for subsection headings  
- Use #### for minor headings if needed
- Use **text** for bold emphasis on important terms
- Use *text* for italic emphasis
- Use - for bullet points (one per line)
- Use numbered lists (1. 2. 3.) for sequential steps
- Write clear paragraphs with proper spacing between sections
- Include an introduction, multiple well-organized sections, and a conclusion

DO NOT use HTML tags. Use only Markdown formatting as described above.`;

    const userPrompt = `Write a comprehensive, professional document about: ${topic}

Requirements:
- Target length: ${wordLimit} words
- Structure: Title (# heading), Introduction, ${isPremium ? '6-10' : '4-6'} well-organized sections with proper headings (##, ###), and a conclusion
- Use bullet points and numbered lists where appropriate
- Include specific details, examples, and explanations
- Make it informative and engaging
${isPremium ? '- Include advanced insights and comprehensive coverage\n- Add expert-level details and analysis' : ''}

Return as JSON: {"title": "Document Title", "source": "mydocmaker.com", "html_content": "# Title\\n\\nContent here..."}`;

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

    // Try to parse as JSON first
    let parsedContent;
    try {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(content);
    } catch {
      // If not JSON, create structured response
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : topic;
      
      parsedContent = {
        title: title,
        source: "mydocmaker.com",
        html_content: content
      };
    }

    console.log(`Document generated successfully for user ${userId} (${isPremium ? 'premium' : 'free'})`);

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-document function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});