import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const status: HealthStatus = {
    backend: "online",
    database: "error",
    auth: "not_authenticated",
    ai: "error",
    timestamp: new Date().toISOString(),
    latency: {},
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (!error) {
        status.database = "ok";
      }
      status.latency.database = Date.now() - dbStart;
    } catch (e) {
      console.error("Database check failed:", e);
      status.latency.database = Date.now() - dbStart;
    }

    // Check auth - verify Firebase token if provided
    const clientInfo = req.headers.get("x-client-info") ?? "";
    const firebaseToken = clientInfo.startsWith("firebase:")
      ? clientInfo.slice("firebase:".length)
      : null;
    const authHeader = req.headers.get("Authorization");
    const token = firebaseToken ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (token) {
      try {
        const firebaseApiKey = Deno.env.get("FIREBASE_API_KEY");
        if (firebaseApiKey) {
          const response = await fetch(
            `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token }),
            }
          );
          if (response.ok) {
            status.auth = "ok";
          } else {
            status.auth = "error";
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        status.auth = "error";
      }
    }

    // Check AI gateway
    const aiStart = Date.now();
    try {
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableApiKey) {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        
        if (response.ok || response.status === 429) {
          // 429 means rate limited but AI is reachable
          status.ai = "ok";
        }
      }
      status.latency.ai = Date.now() - aiStart;
    } catch (e) {
      console.error("AI check failed:", e);
      status.latency.ai = Date.now() - aiStart;
    }

    console.log("Health check completed:", status);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    status.backend = "offline";
    return new Response(JSON.stringify(status), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
