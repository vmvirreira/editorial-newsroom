import { createSupabaseServerClient } from "./supabase/server";
import type { StaffRole } from "./types";

export async function getStaffSession() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase, user: null, role: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user, role: null };
  const { data, error } = await supabase.from("newsroom_staff_profiles").select("role").eq("user_id", user.id).maybeSingle();
  const role: StaffRole | null = !error && (data?.role === "editor" || data?.role === "writer") ? data.role : null;
  return { supabase, user, role };
}
