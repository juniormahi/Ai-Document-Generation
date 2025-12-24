import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";

type TableName = "file_history" | "profiles" | "usage_tracking" | "user_roles" | "subscriptions";
type ActionType = "select" | "select_single" | "insert" | "update" | "delete" | "rpc";

interface QueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean>;
  order?: { column: string; ascending?: boolean };
}

interface ProxyResponse<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * Database proxy that routes all operations through edge function
 * This ensures proper authentication with Firebase tokens
 */
async function callDatabaseProxy<T = any>(
  action: ActionType,
  table: TableName,
  data?: any,
  options?: QueryOptions
): Promise<ProxyResponse<T>> {
  try {
    const headers = await getAuthHeaders();
    
    const { data: responseData, error } = await supabase.functions.invoke("database-proxy", {
      body: {
        action,
        table,
        data,
        filters: options?.filters,
        select: options?.select,
        order: options?.order,
      },
      headers,
    });

    if (error) {
      console.error("Database proxy error:", error);
      return { data: null, error: new Error(error.message || "Database operation failed") };
    }

    if (responseData?.error) {
      return { data: null, error: new Error(responseData.error) };
    }

    return { data: responseData?.data as T, error: null };
  } catch (err: any) {
    console.error("Database proxy call failed:", err);
    return { data: null, error: err };
  }
}

// File History operations
export const fileHistoryDb = {
  async getAll(options?: { order?: { column: string; ascending?: boolean } }) {
    return callDatabaseProxy("select", "file_history", undefined, {
      order: options?.order || { column: "created_at", ascending: false },
    });
  },

  async getByType(fileType: string) {
    return callDatabaseProxy("select", "file_history", undefined, {
      filters: { file_type: fileType },
      order: { column: "created_at", ascending: false },
    });
  },

  async insert(data: { title: string; content: string; file_type: string; file_size?: number; thumbnail_url?: string }) {
    return callDatabaseProxy("insert", "file_history", data);
  },

  async delete(id: string) {
    return callDatabaseProxy("delete", "file_history", undefined, {
      filters: { id },
    });
  },
};

// Profiles operations
export const profilesDb = {
  async get() {
    return callDatabaseProxy("select_single", "profiles");
  },

  async update(data: { full_name?: string; avatar_url?: string; email?: string }) {
    return callDatabaseProxy("update", "profiles", data);
  },

  async upsert(data: { full_name?: string; avatar_url?: string; email?: string }) {
    // Try to get existing profile first
    const existing = await this.get();
    if (existing.data) {
      return this.update(data);
    }
    // If no profile exists, create one
    return callDatabaseProxy("insert", "profiles", data);
  },
};

// Usage Tracking operations
export const usageTrackingDb = {
  async getToday() {
    const today = new Date().toISOString().split("T")[0];
    return callDatabaseProxy("select_single", "usage_tracking", undefined, {
      filters: { date: today },
    });
  },

  async incrementUsage(usageType: string, amount: number = 1) {
    return callDatabaseProxy("rpc", "usage_tracking", {
      function_name: "increment_usage",
      args: { _usage_type: usageType, _amount: amount },
    });
  },
};

// User Roles operations
export const userRolesDb = {
  async get() {
    return callDatabaseProxy<{ role: string }>("select_single", "user_roles", undefined, {
      select: "role",
    });
  },

  async isPremium(): Promise<boolean> {
    const result = await this.get();
    return result.data?.role === "premium";
  },
};

// Subscriptions operations
export const subscriptionsDb = {
  async get() {
    return callDatabaseProxy("select_single", "subscriptions");
  },
};
