import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const resendApiKey = Deno.env.get('RESEND_API_KEY');

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecretKey as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type, stripe-signature',
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

const getTrialEndingEmail = (daysLeft: number, planType: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Your Trial Ends in ${daysLeft} Days</h1>
    </div>
    <div class="content">
      <p>Hi there! Just a friendly reminder that your MyDocMaker ${planType} trial is ending soon.</p>
      
      <div class="highlight">
        <strong>What happens next:</strong><br>
        After your trial ends, your payment method will be charged automatically to continue your ${planType} plan.
        If you don't want to continue, you can cancel anytime before the trial ends.
      </div>
      
      <p>During your trial, you've had access to:</p>
      <ul>
        <li>✓ Unlimited document generation</li>
        <li>✓ AI-powered presentations</li>
        <li>✓ Smart spreadsheets</li>
        <li>✓ Voice generation</li>
      </ul>
      
      <p>Keep all these features by staying subscribed!</p>
      
      <a href="https://mydocmaker.com/settings" class="button">Manage Subscription</a>
      
      <div class="footer">
        <p>Questions? Reply to this email and we'll help you out.</p>
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe signature found in request');
      return new Response(JSON.stringify({ error: 'No signature' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('Webhook event verified:', event.type, event.id);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed:', session.id);
        
        if (!session.subscription) {
          console.log('No subscription in session, skipping');
          break;
        }

        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = session.client_reference_id || session.metadata?.user_id;

        if (!userId) {
          console.error('No user ID found in session');
          break;
        }

        console.log('Upserting subscription for user:', userId);
        const planType = session.metadata?.plan_type || 'standard';
        const isTrialing = subscription.status === 'trialing';
        
        // Upsert subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_type: planType,
            status: isTrialing ? 'trialing' : 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          }, {
            onConflict: 'user_id'
          });

        if (subError) {
          console.error('Error upserting subscription:', subError);
        } else {
          console.log('Subscription upserted successfully');
        }

        // Update user role to premium
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'premium',
          }, {
            onConflict: 'user_id'
          });

        if (roleError) {
          console.error('Error updating user role:', roleError);
        } else {
          console.log('User role updated to premium');
        }

        // Send subscription purchased email
        const userEmail = session.customer_email || await getUserEmail(userId);
        if (userEmail) {
          await sendEmail(
            userEmail,
            `Welcome to MyDocMaker ${planType.charAt(0).toUpperCase() + planType.slice(1)}! 🎉`,
            getSubscriptionPurchasedEmail(planType, session.amount_total || 0, isTrialing)
          );
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription.updated:', subscription.id, 'Status:', subscription.status);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status as any,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('Subscription updated successfully');
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription.deleted:', subscription.id);
        
        // Get user_id and email from subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type, current_period_end')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        // Update subscription status
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

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
          } else {
            console.log('User role downgraded to free');
          }

          // Send cancellation email
          const userEmail = await getUserEmail(subData.user_id);
          if (userEmail) {
            const endDate = subData.current_period_end 
              ? new Date(subData.current_period_end).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })
              : 'the end of your billing period';
            
            await sendEmail(
              userEmail,
              'Your MyDocMaker Subscription Has Been Canceled',
              getSubscriptionCanceledEmail(subData.plan_type || 'premium', endDate)
            );
          }
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        // Update subscription status to active if it was past_due
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', invoice.subscription as string)
            .eq('status', 'past_due');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        
        if (invoice.subscription) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('Error updating subscription to past_due:', error);
          }

          // Send payment failed email
          if (invoice.customer_email) {
            await sendEmail(
              invoice.customer_email,
              '⚠️ Payment Failed - Action Required',
              getPaymentFailedEmail()
            );
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Trial ending soon for subscription:', subscription.id);
        
        // Get user info
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subData?.user_id) {
          const userEmail = await getUserEmail(subData.user_id);
          if (userEmail && subscription.trial_end) {
            const daysLeft = Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
            await sendEmail(
              userEmail,
              `⏰ Your MyDocMaker Trial Ends in ${daysLeft} Days`,
              getTrialEndingEmail(daysLeft, subData.plan_type || 'premium')
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});