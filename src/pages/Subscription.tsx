import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { UsageStats } from "@/components/UsageStats";
import { toast } from "sonner";
import { Loader2, CreditCard, Calendar, AlertCircle, Check, Crown, Zap, Star, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsDb } from "@/lib/databaseProxy";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
}

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchSubscription();
    }
  }, [user, authLoading]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await subscriptionsDb.get();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async (action: 'cancel' | 'reactivate' | 'portal') => {
    setActionLoading(true);
    try {
      if (!user) {
        toast.error('Please sign in to manage your subscription');
        navigate('/auth');
        return;
      }

      const headers = await getAuthHeaders();
      const response = await supabase.functions.invoke('manage-subscription', {
        body: { action },
        headers,
      });

      if (response.error) throw response.error;

      if (action === 'portal' && response.data?.url) {
        // Validate Stripe URL to prevent open redirects
        try {
          const url = new URL(response.data.url);
          const allowedHosts = ['stripe.com', 'billing.stripe.com'];
          if (allowedHosts.some(host => url.hostname.endsWith(host))) {
            window.location.href = response.data.url;
          } else {
            throw new Error('Invalid redirect URL');
          }
        } catch {
          toast.error('Invalid billing portal URL');
        }
      } else {
        toast.success(response.data?.message || 'Subscription updated successfully');
        fetchSubscription();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to manage subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    if (planType === "free") return;

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await supabase.functions.invoke('create-checkout-session', {
        body: { planType, billingPeriod: 'monthly' },
        headers,
      });

      if (response.error) throw response.error;

      if (response.data?.url) {
        // Validate Stripe URL to prevent open redirects
        try {
          const url = new URL(response.data.url);
          const allowedHosts = ['stripe.com', 'checkout.stripe.com'];
          if (allowedHosts.some(host => url.hostname.endsWith(host))) {
            window.location.href = response.data.url;
          } else {
            throw new Error('Invalid redirect URL');
          }
        } catch {
          toast.error('Invalid checkout URL');
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trialing: { variant: 'secondary', label: 'Trial' },
      past_due: { variant: 'destructive', label: 'Past Due' },
      canceled: { variant: 'outline', label: 'Canceled' },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Get started with MyDocMaker",
      features: [
        "25 credits/month for documents",
        "50 credits/month for voice",
        "150 credits/month for other tools",
        "5 documents per day",
        "5 presentations per day",
        "Basic AI chat",
        "PDF & DOCX export",
        "1000 words per file"
      ],
      cta: "Current Plan",
      current: !subscription,
      icon: Zap
    },
    {
      name: "Standard",
      price: "$9",
      description: "For professionals",
      features: [
        "250 generation credits/month",
        "Unlimited other tools",
        "Unlimited documents",
        "Unlimited AI chat",
        "All export formats",
        "Priority support",
        "5000 words per file",
        "Access to Gemini 3"
      ],
      cta: "Start Free Trial",
      popular: false,
      icon: Star
    },
    {
      name: "Premium",
      price: "$12",
      description: "Maximum power",
      features: [
        "500 generation credits/month",
        "Everything in Standard",
        "Max Intelligence AI",
        "Access to Gemini 3 & Nano Banana",
        "10000 words per file",
        "API access",
        "Dedicated support",
        "Premium documents"
      ],
      cta: "Start Free Trial",
      popular: true,
      icon: Crown
    }
  ];

  const isTrialing = subscription?.status === 'trialing';
  const isCanceled = subscription?.status === 'canceled' || subscription?.canceled_at !== null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Subscription & Pricing</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage your plan and unlock premium features
          </p>
        </motion.div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>7-Day Free Trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Cancel Anytime</span>
          </div>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl capitalize flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      {subscription.plan_type} Plan
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Your current subscription
                    </CardDescription>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isTrialing && subscription.trial_end && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your trial ends on {formatDate(subscription.trial_end)}
                    </AlertDescription>
                  </Alert>
                )}

                {isCanceled && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription ends on {formatDate(subscription.current_period_end)}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleManageSubscription('portal')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Manage Billing
                  </Button>
                  {!isCanceled ? (
                    <Button variant="outline" onClick={() => handleManageSubscription('cancel')} disabled={actionLoading}>
                      Cancel Subscription
                    </Button>
                  ) : (
                    <Button onClick={() => handleManageSubscription('reactivate')} disabled={actionLoading}>
                      Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Usage Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage</CardTitle>
              <CardDescription>Track your generation limits</CardDescription>
            </CardHeader>
            <CardContent>
              <UsageStats />
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrent = subscription?.plan_type?.toLowerCase() === plan.name.toLowerCase() || plan.current;
              return (
                <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "$0" && <span className="text-muted-foreground">/mo</span>}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${plan.popular && !isCurrent ? "bg-primary" : ""}`}
                      variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                      disabled={isCurrent || actionLoading}
                      onClick={() => handleSubscribe(plan.name.toLowerCase())}
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        "Current Plan"
                      ) : (
                        plan.cta
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}