import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const lemonSqueezyApiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');

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
    const isLemonSqueezy = subscriptionId?.startsWith('ls_');
    const lsSubscriptionId = isLemonSqueezy ? subscriptionId.replace('ls_', '') : null;

    switch (action) {
      case 'cancel': {
        if (isLemonSqueezy && lsSubscriptionId && lemonSqueezyApiKey) {
          // Cancel via LemonSqueezy API
          const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${lemonSqueezyApiKey}`,
              'Accept': 'application/vnd.api+json',
            },
          });

          if (!response.ok) {
            const error = await response.text();
            console.error('LemonSqueezy cancel error:', error);
            throw new Error('Failed to cancel subscription');
          }
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
        if (isLemonSqueezy && lsSubscriptionId && lemonSqueezyApiKey) {
          // Reactivate via LemonSqueezy API
          const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${lemonSqueezyApiKey}`,
              'Content-Type': 'application/vnd.api+json',
              'Accept': 'application/vnd.api+json',
            },
            body: JSON.stringify({
              data: {
                type: 'subscriptions',
                id: lsSubscriptionId,
                attributes: {
                  cancelled: false,
                },
              },
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            console.error('LemonSqueezy reactivate error:', error);
            throw new Error('Failed to reactivate subscription');
          }
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
        const lsCustomerId = customerId?.startsWith('ls_') ? customerId.replace('ls_', '') : null;

        if (lsCustomerId && lemonSqueezyApiKey) {
          // Get customer portal URL from LemonSqueezy
          const response = await fetch(`https://api.lemonsqueezy.com/v1/customers/${lsCustomerId}`, {
            headers: {
              'Authorization': `Bearer ${lemonSqueezyApiKey}`,
              'Accept': 'application/vnd.api+json',
            },
          });

          if (response.ok) {
            const customerData = await response.json();
            const portalUrl = customerData.data?.attributes?.urls?.customer_portal;
            
            if (portalUrl) {
              return new Response(
                JSON.stringify({ url: portalUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
              );
            }
          }
        }

        // Fallback: redirect to subscription page
        const origin = req.headers.get('origin') || 'https://mydocmaker.com';
        return new Response(
          JSON.stringify({ url: `${origin}/dashboard/subscription` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('Error managing subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
