import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, User, Bell, Shield, CreditCard, Trash2, AlertTriangle, Crown, 
  Calendar, Settings2, Palette, Globe, Key, Download, History, FileText,
  Moon, Sun, Monitor, Lock, Mail, Smartphone, HelpCircle, ExternalLink,
  ChevronRight, Save
} from "lucide-react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsDb, profilesDb } from "@/lib/databaseProxy";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
}

export default function Settings() {
  const { user, loading: authLoading, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "", avatar_url: "" });
  const [activeTab, setActiveTab] = useState("account");
  const [notifications, setNotifications] = useState({
    email: true,
    marketing: false,
    updates: true,
    security: true,
    billing: true,
  });
  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoSave: true,
    compactMode: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [subResult, profileResult] = await Promise.all([
        subscriptionsDb.get(),
        profilesDb.get(),
      ]);

      if (subResult.data) setSubscription(subResult.data);
      if (profileResult.data) {
        setProfile({
          full_name: profileResult.data.full_name || "",
          email: profileResult.data.email || user?.email || "",
          avatar_url: profileResult.data.avatar_url || "",
        });
      } else {
        setProfile({ full_name: "", email: user?.email || "", avatar_url: "" });
      }

      // Load user preferences
      if (user) {
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (prefsData) {
          setNotifications({
            email: prefsData.email_notifications,
            marketing: prefsData.marketing_emails,
            updates: prefsData.product_updates,
            security: prefsData.security_alerts,
            billing: prefsData.billing_updates,
          });
          setPreferences({
            language: prefsData.language || 'en',
            timezone: prefsData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            autoSave: prefsData.auto_save,
            compactMode: prefsData.compact_mode,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel' },
        headers,
      });

      if (response.error) throw response.error;
      toast.success('Subscription will cancel at end of billing period');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'reactivate' },
        headers,
      });

      if (response.error) throw response.error;
      toast.success('Subscription reactivated');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'portal' },
        headers,
      });

      if (response.error) throw response.error;
      if (response.data?.url) {
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
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setActionLoading(true);
    try {
      await profilesDb.upsert({
        full_name: profile.full_name,
        email: profile.email,
      });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile.email) {
      toast.error('No email address found');
      return;
    }
    setActionLoading(true);
    try {
      await resetPassword(profile.email);
    } catch (error: any) {
      // Error is already handled in resetPassword
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSavingNotifications(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.uid,
          email_notifications: notifications.email,
          marketing_emails: notifications.marketing,
          product_updates: notifications.updates,
          security_alerts: notifications.security,
          billing_updates: notifications.billing,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (error: any) {
      toast.error('Failed to save notification preferences');
      console.error(error);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPreferences(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.uid,
          auto_save: preferences.autoSave,
          compact_mode: preferences.compactMode,
          language: preferences.language,
          timezone: preferences.timezone,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Preferences saved');
    } catch (error: any) {
      toast.error('Failed to save preferences');
      console.error(error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    toast.info('Preparing your data export...');
    
    try {
      // Fetch all user data
      const [profileData, filesData, mediaData, usageData] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.uid),
        supabase.from('file_history').select('*').eq('user_id', user.uid),
        supabase.from('generated_media').select('*').eq('user_id', user.uid),
        supabase.from('usage_tracking').select('*').eq('user_id', user.uid),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profileData.data,
        files: filesData.data,
        generatedMedia: mediaData.data,
        usageHistory: usageData.data,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mydocmaker-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    
    try {
      // Delete all user data from tables
      await Promise.all([
        supabase.from('user_preferences').delete().eq('user_id', user.uid),
        supabase.from('file_history').delete().eq('user_id', user.uid),
        supabase.from('generated_files').delete().eq('user_id', user.uid),
        supabase.from('generated_media').delete().eq('user_id', user.uid),
        supabase.from('usage_tracking').delete().eq('user_id', user.uid),
        supabase.from('profiles').delete().eq('user_id', user.uid),
      ]);

      // Sign out the user
      await signOut();
      toast.success('Your account has been deleted');
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to delete account. Please contact support.');
      console.error(error);
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const isTrialing = subscription?.status === 'trialing';
  const isCanceled = subscription?.canceled_at !== null;
  const hasSubscription = !!subscription;

  const settingsSections = [
    { id: "account", label: "Account", icon: User },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
    { id: "privacy", label: "Privacy & Data", icon: Lock },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your account, billing, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.label}</span>
                    {section.id === 'billing' && hasSubscription && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {subscription.plan_type}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Links */}
            <div className="mt-8 pt-8 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 px-4">Quick Links</h4>
              <div className="space-y-1">
                <Link to="/help" className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Help Center
                </Link>
                <Link to="/contact" className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </Link>
                <a href="https://docs.mydocmaker.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                  Documentation
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Account Settings */}
            {activeTab === "account" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details and avatar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <Button variant="outline" size="sm">Change Avatar</Button>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Contact support to change email</p>
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize your experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-save Documents</p>
                        <p className="text-sm text-muted-foreground">Automatically save changes as you work</p>
                      </div>
                      <Switch
                        checked={preferences.autoSave}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, autoSave: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Compact Mode</p>
                        <p className="text-sm text-muted-foreground">Use smaller spacing in the interface</p>
                      </div>
                      <Switch
                        checked={preferences.compactMode}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, compactMode: checked })}
                      />
                    </div>
                    <Separator />
                    <Button onClick={handleSavePreferences} disabled={savingPreferences}>
                      {savingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Billing Settings */}
            {activeTab === "billing" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <Card className={hasSubscription ? "border-primary/20" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Current Plan
                          {hasSubscription && (
                            <Badge variant={isCanceled ? "destructive" : isTrialing ? "secondary" : "default"}>
                              {isCanceled ? "Canceling" : isTrialing ? "Trial" : "Active"}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Manage your subscription and billing</CardDescription>
                      </div>
                      {hasSubscription && (
                        <div className="flex items-center gap-2">
                          <Crown className="h-6 w-6 text-yellow-500" />
                          <span className="text-xl font-bold capitalize">{subscription.plan_type}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hasSubscription ? (
                      <>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-semibold capitalize mt-1">{subscription.status}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                              {isTrialing ? 'Trial Ends' : isCanceled ? 'Access Until' : 'Next Billing'}
                            </p>
                            <p className="font-semibold mt-1">
                              {isTrialing && subscription.trial_end 
                                ? formatDate(subscription.trial_end)
                                : formatDate(subscription.current_period_end)}
                            </p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">Billing Cycle</p>
                            <p className="font-semibold mt-1">Monthly</p>
                          </div>
                        </div>

                        {isTrialing && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Your 7-day free trial is active. After the trial, you'll be charged automatically.
                            </AlertDescription>
                          </Alert>
                        )}

                        {isCanceled && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Your subscription will end on {formatDate(subscription.current_period_end)}. 
                              You can reactivate anytime before this date.
                            </AlertDescription>
                          </Alert>
                        )}

                        <Separator />

                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" onClick={handleManageBilling} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CreditCard className="mr-2 h-4 w-4" />
                            Manage Payment Methods
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/dashboard/subscription')}>
                            View All Plans
                          </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-destructive">Cancel Subscription</p>
                            <p className="text-sm text-muted-foreground">
                              You'll keep access until {formatDate(subscription.current_period_end)}
                            </p>
                          </div>
                          {isCanceled ? (
                            <Button onClick={handleReactivate} disabled={actionLoading}>
                              Reactivate
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={actionLoading}>
                                  Cancel Subscription
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Your subscription will remain active until {formatDate(subscription.current_period_end)}.
                                    After that, you'll lose access to premium features.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleCancelSubscription}>
                                    Yes, Cancel
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Crown className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">You're on the Free Plan</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          Upgrade to unlock unlimited features, priority support, and more.
                        </p>
                        <Button onClick={() => navigate('/dashboard/subscription')}>
                          View Premium Plans
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download your invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={handleManageBilling}>
                      <History className="mr-2 h-4 w-4" />
                      View Billing History in Stripe
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose what emails you want to receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Security Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified about login activity</p>
                      </div>
                      <Switch
                        checked={notifications.security}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, security: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Billing Updates</p>
                        <p className="text-sm text-muted-foreground">Payment confirmations and invoices</p>
                      </div>
                      <Switch
                        checked={notifications.billing}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, billing: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Product Updates</p>
                        <p className="text-sm text-muted-foreground">New features and improvements</p>
                      </div>
                      <Switch
                        checked={notifications.updates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, updates: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Marketing Emails</p>
                        <p className="text-sm text-muted-foreground">Tips, tutorials, and promotions</p>
                      </div>
                      <Switch
                        checked={notifications.marketing}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                      />
                    </div>
                    <Separator />
                    <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                      {savingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Appearance */}
            {activeTab === "appearance" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Customize how MyDocMaker looks on your device</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <Sun className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Light</p>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <Moon className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Dark</p>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'system' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <Monitor className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">System</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Manage your password security</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Last changed: Never (using social login)
                    </p>
                    <Button variant="outline" onClick={handlePasswordReset} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sessions</CardTitle>
                    <CardDescription>Manage your active sessions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Current Session</p>
                        <p className="text-xs text-muted-foreground">This device • Active now</p>
                      </div>
                      <Badge variant="secondary">Current</Badge>
                    </div>
                    <Button variant="outline" onClick={() => signOut()}>
                      Sign Out of All Devices
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Privacy & Data */}
            {activeTab === "privacy" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Export</CardTitle>
                    <CardDescription>Download a copy of your data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Request a copy of all your data including documents, settings, and account information.
                    </p>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="mr-2 h-4 w-4" />
                      Request Data Export
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible and destructive actions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete your account and all your data including:
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All your documents and files</li>
                                <li>Your subscription and payment history</li>
                                <li>Account settings and preferences</li>
                              </ul>
                              <p className="mt-2 font-medium">This action cannot be undone.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteAccount}
                              disabled={deletingAccount}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Yes, Delete My Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
