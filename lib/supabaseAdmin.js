import { createClient } from "@supabase/supabase-js";

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env variables are missing");
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}

export async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return {
      user: null,
      error: "Authorization token is missing",
    };
  }

  const supabase = getSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: error?.message || "Invalid user token",
    };
  }

  return {
    user,
    error: null,
  };
}