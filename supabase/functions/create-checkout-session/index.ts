import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyFirebaseToken } from "../_shared/auth.ts";

const lemonSqueezyApiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

// LemonSqueezy product/variant IDs - replace these with your actual IDs from LemonSqueezy
const PRODUCT_VARIANTS = {
  standard: {
    monthly: '123456', // Replace with actual variant ID
    annually: '123457', // Replace with actual variant ID
  },
  premium: {
    monthly: '123458', // Replace with actual variant ID
    annually: '123459', // Replace with actual variant ID
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!lemonSqueezyApiKey) {
      throw new Error('LemonSqueezy is not configured. Please add LEMONSQUEEZY_API_KEY.');
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
    console.log('Creating LemonSqueezy checkout for user:', userId);

    const { planType, billingPeriod } = await req.json();
    console.log('Creating checkout session:', { planType, billingPeriod, userId });

    if (!planType || !billingPeriod) {
      throw new Error('Missing required fields: planType and billingPeriod');
    }

    // Get the variant ID
    const variants = PRODUCT_VARIANTS[planType as keyof typeof PRODUCT_VARIANTS];
    if (!variants) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const variantId = variants[billingPeriod as 'monthly' | 'annually'];
    if (!variantId) {
      throw new Error(`Invalid billing period: ${billingPeriod}`);
    }

    const origin = req.headers.get('origin') || 'https://mydocmaker.com';

    // Create LemonSqueezy checkout
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lemonSqueezyApiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: userEmail,
              custom: {
                user_id: userId,
                plan_type: planType,
                billing_period: billingPeriod,
              },
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true,
              desc: true,
              discount: true,
              subscription_preview: true,
            },
            product_options: {
              enabled_variants: [parseInt(variantId)],
              redirect_url: `${origin}/dashboard?success=true`,
              receipt_link_url: `${origin}/dashboard`,
              receipt_button_text: 'Go to Dashboard',
              receipt_thank_you_note: 'Thank you for subscribing to MyDocMaker!',
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: '12345', // Replace with your LemonSqueezy store ID
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LemonSqueezy API error:', errorData);
      throw new Error('Failed to create checkout session');
    }

    const checkoutData = await response.json();
    const checkoutUrl = checkoutData.data?.attributes?.url;

    if (!checkoutUrl) {
      throw new Error('No checkout URL returned');
    }

    console.log('LemonSqueezy checkout created:', checkoutData.data?.id);

    return new Response(
      JSON.stringify({ url: checkoutUrl, sessionId: checkoutData.data?.id }),
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
