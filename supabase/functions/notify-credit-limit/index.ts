import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier limits configuration
const TIER_LIMITS: Record<string, Record<string, number>> = {
  images_generated: { free: 10, standard: 50, premium: 100 },
  videos_generated: { free: 2, standard: 10, premium: 30 },
  chat_messages: { free: 50, standard: 200, premium: 999 },
  voiceovers_generated: { free: 5, standard: 25, premium: 100 },
  documents_generated: { free: 5, standard: 25, premium: 100 },
  presentations_generated: { free: 3, standard: 15, premium: 50 },
  spreadsheets_generated: { free: 5, standard: 25, premium: 100 },
};

const TOOL_NAMES: Record<string, string> = {
  images_generated: "Image Generator",
  videos_generated: "Video Generator",
  chat_messages: "AI Chat",
  voiceovers_generated: "Voiceover",
  documents_generated: "Document Creator",
  presentations_generated: "Presentation Maker",
  spreadsheets_generated: "Spreadsheet Generator",
};

interface NotifyRequest {
  userId: string;
  email: string;
  category: string;
  currentUsage: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, category, currentUsage }: NotifyRequest = await req.json();

    console.log(`Checking credit limit for user ${userId}, category: ${category}, usage: ${currentUsage}`);

    // Get user's tier
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = roleData?.role || "free";
    const limit = TIER_LIMITS[category]?.[tier] || 0;

    if (limit === 0 || limit === 999) {
      console.log("No limit or unlimited - skipping notification");
      return new Response(JSON.stringify({ sent: false, reason: "unlimited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usagePercent = (currentUsage / limit) * 100;
    console.log(`Usage percent: ${usagePercent}%, threshold: 80%`);

    // Only notify at exactly 80% to avoid spam
    const threshold80 = Math.floor(limit * 0.8);
    if (currentUsage !== threshold80) {
      console.log(`Current usage (${currentUsage}) != 80% threshold (${threshold80}) - skipping`);
      return new Response(JSON.stringify({ sent: false, reason: "not_at_threshold" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already sent notification today for this category
    const today = new Date().toISOString().split("T")[0];
    const notificationKey = `credit_notify_${userId}_${category}_${today}`;
    
    // Using a simple in-memory check (in production, use a proper cache or db table)
    // For now, we'll just send the notification

    const toolName = TOOL_NAMES[category] || category;
    const remaining = limit - currentUsage;

    console.log(`Sending 80% usage notification to ${email} for ${toolName}`);

    const emailResponse = await resend.emails.send({
      from: "mydocmaker <notifications@resend.dev>",
      to: [email],
      subject: `⚠️ You've used 80% of your ${toolName} credits`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">⚡</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">Credit Alert</h1>
            </div>
            
            <p style="color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              You've used <strong>80%</strong> of your daily <strong>${toolName}</strong> credits.
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>${currentUsage} / ${limit}</strong> credits used today<br>
                <strong>${remaining}</strong> credits remaining
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              ${tier === 'free' 
                ? 'Upgrade to Standard or Premium for higher daily limits and unlock more features!' 
                : tier === 'standard'
                ? 'Upgrade to Premium for even higher limits and priority processing!'
                : 'Your credits will reset at midnight UTC.'}
            </p>
            
            ${tier !== 'premium' ? `
            <a href="https://mydocmaker.com/dashboard/subscription" 
               style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Upgrade Now
            </a>
            ` : ''}
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              This is an automated notification from mydocmaker.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ sent: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-credit-limit:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
