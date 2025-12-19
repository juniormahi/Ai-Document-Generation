import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-firebase-token, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);

    if (auth.error) {
      console.error("Authentication failed:", auth.error);
      return unauthorizedResponse(corsHeaders, auth.error);
    }

    const userId = auth.userId;
    console.log(`Database proxy request from user: ${userId}`);

    // Parse request body
    const { action, table, data, filters, select, order } = await req.json();
    
    if (!action || !table) {
      return new Response(
        JSON.stringify({ error: "Missing action or table parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate allowed tables
    const allowedTables = ["file_history", "profiles", "usage_tracking", "user_roles", "subscriptions"];
    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: "Invalid table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;

    switch (action) {
      case "select": {
        let query = supabase.from(table).select(select || "*");
        
        // Always filter by user_id for security
        query = query.eq("user_id", userId);
        
        // Apply additional filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== "user_id") { // user_id is already applied
              query = query.eq(key, value as string);
            }
          }
        }
        
        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? false });
        }
        
        const { data: selectData, error: selectError } = await query;
        
        if (selectError) {
          console.error("Select error:", selectError);
          return new Response(
            JSON.stringify({ error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = selectData;
        break;
      }
      
      case "select_single": {
        let query = supabase.from(table).select(select || "*").eq("user_id", userId);
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== "user_id") {
              query = query.eq(key, value as string);
            }
          }
        }
        
        const { data: singleData, error: singleError } = await query.maybeSingle();
        
        if (singleError) {
          console.error("Select single error:", singleError);
          return new Response(
            JSON.stringify({ error: singleError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = singleData;
        break;
      }
      
      case "insert": {
        if (!data) {
          return new Response(
            JSON.stringify({ error: "Missing data for insert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Always set user_id to authenticated user
        const insertData = { ...data, user_id: userId };
        
        const { data: insertResult, error: insertError } = await supabase
          .from(table)
          .insert(insertData)
          .select();
        
        if (insertError) {
          console.error("Insert error:", insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = insertResult;
        break;
      }
      
      case "update": {
        if (!data) {
          return new Response(
            JSON.stringify({ error: "Missing data for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        let query = supabase.from(table).update(data).eq("user_id", userId);
        
        // Apply additional filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== "user_id") {
              query = query.eq(key, value as string);
            }
          }
        }
        
        const { data: updateResult, error: updateError } = await query.select();
        
        if (updateError) {
          console.error("Update error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = updateResult;
        break;
      }
      
      case "delete": {
        let query = supabase.from(table).delete().eq("user_id", userId);
        
        // Apply additional filters (e.g., id)
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== "user_id") {
              query = query.eq(key, value as string);
            }
          }
        }
        
        const { error: deleteError } = await query;
        
        if (deleteError) {
          console.error("Delete error:", deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = { success: true };
        break;
      }
      
      case "rpc": {
        // Handle RPC calls like increment_usage
        const { function_name, args } = data || {};
        
        if (!function_name) {
          return new Response(
            JSON.stringify({ error: "Missing function_name for RPC" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Override user_id in args for security
        const safeArgs = { ...args, _user_id: userId };
        
        const { data: rpcData, error: rpcError } = await supabase.rpc(function_name, safeArgs);
        
        if (rpcError) {
          console.error("RPC error:", rpcError);
          return new Response(
            JSON.stringify({ error: rpcError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        result = rpcData;
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Database proxy ${action} on ${table} successful for user ${userId}`);
    
    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Database proxy error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
