import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { cn } from "@/lib/utils";
import { Activity, Database, Shield, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HealthStatus {
  backend: "online" | "offline";
  database: "ok" | "error";
  auth: "ok" | "error" | "not_authenticated";
  ai: "ok" | "error";
  timestamp: string;
  latency: {
    database?: number;
    ai?: number;
  };
}

type StatusType = "ok" | "error" | "loading" | "not_authenticated" | "online" | "offline";

const statusColors: Record<StatusType, string> = {
  ok: "bg-emerald-500",
  online: "bg-emerald-500",
  error: "bg-red-500",
  offline: "bg-red-500",
  loading: "bg-amber-500 animate-pulse",
  not_authenticated: "bg-slate-400",
};

const StatusDot = ({ status }: { status: StatusType }) => (
  <span className={cn("w-2 h-2 rounded-full", statusColors[status])} />
);

export function HealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      let headers: Record<string, string> = {};
      try {
        headers = await getAuthHeaders();
      } catch {
        // Not authenticated, continue without auth headers
      }

      const { data, error } = await supabase.functions.invoke("health-check", {
        headers,
      });

      if (error) {
        setHealth({
          backend: "offline",
          database: "error",
          auth: "error",
          ai: "error",
          timestamp: new Date().toISOString(),
          latency: {},
        });
      } else {
        setHealth(data as HealthStatus);
      }
      setLastChecked(new Date());
    } catch (e) {
      console.error("Health check failed:", e);
      setHealth({
        backend: "offline",
        database: "error",
        auth: "error",
        ai: "error",
        timestamp: new Date().toISOString(),
        latency: {},
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 60 seconds
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = health
    ? health.backend === "online" && health.database === "ok" && health.ai === "ok"
      ? "ok"
      : "error"
    : "loading";

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-default">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <StatusDot status={loading ? "loading" : overallStatus} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {loading ? "Checking..." : overallStatus === "ok" ? "All Systems OK" : "Issues Detected"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 p-0">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Status</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={checkHealth}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span>Backend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={loading ? "loading" : health?.backend || "error"} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {loading ? "..." : health?.backend || "unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span>Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={loading ? "loading" : health?.database || "error"} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {loading ? "..." : health?.database || "unknown"}
                      {health?.latency?.database && ` (${health.latency.database}ms)`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Auth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={loading ? "loading" : health?.auth || "error"} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {loading ? "..." : health?.auth === "not_authenticated" ? "Not logged in" : health?.auth || "unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    <span>AI Gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={loading ? "loading" : health?.ai || "error"} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {loading ? "..." : health?.ai || "unknown"}
                      {health?.latency?.ai && ` (${health.latency.ai}ms)`}
                    </span>
                  </div>
                </div>
              </div>

              {lastChecked && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
