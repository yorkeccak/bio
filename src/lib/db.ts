/**
 * Unified database interface that switches between Supabase (valyu mode)
 * and SQLite (self-hosted mode) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { createClient as createSupabaseDirectClient } from "@supabase/supabase-js";
import { getLocalDb } from "./local-db/client";
import { getDevUser, isSelfHostedMode } from "./local-db/local-auth";
import { eq } from "drizzle-orm";
import * as schema from "./local-db/schema";

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getUser();
}

export async function getUserFromToken(accessToken: string) {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return {
      data: { user: null },
      error: { message: "Supabase token auth is not configured" },
    };
  }

  const supabase = createSupabaseDirectClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return supabase.auth.getUser(accessToken);
}

/** Resolve cookies first, then the explicit bearer token sent by API clients. */
export async function getUserFromRequest(request: Request) {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const cookieResult = await getUser();
  if (cookieResult.data?.user) return cookieResult;

  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    return getUserFromToken(authorization.slice(7));
  }
  return cookieResult;
}

export async function getSession() {
  if (isSelfHostedMode()) {
    return {
      data: {
        session: {
          user: getDevUser(),
          access_token: "dev-access-token",
        },
      },
      error: null,
    };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getSession();
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function getUserProfile(userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return { data: user || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}
