import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

interface LoginNotificationRequest {
  email: string;
  name?: string;
  loginMethod?: string;
  ipAddress?: string;
  userAgent?: string;
}

const getLoginNotificationEmail = (name: string, loginMethod: string, loginTime: string, deviceInfo: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a2e; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { background-color: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); color: white; padding: 40px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .logo-accent { color: #38bdf8; }
    .icon-circle { width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
    .content { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .intro { color: #475569; font-size: 16px; margin: 0 0 24px 0; }
    .login-details { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(16, 185, 129, 0.2); }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #166534; font-weight: 600; font-size: 14px; }
    .detail-value { color: #15803d; font-size: 14px; text-align: right; }
    .security-notice { background: #fef3c7; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .security-title { font-size: 14px; font-weight: 700; color: #92400e; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; }
    .security-text { font-size: 14px; color: #78350f; margin: 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); }
    .button-secondary { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); margin-left: 12px; }
    .footer { text-align: center; padding: 32px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #64748b; font-size: 13px; margin: 0 0 8px 0; }
    .footer-links { margin-top: 16px; }
    .footer-link { color: #0ea5e9; text-decoration: none; font-size: 13px; margin: 0 12px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px; }
      .header { padding: 32px 24px; }
      .detail-row { flex-direction: column; gap: 4px; }
      .detail-value { text-align: left; }
      .cta-section .button { display: block; margin: 8px 0; }
      .button-secondary { margin-left: 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">MyDoc<span class="logo-accent">Maker</span></div>
        <div class="icon-circle">✓</div>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">Login Notification</p>
      </div>
      <div class="content">
        <h1 class="greeting">Hi ${name || 'there'},</h1>
        <p class="intro">We noticed a new sign-in to your MyDocMaker account. Here are the details:</p>
        
        <div class="login-details">
          <div class="detail-row">
            <span class="detail-label">📅 Date & Time</span>
            <span class="detail-value">${loginTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🔐 Login Method</span>
            <span class="detail-value">${loginMethod}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💻 Device</span>
            <span class="detail-value">${deviceInfo}</span>
          </div>
        </div>
        
        <div class="security-notice">
          <div class="security-title">🛡️ Security Notice</div>
          <p class="security-text">If this was you, no action is needed. If you didn't sign in, please secure your account immediately by changing your password.</p>
        </div>
        
        <div class="cta-section">
          <a href="https://mydocmaker.com/dashboard" class="button">Go to Dashboard</a>
          <a href="https://mydocmaker.com/settings" class="button button-secondary">Security Settings</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">This is an automated security notification from MyDocMaker.</p>
        <p class="footer-text">© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
        <div class="footer-links">
          <a href="https://mydocmaker.com/privacy" class="footer-link">Privacy Policy</a>
          <a href="https://mydocmaker.com/terms" class="footer-link">Terms of Service</a>
          <a href="https://mydocmaker.com/help" class="footer-link">Help Center</a>
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
    const { email, name, loginMethod, userAgent }: LoginNotificationRequest = await req.json();

    console.log("Sending login notification to:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const loginTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Parse user agent for device info
    let deviceInfo = "Unknown Device";
    if (userAgent) {
      if (userAgent.includes("Mobile")) deviceInfo = "Mobile Device";
      else if (userAgent.includes("Windows")) deviceInfo = "Windows PC";
      else if (userAgent.includes("Mac")) deviceInfo = "Mac";
      else if (userAgent.includes("Linux")) deviceInfo = "Linux";
      else deviceInfo = "Web Browser";
    }

    const method = loginMethod || "Email & Password";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MyDocMaker <onboarding@resend.dev>",
        to: [email],
        subject: "🔐 New Sign-in to Your MyDocMaker Account",
        html: getLoginNotificationEmail(name || "", method, loginTime, deviceInfo),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Login notification sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending login notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
