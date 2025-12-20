import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-firebase-token, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);

    if (auth.error) {
      return unauthorizedResponse(corsHeaders, auth.error);
    }

    const userId = auth.userId;
    console.log('Managing subscription for user:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw new Error('Failed to fetch subscription');
    }

    if (!subscription) {
      throw new Error('No subscription found');
    }

    const subscriptionId = subscription.stripe_subscription_id;

    switch (action) {
      case 'cancel': {
        // Cancel at period end via Stripe API
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'cancel_at_period_end': 'true',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Stripe cancel error:', error);
          throw new Error('Failed to cancel subscription');
        }

        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString() 
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ success: true, message: 'Subscription will cancel at period end' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'reactivate': {
        // Remove cancellation via Stripe API
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'cancel_at_period_end': 'false',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Stripe reactivate error:', error);
          throw new Error('Failed to reactivate subscription');
        }

        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            canceled_at: null 
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ success: true, message: 'Subscription reactivated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'portal': {
        const customerId = subscription.stripe_customer_id;
        const origin = req.headers.get('origin') || 'https://mydocmaker.com';

        // Create billing portal session
        const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'customer': customerId,
            'return_url': `${origin}/subscription`,
          }),
        });

        if (response.ok) {
          const session = await response.json();
          return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Fallback: redirect to subscription page
        return new Response(
          JSON.stringify({ url: `${origin}/subscription` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: unknown) {
    console.error('Error managing subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
