import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET');
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type, x-signature',
};

// Email templates
const getSubscriptionPurchasedEmail = (planType: string, amount: number, isTrialing: boolean) => {
  const isPremium = planType === 'premium';
  const features = isPremium 
    ? [
        '500 generation credits per month',
        'Max Intelligence AI (Gemini 3 & Nano Banana)',
        '10,000 words per file',
        'API access',
        'Dedicated support',
        'Premium documents'
      ]
    : [
        '250 generation credits per month',
        'Unlimited other tools',
        'Unlimited AI chat',
        'Access to Gemini 3',
        '5,000 words per file',
        'Priority support'
      ];

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to MyDocMaker ${planType.charAt(0).toUpperCase() + planType.slice(1)}!</h1>
    </div>
    <div class="content">
      <p>Thank you for subscribing to MyDocMaker! Your ${planType} plan is now active.</p>
      
      <div class="highlight">
        <strong>Plan Details:</strong><br>
        • Plan: ${planType.charAt(0).toUpperCase() + planType.slice(1)}<br>
        • Amount: $${(amount / 100).toFixed(2)}/month<br>
        ${isTrialing ? '• Status: 7-day free trial active' : '• Status: Active'}
      </div>
      
      <p>With your new plan, you now have access to:</p>
      <ul>
        ${features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      
      <a href="https://mydocmaker.com/dashboard" class="button">Go to Dashboard</a>
      
      <div class="footer">
        <p>If you have any questions, reply to this email or contact support.</p>
        <p>© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

const getSubscriptionCanceledEmail = (planType: string, endDate: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Canceled</h1>
    </div>
    <div class="content">
      <p>We're sorry to see you go! Your MyDocMaker ${planType} subscription has been canceled.</p>
      
      <div class="highlight">
        <strong>Important:</strong><br>
        You'll continue to have access to premium features until <strong>${endDate}</strong>.
        After that date, your account will be downgraded to the free plan.
      </div>
      
      <p>Things you might miss:</p>
      <ul>
        <li>Unlimited document generation</li>
        <li>AI-powered content creation</li>
        <li>Advanced export options</li>
        <li>Priority support</li>
      </ul>
      
      <p>Changed your mind? You can reactivate your subscription anytime before it expires.</p>
      
      <a href="https://mydocmaker.com/settings" class="button">Reactivate Subscription</a>
      
      <div class="footer">
        <p>We'd love to hear your feedback. Reply to this email to let us know how we can improve.</p>
        <p>© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const getPaymentFailedEmail = () => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Payment Failed</h1>
    </div>
    <div class="content">
      <p>We were unable to process your payment for your MyDocMaker subscription.</p>
      
      <div class="highlight">
        <strong>Action Required:</strong><br>
        Please update your payment method to continue using premium features.
        Your subscription will be suspended if payment isn't received within 7 days.
      </div>
      
      <p>Common reasons for payment failure:</p>
      <ul>
        <li>Expired credit card</li>
        <li>Insufficient funds</li>
        <li>Card declined by bank</li>
      </ul>
      
      <a href="https://mydocmaker.com/settings" class="button">Update Payment Method</a>
      
      <div class="footer">
        <p>Need help? Reply to this email and we'll assist you.</p>
        <p>© ${new Date().getFullYear()} MyDocMaker. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Helper to send email via Resend API
async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) {
    console.log('Resend API key not configured, skipping email to:', to);
    return;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MyDocMaker <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return;
    }
    
    const result = await response.json();
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Helper to get user email from user_id
async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .single();
  return data?.email || null;
}

// Verify LemonSqueezy webhook signature
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  if (!webhookSecret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    return false;
  }
  
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(webhookSecret);
    const data = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-signature');
    if (!signature) {
      console.error('No signature found in request');
      return new Response(JSON.stringify({ error: 'No signature' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    
    // Verify signature
    const isValid = await verifySignature(body, signature);
    if (!isValid) {
      console.error('Webhook signature verification failed');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const event = JSON.parse(body);
    const eventName = event.meta?.event_name;
    const data = event.data;
    
    console.log('LemonSqueezy webhook event:', eventName);

    switch (eventName) {
      case 'order_created': {
        console.log('Processing order_created');
        const customData = data.attributes?.custom_data || {};
        const userId = customData.user_id;
        const planType = customData.plan_type || 'standard';
        const billingPeriod = customData.billing_period || 'monthly';
        
        if (!userId) {
          console.error('No user ID found in order');
          break;
        }

        const customerId = data.attributes?.customer_id?.toString() || '';
        const amount = data.attributes?.total || 0;

        // Upsert subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: `ls_${customerId}`, // Prefix with ls_ for LemonSqueezy
            plan_type: planType,
            billing_period: billingPeriod,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          }, {
            onConflict: 'user_id'
          });

        if (subError) {
          console.error('Error upserting subscription:', subError);
        }

        // Update user role to premium
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: planType === 'premium' ? 'premium' : 'standard',
          }, {
            onConflict: 'user_id'
          });

        if (roleError) {
          console.error('Error updating user role:', roleError);
        }

        // Send welcome email
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          await sendEmail(
            userEmail,
            `Welcome to MyDocMaker ${planType.charAt(0).toUpperCase() + planType.slice(1)}!`,
            getSubscriptionPurchasedEmail(planType, amount, false)
          );
        }

        console.log('Order processed successfully for user:', userId);
        break;
      }

      case 'subscription_created': {
        console.log('Processing subscription_created');
        const customData = data.attributes?.custom_data || {};
        const userId = customData.user_id;
        const planType = customData.plan_type || 'standard';
        const billingPeriod = customData.billing_period || 'monthly';
        
        if (!userId) {
          console.error('No user ID found in subscription');
          break;
        }

        const subscriptionId = data.id?.toString() || '';
        const customerId = data.attributes?.customer_id?.toString() || '';
        const status = data.attributes?.status || 'active';
        const renewsAt = data.attributes?.renews_at;
        const trialEndsAt = data.attributes?.trial_ends_at;

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: `ls_${customerId}`,
            stripe_subscription_id: `ls_${subscriptionId}`,
            plan_type: planType,
            billing_period: billingPeriod,
            status: status === 'on_trial' ? 'trialing' : 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: renewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_end: trialEndsAt || null,
          }, {
            onConflict: 'user_id'
          });

        if (subError) {
          console.error('Error upserting subscription:', subError);
        }

        // Update user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: planType === 'premium' ? 'premium' : 'standard',
          }, {
            onConflict: 'user_id'
          });

        if (roleError) {
          console.error('Error updating user role:', roleError);
        }

        console.log('Subscription created for user:', userId);
        break;
      }

      case 'subscription_updated': {
        console.log('Processing subscription_updated');
        const subscriptionId = `ls_${data.id}`;
        const status = data.attributes?.status;
        const renewsAt = data.attributes?.renews_at;
        const endsAt = data.attributes?.ends_at;

        let dbStatus = 'active';
        if (status === 'on_trial') dbStatus = 'trialing';
        else if (status === 'cancelled' || status === 'expired') dbStatus = 'canceled';
        else if (status === 'past_due') dbStatus = 'past_due';

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: dbStatus,
            current_period_end: renewsAt || endsAt,
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription:', error);
        }

        console.log('Subscription updated:', subscriptionId);
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        console.log('Processing subscription cancellation/expiration');
        const subscriptionId = `ls_${data.id}`;
        
        // Get user info before updating
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type, current_period_end')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription:', error);
        }

        // Downgrade user to free
        if (subData?.user_id) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: 'free' })
            .eq('user_id', subData.user_id);

          if (roleError) {
            console.error('Error downgrading user role:', roleError);
          }

          // Send cancellation email
          const userEmail = await getUserEmail(subData.user_id);
          if (userEmail) {
            const endDate = subData.current_period_end 
              ? new Date(subData.current_period_end).toLocaleDateString()
              : 'soon';
            await sendEmail(
              userEmail,
              'Your MyDocMaker Subscription Has Been Canceled',
              getSubscriptionCanceledEmail(subData.plan_type, endDate)
            );
          }
        }

        console.log('Subscription canceled:', subscriptionId);
        break;
      }

      case 'subscription_payment_failed': {
        console.log('Processing payment failed');
        const subscriptionId = `ls_${data.id}`;

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        // Update status to past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        // Send payment failed email
        if (subData?.user_id) {
          const userEmail = await getUserEmail(subData.user_id);
          if (userEmail) {
            await sendEmail(
              userEmail,
              'Action Required: Payment Failed for MyDocMaker',
              getPaymentFailedEmail()
            );
          }
        }

        console.log('Payment failed processed');
        break;
      }

      case 'subscription_payment_success':
      case 'subscription_payment_recovered': {
        console.log('Processing payment success/recovery');
        const subscriptionId = `ls_${data.id}`;

        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('Payment recovered, subscription reactivated');
        break;
      }

      case 'subscription_resumed':
      case 'subscription_unpaused': {
        console.log('Processing subscription resume/unpause');
        const subscriptionId = `ls_${data.id}`;

        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            canceled_at: null 
          })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('Subscription resumed');
        break;
      }

      case 'subscription_paused': {
        console.log('Processing subscription pause');
        const subscriptionId = `ls_${data.id}`;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('Subscription paused');
        break;
      }

      case 'order_refunded': {
        console.log('Processing refund');
        // Handle refund - typically downgrade user
        const customData = data.attributes?.custom_data || {};
        const userId = customData.user_id;

        if (userId) {
          await supabase
            .from('user_roles')
            .update({ role: 'free' })
            .eq('user_id', userId);

          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('user_id', userId);
        }

        console.log('Refund processed');
        break;
      }

      default:
        console.log('Unhandled event type:', eventName);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
