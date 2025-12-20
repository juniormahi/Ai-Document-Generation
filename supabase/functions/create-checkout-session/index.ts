import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

// Price IDs - replace these with your actual Stripe price IDs
const PRICE_IDS: Record<string, Record<string, string>> = {
  standard: {
    monthly: 'price_standard_monthly', // Replace with actual Stripe price ID
    annually: 'price_standard_annual',  // Replace with actual Stripe price ID
  },
  premium: {
    monthly: 'price_premium_monthly',   // Replace with actual Stripe price ID
    annually: 'price_premium_annual',   // Replace with actual Stripe price ID
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY.');
    }

    // Verify Firebase token
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
    console.log('Creating Stripe checkout for user:', userId);

    const { planType, billingPeriod } = await req.json();
    console.log('Creating checkout session:', { planType, billingPeriod, userId });

    if (!planType || !billingPeriod) {
      throw new Error('Missing required fields: planType and billingPeriod');
    }

    const priceId = PRICE_IDS[planType]?.[billingPeriod];
    if (!priceId) {
      throw new Error(`Invalid plan configuration: ${planType}/${billingPeriod}`);
    }

    const origin = req.headers.get('origin') || 'https://mydocmaker.com';

    // Create Stripe checkout session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': `${origin}/subscription?success=true`,
        'cancel_url': `${origin}/subscription?canceled=true`,
        'metadata[user_id]': userId,
        'metadata[plan_type]': planType,
        'metadata[billing_period]': billingPeriod,
        'customer_email': userEmail || '',
        'subscription_data[trial_period_days]': '7',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe error:', errorData);
      throw new Error('Failed to create checkout session');
    }

    const session = await response.json();
    console.log('Stripe checkout created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
