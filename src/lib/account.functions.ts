import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes the signed-in member and everything that is theirs. Storage files don't cascade,
 * so they go first; deleting the auth user then cascades to profile, ratings, private
 * scores, wishlist, photo rows, invites and edit-log rows. Wines and bottlings they added
 * stay, since the circle shares them.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    try {
      const { data: photos, error: photoError } = await supabaseAdmin
        .from("entry_photos")
        .select("storage_path,thumb_path")
        .eq("owner_id", userId);
      if (photoError) throw photoError;
      const photoPaths = (photos ?? [])
        .flatMap((p) => [p.storage_path, p.thumb_path])
        .filter(Boolean);
      for (let i = 0; i < photoPaths.length; i += 100) {
        const { error } = await supabaseAdmin.storage
          .from("entry-photos")
          .remove(photoPaths.slice(i, i + 100));
        if (error) throw error;
      }

      const { data: avatars, error: listError } = await supabaseAdmin.storage
        .from("avatars")
        .list(userId, { limit: 1000 });
      if (listError) throw listError;
      if (avatars?.length) {
        const { error } = await supabaseAdmin.storage
          .from("avatars")
          .remove(avatars.map((a) => `${userId}/${a.name}`));
        if (error) throw error;
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      return { ok: true };
    } catch (error) {
      console.error("[account] delete failed", error);
      return {
        ok: false,
        error:
          "Your account couldn't be fully deleted just now. Try again; it picks up where it stopped.",
      };
    }
  });
