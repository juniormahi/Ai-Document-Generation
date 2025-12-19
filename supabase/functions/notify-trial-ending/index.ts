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

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const getTrialEndingEmail = (name: string, daysLeft: number, trialEndDate: string, planType: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Trial is Ending Soon - MyDocMaker</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Your Trial Ends in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Don't lose access to your premium features</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 15px; font-size: 22px; font-weight: 600;">Hi ${name}!</h2>
              <p style="color: #64748b; margin: 0 0 20px; font-size: 15px;">
                Just a friendly reminder that your <strong style="color: #6366f1;">${planType}</strong> trial is ending on <strong>${trialEndDate}</strong>.
              </p>

              <!-- Countdown Box -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; border-left: 4px solid #f59e0b;">
                <div style="font-size: 48px; font-weight: 800; color: #d97706;">${daysLeft}</div>
                <div style="font-size: 14px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Day${daysLeft > 1 ? 's' : ''} Remaining</div>
              </div>

              <!-- What You'll Lose -->
              <h3 style="color: #1e293b; margin: 25px 0 15px; font-size: 16px; font-weight: 600;">🚫 What you'll lose after your trial:</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #ef4444; font-size: 14px; margin-right: 8px;">✗</span>
                    <span style="color: #64748b; font-size: 14px;">Unlimited AI document generation</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #ef4444; font-size: 14px; margin-right: 8px;">✗</span>
                    <span style="color: #64748b; font-size: 14px;">Priority AI processing speed</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #ef4444; font-size: 14px; margin-right: 8px;">✗</span>
                    <span style="color: #64748b; font-size: 14px;">Advanced presentation maker</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #ef4444; font-size: 14px; margin-right: 8px;">✗</span>
                    <span style="color: #64748b; font-size: 14px;">Premium voiceover & image generation</span>
                  </td>
                </tr>
              </table>

              <!-- Keep Benefits -->
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #166534; margin: 0 0 12px; font-size: 14px; font-weight: 600;">✓ Keep all your benefits by continuing!</h4>
                <p style="color: #15803d; margin: 0; font-size: 14px;">
                  Your subscription will automatically continue after the trial. No action needed to keep your premium features!
                </p>
              </div>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://mydocmaker.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); margin-right: 12px;">
                      Continue Using Premium
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Don't Want to Continue -->
              <div style="background: #f8fafc; border-radius: 10px; padding: 16px; text-align: center; margin-top: 20px;">
                <p style="color: #64748b; margin: 0; font-size: 13px;">
                  Don't want to continue? <a href="https://mydocmaker.com/settings" style="color: #6366f1; text-decoration: none;">Cancel your subscription</a> before your trial ends to avoid being charged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0 0 10px; font-size: 13px;">
                Questions? Reply to this email or contact support.
              </p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} MyDocMaker. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking for trials ending in 3 days...");

    // Calculate the date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split('T')[0];

    // Find subscriptions with trials ending on that date
    const { data: trialingSubscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, plan_type, trial_end")
      .eq("status", "trialing")
      .gte("trial_end", `${targetDate}T00:00:00`)
      .lt("trial_end", `${targetDate}T23:59:59`);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${trialingSubscriptions?.length || 0} trials ending in 3 days`);

    const emailsSent = [];

    for (const sub of trialingSubscriptions || []) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", sub.user_id)
          .single();

        if (!profile?.email) {
          console.log(`No email found for user ${sub.user_id}`);
          continue;
        }

        const trialEndDate = new Date(sub.trial_end).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const html = getTrialEndingEmail(
          profile.full_name || profile.email.split('@')[0],
          3,
          trialEndDate,
          sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)
        );

        // Send email via Resend
        if (resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "MyDocMaker <noreply@mydocmaker.com>",
              to: [profile.email],
              subject: "⏰ Your Trial Ends in 3 Days - Don't Lose Your Premium Features!",
              html,
            }),
          });

          if (emailResponse.ok) {
            emailsSent.push(profile.email);
            console.log(`Trial reminder sent to ${profile.email}`);
          } else {
            console.error(`Failed to send to ${profile.email}:`, await emailResponse.text());
          }
        }
      } catch (err) {
        console.error(`Error processing user ${sub.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        recipients: emailsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-trial-ending:", error);
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
