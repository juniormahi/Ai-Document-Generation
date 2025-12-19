import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyFirebaseToken } from "../_shared/auth.ts";

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

const getWelcomeEmail = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a2e; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { background-color: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); color: white; padding: 48px 40px; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo-accent { color: #38bdf8; }
    .tagline { font-size: 14px; opacity: 0.85; margin: 0; }
    .content { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .intro { color: #475569; font-size: 16px; margin: 0 0 24px 0; }
    .credits-box { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; }
    .credits-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .credits-grid { display: flex; justify-content: space-around; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
    .credit-item { text-align: center; }
    .credit-number { font-size: 28px; font-weight: 800; color: #38bdf8; }
    .credit-label { font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; }
    .features-box { background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .features-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .feature-list { margin: 0; padding: 0; list-style: none; }
    .feature-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #334155; font-size: 15px; }
    .feature-icon { width: 20px; height: 20px; background: #38bdf8; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); transition: transform 0.2s; }
    .pro-tip { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .pro-tip-title { font-size: 14px; font-weight: 700; color: #92400e; margin: 0 0 8px 0; }
    .pro-tip-text { font-size: 14px; color: #78350f; margin: 0; }
    .footer { text-align: center; padding: 32px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #64748b; font-size: 13px; margin: 0 0 8px 0; }
    .footer-links { margin-top: 16px; }
    .footer-link { color: #0ea5e9; text-decoration: none; font-size: 13px; margin: 0 12px; }
    .social-links { margin-top: 20px; }
    .social-link { display: inline-block; margin: 0 8px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px; }
      .header { padding: 32px 24px; }
      .credits-grid { flex-direction: column; gap: 12px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">MyDoc<span class="logo-accent">Maker</span></div>
        <p class="tagline">AI-Powered Document Creation Platform</p>
      </div>
      <div class="content">
        <h1 class="greeting">Welcome aboard, ${name || 'Creator'}! 🎉</h1>
        <p class="intro">We're thrilled to have you join MyDocMaker! You now have access to our powerful AI tools that will transform how you create documents, presentations, and more.</p>
        
        <div class="credits-box">
          <div class="credits-title">🎁 Your Free Monthly Credits</div>
          <div class="credits-grid">
            <div class="credit-item">
              <div class="credit-number">25</div>
              <div class="credit-label">Documents</div>
            </div>
            <div class="credit-item">
              <div class="credit-number">50</div>
              <div class="credit-label">Voice Credits</div>
            </div>
            <div class="credit-item">
              <div class="credit-number">150</div>
              <div class="credit-label">Tool Credits</div>
            </div>
          </div>
        </div>
        
        <div class="features-box">
          <div class="features-title">What you can create:</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-icon">✓</span> Professional documents & reports</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Stunning presentations</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Smart spreadsheets with AI</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Natural AI voiceovers</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Chat with your PDFs</li>
          </ul>
        </div>
        
        <div class="cta-section">
          <a href="https://mydocmaker.com/dashboard" class="button">Start Creating →</a>
        </div>
        
        <div class="pro-tip">
          <div class="pro-tip-title">💡 Pro Tip</div>
          <p class="pro-tip-text">Upgrade to <strong>Standard ($9/mo)</strong> or <strong>Premium ($12/mo)</strong> for unlimited access, higher word limits, and advanced AI models!</p>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">Questions? Just reply to this email — we're here to help!</p>
        <p class="footer-text">© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
        <div class="footer-links">
          <a href="https://mydocmaker.com/privacy" class="footer-link">Privacy Policy</a>
          <a href="https://mydocmaker.com/terms" class="footer-link">Terms of Service</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Firebase token (prefer x-firebase-token; fallback to legacy headers)
    const firebaseTokenHeader = req.headers.get("x-firebase-token");

    const clientInfo = req.headers.get("x-client-info") ?? "";
    const firebaseTokenFromClientInfo = clientInfo.startsWith("firebase:")
      ? clientInfo.slice("firebase:".length)
      : null;

    const authHeader = req.headers.get('Authorization');
    const tokenResult = await verifyFirebaseToken(firebaseTokenHeader ?? firebaseTokenFromClientInfo ?? authHeader);

    if (!tokenResult) {
      throw new Error('User not authenticated');
    }

    const userId = tokenResult.userId;
    const userEmail = tokenResult.email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const userName = profile?.full_name || '';

    // Send welcome email
    if (!resendApiKey) {
      console.log('Resend API key not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped - no API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MyDocMaker <onboarding@resend.dev>',
        to: [userEmail],
        subject: 'Welcome to MyDocMaker! 🎉 Your AI Document Assistant',
        html: getWelcomeEmail(userName),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    console.log('Welcome email sent:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
