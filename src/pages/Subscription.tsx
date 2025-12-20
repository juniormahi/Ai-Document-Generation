import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { UsageStats } from "@/components/UsageStats";
import { toast } from "sonner";
import { Loader2, CreditCard, Calendar, AlertCircle, Check, Crown, Zap, Star, Shield, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsDb } from "@/lib/databaseProxy";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
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
        try {
          const url = new URL(response.data.url);
          const allowedHosts = ['stripe.com', 'billing.stripe.com', 'checkout.stripe.com', 'mydocmaker.com'];
          if (allowedHosts.some(host => url.hostname.endsWith(host) || url.hostname.includes('stripe'))) {
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
        body: { planType, billingPeriod },
        headers,
      });

      if (response.error) throw response.error;

      if (response.data?.url) {
        try {
          const url = new URL(response.data.url);
          const allowedHosts = ['stripe.com', 'checkout.stripe.com'];
          if (allowedHosts.some(host => url.hostname.endsWith(host) || url.hostname.includes('stripe'))) {
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

  // Pricing with annual discount (2 months free)
  const prices = {
    standard: {
      monthly: 9,
      annually: 84, // $7/mo billed annually (2 months free)
    },
    premium: {
      monthly: 12,
      annually: 120, // $10/mo billed annually (2 months free)
    },
  };

  const getPrice = (plan: 'standard' | 'premium') => {
    if (billingPeriod === 'annually') {
      return `$${Math.round(prices[plan].annually / 12)}`;
    }
    return `$${prices[plan].monthly}`;
  };

  const getAnnualSavings = (plan: 'standard' | 'premium') => {
    const monthlyCost = prices[plan].monthly * 12;
    const annualCost = prices[plan].annually;
    return monthlyCost - annualCost;
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "",
      description: "Get started with MyDocMaker",
      features: [
        "25 credits/month for documents",
        "10 AI images/day",
        "2 AI videos/day",
        "50 credits/month for voice",
        "150 credits/month for other tools",
        "5 documents per day",
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
      price: getPrice('standard'),
      period: billingPeriod === 'annually' ? '/mo' : '/mo',
      billedText: billingPeriod === 'annually' ? `$${prices.standard.annually} billed annually` : 'billed monthly',
      savings: billingPeriod === 'annually' ? getAnnualSavings('standard') : 0,
      description: "For professionals",
      features: [
        "250 generation credits/month",
        "50 AI images/day",
        "10 AI videos/day",
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
      price: getPrice('premium'),
      period: billingPeriod === 'annually' ? '/mo' : '/mo',
      billedText: billingPeriod === 'annually' ? `$${prices.premium.annually} billed annually` : 'billed monthly',
      savings: billingPeriod === 'annually' ? getAnnualSavings('premium') : 0,
      description: "Maximum power",
      features: [
        "500 generation credits/month",
        "100 AI images/day",
        "30 AI videos/day",
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

        {/* Billing Period Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-4 bg-muted/50 p-2 rounded-xl">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annually')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'annually'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annually
              <Badge className="bg-green-500 text-white text-xs">Save 17%</Badge>
            </button>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-center">Choose Your Plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrent = subscription?.plan_type?.toLowerCase() === plan.name.toLowerCase() || plan.current;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className={`relative h-full ${plan.popular ? "border-primary shadow-lg shadow-primary/10" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {(plan as any).savings > 0 && (
                      <div className="absolute -top-3 right-4">
                        <Badge className="bg-green-500 text-white">
                          Save ${(plan as any).savings}/yr
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pt-8">
                      <div className={`w-12 h-12 rounded-xl ${plan.popular ? 'bg-primary/20' : 'bg-primary/10'} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className={`h-6 w-6 ${plan.popular ? 'text-primary' : 'text-primary'}`} />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                      </div>
                      {(plan as any).billedText && (
                        <p className="text-xs text-muted-foreground mt-1">{(plan as any).billedText}</p>
                      )}
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
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
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">What happens after my free trial?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  After your 7-day free trial, you'll be automatically charged for your selected plan. You can cancel anytime before the trial ends.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Can I change my plan later?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Yes! You can upgrade, downgrade, or cancel your subscription at any time from your settings page.
                </p>
              </div>
              <div>
                <h4 className="font-medium">What payment methods do you accept?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
