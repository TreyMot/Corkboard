import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const joinSchema = z.object({
  code: z.string().trim().max(64).optional().default(""),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(60),
  // Corkboard is for adults 21 and over; the form can't submit without this, and neither can a direct call.
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Corkboard is for adults 21 and over." }),
  }),
});

export const joinWithInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => joinSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const code = data.code.trim().toUpperCase();

    const { data: allowed } = await supabaseAdmin
      .from("allowed_email")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    // Founders join through allowed_email; everyone else needs an invite. (There used to be
    // a "first member needs no code" bootstrap, which let a stranger in on an empty project.)
    let inviteCode: string | null = null;
    if (!allowed) {
      if (!code) return { ok: false as const, error: "An invite code is required." };
      const { data: invite } = await supabaseAdmin
        .from("invite")
        .select("code,used_by,expires_at")
        .eq("code", code)
        .maybeSingle();
      if (!invite) return { ok: false as const, error: "That code isn't recognised." };
      if (invite.used_by) return { ok: false as const, error: "That code has already been used." };
      if (new Date(invite.expires_at).getTime() < Date.now())
        return { ok: false as const, error: "That code has expired." };
      inviteCode = invite.code;
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    let userId = created?.user?.id;
    const existed =
      createError?.code === "email_exists" || /already/i.test(createError?.message ?? "");
    if (existed) {
      // An account with no profile (say, one added in the Supabase dashboard) finishes joining
      // here, but only for someone who can prove it's theirs with its password.
      userId = await ownerOfUnfinishedAccount(email, data.password);
      if (!userId)
        return { ok: false as const, error: "That email already has an account. Sign in instead." };
    } else if (createError || !userId) {
      return { ok: false as const, error: "Could not create the account." };
    }

    const { error: profileError } = await supabaseAdmin.from("profile").insert({
      id: userId,
      display_name: data.displayName,
      age_confirmed_at: new Date().toISOString(),
    });
    if (profileError) {
      if (!existed) await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: "Could not finish setting up your profile." };
    }

    if (inviteCode) {
      await supabaseAdmin.from("invite").update({ used_by: userId }).eq("code", inviteCode);
    }

    return { ok: true as const };
  });

/** The account's id if the password is right and it isn't a member yet; otherwise undefined. */
async function ownerOfUnfinishedAccount(email: string, password: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const anon = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.user) return undefined;
  await anon.auth.signOut({ scope: "local" });
  const { data: profile } = await supabaseAdmin
    .from("profile")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  return profile ? undefined : data.user.id;
}
