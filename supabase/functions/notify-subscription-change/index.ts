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

type ChangeType = 'upgraded' | 'downgraded' | 'canceled' | 'reactivated' | 'trial_ending';

const getSubscriptionChangeEmail = (
  name: string, 
  changeType: ChangeType, 
  planName: string, 
  endDate?: string
) => {
  const configs = {
    upgraded: {
      headerGradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
      accentColor: '#a7f3d0',
      icon: '🎉',
      title: 'Subscription Upgraded!',
      message: `Congratulations! You've upgraded to the ${planName}. Enjoy all your new premium features!`,
    },
    downgraded: {
      headerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
      accentColor: '#c4b5fd',
      icon: '📋',
      title: 'Plan Changed',
      message: `Your subscription has been changed to the ${planName}. Your new limits will take effect at the start of your next billing cycle.`,
    },
    canceled: {
      headerGradient: 'linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)',
      accentColor: '#cbd5e1',
      icon: '👋',
      title: 'Subscription Canceled',
      message: `We're sorry to see you go. Your subscription will remain active until ${endDate}. You can reactivate anytime before then.`,
    },
    reactivated: {
      headerGradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
      accentColor: '#bae6fd',
      icon: '🎊',
      title: 'Welcome Back!',
      message: `Great news! Your ${planName} has been reactivated. All your premium features are now available again!`,
    },
    trial_ending: {
      headerGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
      accentColor: '#fef3c7',
      icon: '⏰',
      title: 'Trial Ending Soon',
      message: `Your free trial ends on ${endDate}. Upgrade now to keep access to all premium features!`,
    },
  };

  const config = configs[changeType];

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
    .header { background: ${config.headerGradient}; color: white; padding: 48px 40px; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo-accent { color: ${config.accentColor}; }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .tagline { font-size: 18px; font-weight: 600; margin: 0; }
    .content { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .intro { color: #475569; font-size: 16px; margin: 0 0 24px 0; }
    .info-box { background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .info-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 14px; }
    .info-value { color: #0f172a; font-size: 14px; font-weight: 600; }
    .features-box { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .features-title { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; }
    .feature-list { margin: 0; padding: 0; list-style: none; }
    .feature-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 14px; }
    .feature-icon { color: #38bdf8; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); }
    .button-secondary { background: linear-gradient(135deg, #475569 0%, #64748b 100%); box-shadow: 0 4px 14px rgba(71, 85, 105, 0.3); margin-left: 12px; }
    .help-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .help-title { font-size: 14px; font-weight: 700; color: #92400e; margin: 0 0 8px 0; }
    .help-text { font-size: 14px; color: #78350f; margin: 0; }
    .footer { text-align: center; padding: 32px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #64748b; font-size: 13px; margin: 0 0 8px 0; }
    .footer-links { margin-top: 16px; }
    .footer-link { color: #0ea5e9; text-decoration: none; font-size: 13px; margin: 0 12px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px; }
      .header { padding: 32px 24px; }
      .info-row { flex-direction: column; gap: 4px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">${config.icon}</div>
        <div class="logo">MyDoc<span class="logo-accent">Maker</span></div>
        <p class="tagline">${config.title}</p>
      </div>
      <div class="content">
        <h1 class="greeting">Hi ${name || 'there'}!</h1>
        <p class="intro">${config.message}</p>
        
        <div class="info-box">
          <div class="info-title">📋 Subscription Details</div>
          <div class="info-row">
            <span class="info-label">Current Plan</span>
            <span class="info-value">${planName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value">${changeType === 'canceled' ? 'Active until ' + endDate : 'Active'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Changed On</span>
            <span class="info-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        
        ${changeType === 'canceled' || changeType === 'trial_ending' ? `
        <div class="features-box">
          <div class="features-title">Don't miss out on Premium features:</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-icon">✓</span> Unlimited AI document generation</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Priority processing speed</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Advanced voiceover generation</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Premium presentation maker</li>
          </ul>
        </div>
        ` : ''}
        
        <div class="cta-section">
          ${changeType === 'canceled' ? `
            <a href="https://mydocmaker.com/subscription" class="button">Reactivate Plan →</a>
          ` : changeType === 'trial_ending' ? `
            <a href="https://mydocmaker.com/subscription" class="button">Upgrade Now →</a>
          ` : `
            <a href="https://mydocmaker.com/dashboard" class="button">Go to Dashboard →</a>
          `}
        </div>
        
        <div class="help-box">
          <div class="help-title">💬 Need Help?</div>
          <p class="help-text">If you have any questions about your subscription, just reply to this email and our support team will be happy to assist you.</p>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
        <div class="footer-links">
          <a href="https://mydocmaker.com/subscription" class="footer-link">Manage Subscription</a>
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
    const { userId, changeType, planType, endDate } = await req.json();

    console.log(`Sending subscription change email for user ${userId}, type: ${changeType}`);

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("Could not find user email");
    }

    const planNames: Record<string, string> = {
      free: "Free Plan",
      standard: "Standard Plan",
      premium: "Premium Plan",
    };

    const planName = planNames[planType] || planType;
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : undefined;

    const subjectLines: Record<ChangeType, string> = {
      upgraded: `🎉 Welcome to ${planName}!`,
      downgraded: `📋 Your Plan Has Changed`,
      canceled: `👋 We're Sorry to See You Go`,
      reactivated: `🎊 Welcome Back to ${planName}!`,
      trial_ending: `⏰ Your Trial Ends Soon`,
    };

    const html = getSubscriptionChangeEmail(
      profile.full_name || '', 
      changeType as ChangeType, 
      planName, 
      formattedEndDate
    );

    // Send email via send-email function
    const emailResponse = await supabase.functions.invoke("send-email", {
      body: {
        to: profile.email,
        subject: subjectLines[changeType as ChangeType] || 'Subscription Update',
        html,
        type: "subscription_change",
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
    console.error("Error in notify-subscription-change:", error);
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
