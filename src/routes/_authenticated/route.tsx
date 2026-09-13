import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    // Membership is the profile row; an auth account alone is not enough.
    const { data: profile } = await supabase
      .from("profile")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      throw redirect({ to: "/" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
