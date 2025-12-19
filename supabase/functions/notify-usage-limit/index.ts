import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const getUsageLimitEmail = (name: string, usageType: string, currentUsage: number, limit: number) => {
  const percentage = Math.min(Math.round((currentUsage / limit) * 100), 100);
  const isAtLimit = currentUsage >= limit;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a2e; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { background-color: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, ${isAtLimit ? '#dc2626 0%, #ef4444 50%, #f87171 100%' : '#d97706 0%, #f59e0b 50%, #fbbf24 100%'}); color: white; padding: 48px 40px; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo-accent { color: ${isAtLimit ? '#fecaca' : '#fef3c7'}; }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .tagline { font-size: 18px; font-weight: 600; margin: 0; }
    .content { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .intro { color: #475569; font-size: 16px; margin: 0 0 24px 0; }
    .usage-box { background: ${isAtLimit ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'}; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid ${isAtLimit ? '#fecaca' : '#fed7aa'}; }
    .usage-title { font-size: 14px; font-weight: 700; color: ${isAtLimit ? '#991b1b' : '#92400e'}; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .usage-type { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .progress-container { background: ${isAtLimit ? '#fecaca' : '#fed7aa'}; height: 24px; border-radius: 12px; overflow: hidden; margin: 16px 0; }
    .progress-bar { background: linear-gradient(90deg, ${isAtLimit ? '#dc2626 0%, #ef4444 100%' : '#d97706 0%, #f59e0b 100%'}); height: 100%; border-radius: 12px; transition: width 0.3s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; }
    .progress-text { color: white; font-size: 12px; font-weight: 700; }
    .usage-stats { display: flex; justify-content: space-between; color: ${isAtLimit ? '#991b1b' : '#92400e'}; font-size: 14px; font-weight: 600; }
    .upgrade-box { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .upgrade-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
    .upgrade-text { font-size: 14px; opacity: 0.9; margin: 0 0 16px 0; }
    .benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .benefit-item { font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .benefit-icon { color: #38bdf8; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); }
    .footer { text-align: center; padding: 32px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #64748b; font-size: 13px; margin: 0 0 8px 0; }
    .footer-links { margin-top: 16px; }
    .footer-link { color: #0ea5e9; text-decoration: none; font-size: 13px; margin: 0 12px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px; }
      .header { padding: 32px 24px; }
      .benefits-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">${isAtLimit ? '🚫' : '⚠️'}</div>
        <div class="logo">MyDoc<span class="logo-accent">Maker</span></div>
        <p class="tagline">${isAtLimit ? 'Daily Limit Reached' : 'Usage Warning'}</p>
      </div>
      <div class="content">
        <h1 class="greeting">Hi ${name || 'there'}!</h1>
        <p class="intro">${isAtLimit 
          ? `You've reached your daily limit for ${usageType}. Your limits will reset tomorrow, or you can upgrade now for unlimited access.`
          : `You're approaching your daily limit for ${usageType}. Consider upgrading to avoid interruption.`
        }</p>
        
        <div class="usage-box">
          <div class="usage-title">📊 Current Usage</div>
          <div class="usage-type">${usageType}</div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percentage}%">
              <span class="progress-text">${percentage}%</span>
            </div>
          </div>
          <div class="usage-stats">
            <span>${currentUsage} used</span>
            <span>${limit} limit</span>
          </div>
        </div>
        
        <div class="upgrade-box">
          <div class="upgrade-title">🚀 Upgrade to Premium</div>
          <p class="upgrade-text">Get unlimited access to all features and never worry about limits again!</p>
          <div class="benefits-grid">
            <div class="benefit-item"><span class="benefit-icon">✓</span> Unlimited documents</div>
            <div class="benefit-item"><span class="benefit-icon">✓</span> Unlimited voiceovers</div>
            <div class="benefit-item"><span class="benefit-icon">✓</span> Priority processing</div>
            <div class="benefit-item"><span class="benefit-icon">✓</span> Advanced AI models</div>
          </div>
        </div>
        
        <div class="cta-section">
          <a href="https://mydocmaker.com/subscription" class="button">Upgrade Now →</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">Limits reset daily at midnight UTC</p>
        <p class="footer-text">© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
        <div class="footer-links">
          <a href="https://mydocmaker.com/subscription" class="footer-link">View Plans</a>
          <a href="https://mydocmaker.com/privacy" class="footer-link">Privacy Policy</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, usageType, currentUsage, limit } = await req.json();

    console.log(`Sending usage limit warning for user ${userId}, type: ${usageType}`);

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("Could not find user email");
    }

    const usageTypeLabels: Record<string, string> = {
      documents: "Document Generations",
      chat: "Chat Messages",
      presentations: "Presentations",
      spreadsheets: "Spreadsheets",
      voiceovers: "Voiceovers",
      images: "Image Generations",
    };

    const usageTypeLabel = usageTypeLabels[usageType] || usageType;
    const isAtLimit = currentUsage >= limit;

    const html = getUsageLimitEmail(profile.full_name || '', usageTypeLabel, currentUsage, limit);

    // Send email via send-email function
    const emailResponse = await supabase.functions.invoke("send-email", {
      body: {
        to: profile.email,
        subject: isAtLimit 
          ? `🚫 Daily Limit Reached - ${usageTypeLabel}`
          : `⚠️ Approaching Limit - ${usageTypeLabel}`,
        html,
        type: "usage_warning",
        internalKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      },
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-usage-limit:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
