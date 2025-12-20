import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Email templates
const getSubscriptionPurchasedEmail = (planType: string) => `
  <h1>Welcome to ${planType} Plan!</h1>
  <p>Thank you for subscribing. Your subscription is now active.</p>
  <p>You now have access to all ${planType} features.</p>
`;

const getSubscriptionCanceledEmail = () => `
  <h1>Subscription Canceled</h1>
  <p>Your subscription has been canceled. You'll continue to have access until the end of your billing period.</p>
  <p>We're sorry to see you go. If you change your mind, you can resubscribe at any time.</p>
`;

const getPaymentFailedEmail = () => `
  <h1>Payment Failed</h1>
  <p>We were unable to process your payment. Please update your payment method to avoid service interruption.</p>
`;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com',
        to,
        subject,
        html,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function getUserEmail(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .single();
  
  return data?.email || null;
}

// Verify Stripe webhook signature
async function verifyStripeSignature(payload: string, signature: string): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const parts = signature.split(',');
    let timestamp = '';
    let v1Signature = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) {
      console.error('Invalid signature format');
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === v1Signature;
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
    const signature = req.headers.get('stripe-signature');
    const payload = await req.text();

    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyStripeSignature(payload, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    console.log('Received Stripe event:', event.type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const eventType = event.type;
    const data = event.data.object;

    switch (eventType) {
      case 'checkout.session.completed': {
        const customerId = data.customer;
        const subscriptionId = data.subscription;
        const userId = data.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in metadata');
          break;
        }

        // Fetch subscription details from Stripe
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
        });
        const subscription = await subResponse.json();

        const planType = data.metadata?.plan_type || 'standard';
        const billingPeriod = data.metadata?.billing_period || 'monthly';

        // Upsert subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_type: planType,
            billing_period: billingPeriod,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (subError) console.error('Error upserting subscription:', subError);

        // Update user role
        const role = planType === 'premium' ? 'premium' : 'standard';
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: role,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (roleError) console.error('Error updating user role:', roleError);

        // Send welcome email
        const email = await getUserEmail(supabase, userId);
        if (email) {
          await sendEmail(email, `Welcome to ${planType} Plan!`, getSubscriptionPurchasedEmail(planType));
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscriptionId = data.id;
        const status = data.cancel_at_period_end ? 'canceled' : data.status === 'active' ? 'active' : data.status;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: status,
            current_period_start: new Date(data.current_period_start * 1000).toISOString(),
            current_period_end: new Date(data.current_period_end * 1000).toISOString(),
            canceled_at: data.canceled_at ? new Date(data.canceled_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) console.error('Error updating subscription:', error);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscriptionId = data.id;

        // Get user_id from subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subData?.user_id) {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          // Downgrade user role
          await supabase
            .from('user_roles')
            .update({
              role: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subData.user_id);

          // Send cancellation email
          const email = await getUserEmail(supabase, subData.user_id);
          if (email) {
            await sendEmail(email, 'Subscription Canceled', getSubscriptionCanceledEmail());
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = data.customer;
        const subscriptionId = data.subscription;

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subData?.user_id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          const email = await getUserEmail(supabase, subData.user_id);
          if (email) {
            await sendEmail(email, 'Payment Failed', getPaymentFailedEmail());
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const subscriptionId = data.subscription;

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
