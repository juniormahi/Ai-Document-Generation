import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { verifyFirebaseToken } from "../_shared/auth.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecretKey as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY.');
    }

    // Verify Firebase token (prefer x-firebase-token; fallback to legacy headers)
    const firebaseTokenHeader = req.headers.get("x-firebase-token");

    const clientInfo = req.headers.get("x-client-info") ?? "";
    const firebaseTokenFromClientInfo = clientInfo.startsWith("firebase:")
      ? clientInfo.slice("firebase:".length)
      : null;

    const authHeader = req.headers.get('Authorization');
    const tokenResult = await verifyFirebaseToken(firebaseTokenHeader ?? firebaseTokenFromClientInfo ?? authHeader);

    if (!tokenResult) {
      console.error('Firebase authentication failed');
      throw new Error('User not authenticated');
    }

    const userId = tokenResult.userId;
    const userEmail = tokenResult.email;
    console.log('Creating checkout for Firebase user:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { planType, billingPeriod } = await req.json();
    console.log('Creating checkout session:', { planType, billingPeriod, userId });

    if (!planType || !billingPeriod) {
      throw new Error('Missing required fields: planType and billingPeriod');
    }

    // Define pricing (in cents)
    const prices: Record<string, Record<string, number>> = {
      standard: {
        monthly: 900,
        annually: 8400,
      },
      premium: {
        monthly: 1200,
        annually: 12000,
      },
    };

    const planPrices = prices[planType as keyof typeof prices];
    if (!planPrices) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const amount = planPrices[billingPeriod as 'monthly' | 'annually'];
    if (!amount) {
      throw new Error(`Invalid billing period: ${billingPeriod}`);
    }

    // Get or create customer
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log('Found existing Stripe customer:', customerId);
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
        console.log('Created new Stripe customer:', customerId);
      }
    }

    const idempotencyKey = `checkout_${userId}_${planType}_${billingPeriod}_${Date.now()}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MyDocMaker ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
              description: `${billingPeriod === 'monthly' ? 'Monthly' : 'Annual'} subscription`,
            },
            unit_amount: amount,
            recurring: {
              interval: billingPeriod === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/dashboard/subscription?canceled=true`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: userId, plan_type: planType, billing_period: billingPeriod },
      },
      metadata: { user_id: userId, plan_type: planType, billing_period: billingPeriod },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    }, { idempotencyKey });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
