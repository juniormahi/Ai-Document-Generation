import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

const MAX_TOPIC_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 50000;

const DOCUMENT_SCHEMA = `{
  "metadata": {
    "title": "Document Title",
    "subject": "Brief subject description"
  },
  "theme": {
    "name": "modern|classic|professional|creative|minimal",
    "font_name": "Calibri|Arial|Times New Roman|Georgia|Helvetica",
    "font_size": 11,
    "primary_color": "2563EB",
    "secondary_color": "64748B"
  },
  "sections": [
    {
      "orientation": "portrait|landscape",
      "header": { "text": "Header text", "align": "left|center|right", "show_page_numbers": false },
      "footer": { "text": "Footer text", "show_page_numbers": true },
      "elements": [
        { "type": "heading1", "text": "Main Title", "alignment": "center" },
        { "type": "heading2", "text": "Section Heading" },
        { "type": "heading3", "text": "Subsection Heading" },
        { "type": "paragraph", "text": "Regular paragraph text", "alignment": "left|center|right|justify" },
        { "type": "paragraph", "text_runs": [
          { "text": "Bold text", "bold": true },
          { "text": " normal ", "bold": false },
          { "text": "colored text", "color": "FF0000" }
        ]},
        { "type": "bullet_list", "items": ["Item 1", "Item 2", "Item 3"] },
        { "type": "numbered_list", "items": ["Step 1", "Step 2", "Step 3"] },
        { "type": "table", "style": "grid|simple|striped", "rows": [
          { "cells": ["Header 1", "Header 2", "Header 3"], "isHeader": true },
          { "cells": ["Data 1", "Data 2", "Data 3"] }
        ]},
        { "type": "image", "ai_prompt": "A professional diagram showing workflow", "width_inches": 4, "caption": "Figure 1" },
        { "type": "divider" }
      ]
    }
  ]
}`;

const IMAGE_INSTRUCTIONS = `
IMAGE GENERATION: When user asks for diagrams, charts, images, or visualizations:
- Add element with type: "image"
- Set ai_prompt to describe the image (be specific, professional style)
- Set width_inches (typically 4-6 inches)
- Add a caption
Example: { "type": "image", "ai_prompt": "A flowchart showing sales process from lead to close", "width_inches": 5, "caption": "Figure 1: Sales Process" }
`;

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

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { topic, currentJson, templateName, themeName, mode = 'create' } = body;

    if (mode === 'create' && !topic && !templateName) {
      return new Response(
        JSON.stringify({ error: 'Topic or template is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (topic && topic.length > MAX_TOPIC_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Topic exceeds maximum length of ${MAX_TOPIC_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Document generation for user ${userId} (premium: ${isPremium}), mode: ${mode}`);

    const systemPrompt = `You are a Document Architect Engine. You generate professional Microsoft Word documents by outputting STRICT JSON that follows this exact schema:

${DOCUMENT_SCHEMA}

CRITICAL RULES:
1. ONLY output valid JSON - no markdown, no explanations, no code blocks
2. Always include metadata.title
3. Use proper heading hierarchy (heading1 > heading2 > heading3 > heading4)
4. For complex formatting, use text_runs with bold, italic, color properties
5. Tables must have rows array with cells array in each row
6. Colors are hex format without # (e.g., "FF0000" for red)
7. Available themes: modern, classic, professional, creative, minimal
8. ${isPremium ? 'Create comprehensive, detailed documents with 8-15 sections' : 'Create focused documents with 5-8 sections'}

${IMAGE_INSTRUCTIONS}

You are helping ${isPremium ? 'a premium user who expects detailed, professional documents' : 'a free user who needs concise, helpful documents'}.`;

    let userPrompt: string;

    if (mode === 'edit' && currentJson) {
      const contextString = JSON.stringify(currentJson).substring(0, MAX_CONTEXT_LENGTH);
      userPrompt = `The user wants to modify this existing document:
${contextString}

USER INSTRUCTION: ${topic}

Return the COMPLETE UPDATED JSON document with the requested changes applied. Preserve all existing content except what needs to be changed. Output only valid JSON.`;
    } else if (templateName) {
      userPrompt = `Create a professional ${templateName} document.
${topic ? `Additional requirements: ${topic}` : ''}

Fill in the template with realistic placeholder content that the user can easily customize.
Apply the ${themeName || 'modern'} theme.

Return the complete JSON document only.`;
    } else {
      userPrompt = `Create a professional document about: ${topic}

Requirements:
- Use the ${themeName || 'modern'} theme
- Create ${isPremium ? '8-15' : '5-8'} well-organized sections
- Include appropriate headings, paragraphs, lists, and tables where relevant
- Make the content informative and professional
- Use text formatting (bold, colors) to highlight key points
- If the topic mentions diagrams or visuals, include image elements with ai_prompt

Return the complete JSON document only.`;
    }

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

    // Clean up JSON
    content = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse and validate JSON
    let documentJson;
    try {
      documentJson = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Content that failed to parse:", content.substring(0, 500));
      throw new Error("Failed to parse generated document structure");
    }

    // Ensure required fields exist
    if (!documentJson.metadata?.title) {
      documentJson.metadata = documentJson.metadata || {};
      documentJson.metadata.title = topic || "Untitled Document";
    }

    if (!documentJson.theme) {
      documentJson.theme = {
        name: themeName || "modern",
        font_name: "Calibri",
        font_size: 11,
        primary_color: "2563EB",
        secondary_color: "64748B"
      };
    }

    if (!documentJson.sections || !Array.isArray(documentJson.sections)) {
      throw new Error("Invalid document structure: missing sections");
    }

    console.log(`Document JSON generated successfully for user ${userId}`);

    return new Response(
      JSON.stringify(documentJson),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-document-json function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
