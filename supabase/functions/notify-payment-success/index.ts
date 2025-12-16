import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const getPaymentSuccessEmail = (name: string, planName: string, period: string, amount: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a2e; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { background-color: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); color: white; padding: 48px 40px; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo-accent { color: #a7f3d0; }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .tagline { font-size: 18px; font-weight: 600; margin: 0; }
    .content { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .intro { color: #475569; font-size: 16px; margin: 0 0 24px 0; }
    .receipt-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bbf7d0; }
    .receipt-title { font-size: 14px; font-weight: 700; color: #166534; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0; }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-label { color: #166534; font-size: 14px; }
    .receipt-value { color: #0f172a; font-size: 14px; font-weight: 600; }
    .total-row { margin-top: 12px; padding-top: 12px; border-top: 2px solid #166534; }
    .total-value { font-size: 20px; color: #059669; font-weight: 800; }
    .features-box { background: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .features-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .feature-list { margin: 0; padding: 0; list-style: none; }
    .feature-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #334155; font-size: 15px; }
    .feature-icon { width: 24px; height: 24px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white !important; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
    .footer { text-align: center; padding: 32px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #64748b; font-size: 13px; margin: 0 0 8px 0; }
    .footer-links { margin-top: 16px; }
    .footer-link { color: #059669; text-decoration: none; font-size: 13px; margin: 0 12px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px; }
      .header { padding: 32px 24px; }
      .receipt-row { flex-direction: column; gap: 4px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">✓</div>
        <div class="logo">MyDoc<span class="logo-accent">Maker</span></div>
        <p class="tagline">Payment Successful!</p>
      </div>
      <div class="content">
        <h1 class="greeting">Thank you, ${name || 'Valued Customer'}! 🎉</h1>
        <p class="intro">Your payment has been processed successfully. Welcome to the ${planName} plan — you now have access to all premium features!</p>
        
        <div class="receipt-box">
          <div class="receipt-title">📄 Payment Receipt</div>
          <div class="receipt-row">
            <span class="receipt-label">Plan</span>
            <span class="receipt-value">${planName}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Billing Cycle</span>
            <span class="receipt-value">${period}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Date</span>
            <span class="receipt-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="receipt-row total-row">
            <span class="receipt-label">Amount Paid</span>
            <span class="total-value">${amount}</span>
          </div>
        </div>
        
        <div class="features-box">
          <div class="features-title">🚀 Your Premium Benefits</div>
          <ul class="feature-list">
            <li class="feature-item"><span class="feature-icon">✓</span> Unlimited AI document generation</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Priority AI processing speed</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Advanced presentation maker</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Premium voiceover generation</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Unlimited chat with PDFs</li>
            <li class="feature-item"><span class="feature-icon">✓</span> Advanced spreadsheet tools</li>
          </ul>
        </div>
        
        <div class="cta-section">
          <a href="https://mydocmaker.com/dashboard" class="button">Go to Dashboard →</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">Questions about your subscription? Just reply to this email!</p>
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, planType, amount, billingPeriod } = await req.json();

    console.log(`Sending payment success email for user ${userId}`);

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("Could not find user email");
    }

    const planName = planType === "premium" ? "Premium Plan" : "Standard Plan";
    const period = billingPeriod === "yearly" ? "Annual" : "Monthly";
    const formattedAmount = `$${(amount / 100).toFixed(2)}`;

    const html = getPaymentSuccessEmail(profile.full_name || '', planName, period, formattedAmount);

    // Send email via send-email function
    const emailResponse = await supabase.functions.invoke("send-email", {
      body: {
        to: profile.email,
        subject: `✓ Payment Confirmed - Welcome to ${planName}!`,
        html,
        type: "payment_success",
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
    console.error("Error in notify-payment-success:", error);
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
