import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { 
  Loader2, Crown, Zap, Image, Video, MessageSquare, 
  Volume2, FileText, Presentation, FileSpreadsheet,
  TrendingUp, Calendar, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { TIER_LIMITS, type ToolCategory, type UserTier } from "@/hooks/useTierCredits";

interface UsageData {
  images_generated: number;
  videos_generated: number;
  chat_messages: number;
  voiceovers_generated: number;
  documents_generated: number;
  presentations_generated: number;
  spreadsheets_generated: number;
}

const TOOL_CONFIG: Record<ToolCategory, { name: string; icon: any; color: string; link: string }> = {
  images_generated: { name: "Image Generator", icon: Image, color: "text-pink-500", link: "/tools/image-generator" },
  videos_generated: { name: "Video Generator", icon: Video, color: "text-red-500", link: "/tools/video-generator" },
  chat_messages: { name: "AI Chat", icon: MessageSquare, color: "text-cyan-500", link: "/tools/chat" },
  voiceovers_generated: { name: "Voiceover", icon: Volume2, color: "text-violet-500", link: "/tools/voice-generator" },
  documents_generated: { name: "Document Creator", icon: FileText, color: "text-blue-500", link: "/tools/document-creator" },
  presentations_generated: { name: "Presentation Maker", icon: Presentation, color: "text-orange-500", link: "/tools/presentation-maker" },
  spreadsheets_generated: { name: "Spreadsheet Generator", icon: FileSpreadsheet, color: "text-green-500", link: "/tools/spreadsheet-maker" },
};

export default function CreditsOverview() {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<UserTier>("free");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.uid) return;

    try {
      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.uid)
        .maybeSingle();

      setTier((roleData?.role as UserTier) || "free");

      // Get today's usage
      const today = new Date().toISOString().split("T")[0];
      const { data: usageData } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user.uid)
        .eq("date", today)
        .maybeSingle();

      setUsage(usageData || {
        images_generated: 0,
        videos_generated: 0,
        chat_messages: 0,
        voiceovers_generated: 0,
        documents_generated: 0,
        presentations_generated: 0,
        spreadsheets_generated: 0,
      });
    } catch (error) {
      console.error("Error fetching credits data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.uid]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Calculate totals
  const totalUsed = usage ? Object.entries(usage).reduce((acc, [key, val]) => {
    if (key in TIER_LIMITS) return acc + (val || 0);
    return acc;
  }, 0) : 0;

  const totalLimit = Object.entries(TIER_LIMITS).reduce((acc, [_, limits]) => {
    const limit = limits[tier];
    return acc + (limit === 999 ? 0 : limit); // Don't count unlimited
  }, 0);

  const tierLabel = tier === "premium" ? "Premium" : tier === "standard" ? "Standard" : "Free";
  const tierColor = tier === "premium" ? "text-amber-500" : tier === "standard" ? "text-blue-500" : "text-muted-foreground";

  return (
    <DashboardLayout>
      <SEO
        title="Credits Overview - mydocmaker"
        description="View your daily credit usage across all AI tools"
        canonical="/dashboard/credits"
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Credits Overview</h1>
              <p className="text-muted-foreground">
                Track your daily usage across all AI tools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {tier !== "premium" && (
                <Link to="/dashboard/subscription">
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className={`w-6 h-6 ${tierColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className={`text-xl font-bold ${tierColor}`}>{tierLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Usage</p>
                  <p className="text-xl font-bold">{totalUsed} credits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resets At</p>
                  <p className="text-xl font-bold">Midnight UTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tool Usage Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Usage by Tool
              </CardTitle>
              <CardDescription>
                Daily credit limits reset at midnight UTC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {(Object.entries(TOOL_CONFIG) as [ToolCategory, typeof TOOL_CONFIG[ToolCategory]][]).map(([key, config]) => {
                  const used = usage?.[key] || 0;
                  const limit = TIER_LIMITS[key][tier];
                  const isUnlimited = limit === 999;
                  const percent = isUnlimited ? 0 : (used / limit) * 100;
                  const remaining = isUnlimited ? "∞" : limit - used;
                  const Icon = config.icon;

                  return (
                    <Link key={key} to={config.link}>
                      <div className="p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{config.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {isUnlimited ? "Unlimited" : `${used} / ${limit} used`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${percent >= 80 ? 'text-amber-500' : percent >= 100 ? 'text-red-500' : ''}`}>
                              {remaining}
                            </p>
                            <p className="text-xs text-muted-foreground">remaining</p>
                          </div>
                        </div>
                        {!isUnlimited && (
                          <Progress 
                            value={Math.min(percent, 100)} 
                            className={`h-2 ${percent >= 80 ? '[&>div]:bg-amber-500' : percent >= 100 ? '[&>div]:bg-red-500' : ''}`}
                          />
                        )}
                        {isUnlimited && (
                          <div className="h-2 rounded-full bg-gradient-to-r from-green-500/20 to-green-500/40" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upgrade CTA for non-premium users */}
        {tier !== "premium" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Need more credits?</h3>
                      <p className="text-muted-foreground text-sm">
                        {tier === "free" 
                          ? "Upgrade to Standard for 5x more credits, or Premium for 10-20x more!"
                          : "Upgrade to Premium for the highest limits and priority processing!"
                        }
                      </p>
                    </div>
                  </div>
                  <Link to="/dashboard/subscription">
                    <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
                      View Plans
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
