import { createServerFn } from "@tanstack/react-start";

/**
 * Preview-only convenience: a member account so the site can be worked on
 * without setting up real logins. Disabled entirely in production builds.
 * Each call sets a fresh random password, so no password lives in source or env
 * and every click invalidates the last one. The account lives in the real
 * project: delete it when done (see scripts/delete-preview-member.sql).
 */
const DEMO_EMAIL = "preview@rim.local";

export const ensureDemoMember = createServerFn({ method: "POST" }).handler(async () => {
  if (!import.meta.env.DEV) return { ok: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const password = crypto.randomUUID();

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = list?.users.find((u) => u.email === DEMO_EMAIL)?.id ?? null;

  if (!userId) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false as const };
    userId = created.user.id;
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (error) return { ok: false as const };
  }

  const { data: profile } = await supabaseAdmin.from("profile").select("id").eq("id", userId).maybeSingle();
  if (!profile) {
    await supabaseAdmin.from("profile").insert({ id: userId, display_name: "Preview" });
  }

  return { ok: true as const, email: DEMO_EMAIL, password };
});
