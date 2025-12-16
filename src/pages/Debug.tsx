import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface FunctionStatus {
  name: string;
  status: "idle" | "loading" | "success" | "error";
  statusCode?: number;
  message?: string;
  responseTime?: number;
}

const FUNCTIONS_TO_TEST = [
  { name: "database-proxy", requiresAuth: true, body: { action: "select", table: "profiles" } },
  { name: "create-checkout-session", requiresAuth: true, body: { planType: "standard", billingPeriod: "monthly" } },
  { name: "manage-subscription", requiresAuth: true, body: { action: "portal" } },
  { name: "ai-chat", requiresAuth: true, body: { messages: [{ role: "user", content: "test" }] } },
];

export default function Debug() {
  const { user } = useAuth();
  const [results, setResults] = useState<FunctionStatus[]>(
    FUNCTIONS_TO_TEST.map((f) => ({ name: f.name, status: "idle" }))
  );
  const [testing, setTesting] = useState(false);

  const testFunction = async (fn: typeof FUNCTIONS_TO_TEST[0], index: number) => {
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { name: fn.name, status: "loading" };
      return updated;
    });

    const start = Date.now();
    try {
      const headers = fn.requiresAuth ? await getAuthHeaders() : {};
      
      const { data, error } = await supabase.functions.invoke(fn.name, {
        body: fn.body,
        headers,
      });

      const responseTime = Date.now() - start;

      if (error) {
        // Extract status code from error context if available
        const statusCode = error.context?.status || 500;
        let errorMessage = error.message;
        
        // Try to get more details from response
        if (error.context instanceof Response) {
          try {
            const text = await error.context.clone().text();
            errorMessage = text.substring(0, 200);
          } catch {}
        }

        setResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            name: fn.name,
            status: "error",
            statusCode,
            message: errorMessage,
            responseTime,
          };
          return updated;
        });
      } else {
        setResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            name: fn.name,
            status: "success",
            statusCode: 200,
            message: JSON.stringify(data).substring(0, 100),
            responseTime,
          };
          return updated;
        });
      }
    } catch (err: any) {
      const responseTime = Date.now() - start;
      setResults((prev) => {
        const updated = [...prev];
        updated[index] = {
          name: fn.name,
          status: "error",
          message: err.message,
          responseTime,
        };
        return updated;
      });
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    for (let i = 0; i < FUNCTIONS_TO_TEST.length; i++) {
      await testFunction(FUNCTIONS_TO_TEST[i], i);
    }
    setTesting(false);
  };

  const getStatusIcon = (status: FunctionStatus["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-muted" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Backend Debug</h1>
              <p className="text-muted-foreground text-sm">
                Test edge function connectivity
              </p>
            </div>
          </div>
          <Button onClick={runAllTests} disabled={testing}>
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run All Tests
          </Button>
        </div>

        {!user && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Not logged in. Auth-protected functions will fail with 401.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {results.map((result, index) => (
            <Card key={result.name} className={
              result.status === "success" ? "border-green-500/30" :
              result.status === "error" ? "border-red-500/30" : ""
            }>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium">{result.name}</p>
                      {result.statusCode && (
                        <p className={`text-xs ${result.status === "error" ? "text-red-500" : "text-green-500"}`}>
                          HTTP {result.statusCode}
                          {result.responseTime && ` • ${result.responseTime}ms`}
                        </p>
                      )}
                      {result.message && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {result.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testFunction(FUNCTIONS_TO_TEST[index], index)}
                    disabled={result.status === "loading"}
                  >
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Environment Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-1">
            <p>User: {user?.email || "Not logged in"}</p>
            <p>UID: {user?.uid || "N/A"}</p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 40)}...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
