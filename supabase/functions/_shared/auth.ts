import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIREBASE_PROJECT_ID = "document-gen-ai";

type UserTier = "free" | "standard" | "premium";

interface FirebaseDecodedToken {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
}

interface AuthResult {
  userId: string;
  isPremium: boolean;
  isStandard: boolean;
  tier: UserTier;
  error?: string;
}

/**
 * Verify Firebase ID token and get user info
 */
export async function verifyFirebaseToken(tokenOrHeader: string | null): Promise<{ userId: string; email?: string } | null> {
  if (!tokenOrHeader) {
    console.log("No Firebase token provided");
    return null;
  }

  const idToken = tokenOrHeader.startsWith("Bearer ")
    ? tokenOrHeader.slice("Bearer ".length)
    : tokenOrHeader;

  
  try {
    // Verify the Firebase ID token using Google's public endpoint
    const firebaseApiKey = Deno.env.get("FIREBASE_API_KEY");
    if (!firebaseApiKey) {
      console.error("FIREBASE_API_KEY environment variable not configured");
      return null;
    }
    
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Firebase token verification failed:", error);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    if (!user) {
      console.error("No user found in Firebase response");
      return null;
    }

    return {
      userId: user.localId,
      email: user.email,
    };
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return null;
  }
}

/**
 * Get user tier from Supabase database
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (error) {
      console.log("Could not fetch user role, defaulting to free:", error.message);
      return "free";
    }
    
    const role = data?.role as UserTier;
    return role === "premium" || role === "standard" ? role : "free";
  } catch (error) {
    console.error("Error checking user tier:", error);
    return "free";
  }
}

/**
 * Get user premium status from Supabase database (legacy compatibility)
 */
export async function getUserPremiumStatus(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === "premium";
}

/**
 * Complete authentication flow: verify token and get tier
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Prefer a dedicated header set by the web app.
  const firebaseTokenHeader = req.headers.get("x-firebase-token");

  // Backward compatibility: some older clients tunneled the token through x-client-info.
  const clientInfo = req.headers.get("x-client-info") ?? "";
  const firebaseTokenFromClientInfo = clientInfo.startsWith("firebase:")
    ? clientInfo.slice("firebase:".length)
    : null;

  // Legacy fallback: token in Authorization header.
  const authHeader = req.headers.get("Authorization");

  const tokenCandidate = firebaseTokenHeader ?? firebaseTokenFromClientInfo ?? authHeader;
  const tokenResult = await verifyFirebaseToken(tokenCandidate);

  if (!tokenResult) {
    return {
      userId: "",
      isPremium: false,
      isStandard: false,
      tier: "free",
      error: "Authentication required. Please sign in to continue.",
    };
  }

  // Get user tier from database
  const tier = await getUserTier(tokenResult.userId);
  const isPremium = tier === "premium";
  const isStandard = tier === "standard";

  console.log(`Authenticated user ${tokenResult.userId} (tier: ${tier})`);

  return {
    userId: tokenResult.userId,
    isPremium,
    isStandard,
    tier,
  };
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message = "Authentication required") {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
