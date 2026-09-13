import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "entry-photos";
const BATCH = 200;

/** Weekly cleanup: photos removed more than thirty days ago lose their files, then their rows. */
export const Route = createFileRoute("/api/public/hooks/purge-photos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenRow = await supabaseAdmin
          .from("job_token")
          .select("token")
          .eq("name", "purge_photos")
          .maybeSingle();
        if (!provided || !tokenRow.data?.token || provided !== tokenRow.data.token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();


        const { data, error } = await supabaseAdmin
          .from("entry_photos")
          .select("id,storage_path,thumb_path")
          .not("deleted_at", "is", null)
          .lt("deleted_at", cutoff)
          .limit(BATCH);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = data ?? [];
        if (!rows.length) {
          return new Response(JSON.stringify({ purged: 0 }), { headers: { "Content-Type": "application/json" } });
        }

        const paths = rows.flatMap((row) => [row.storage_path, row.thumb_path]).filter(Boolean) as string[];
        const removal = await supabaseAdmin.storage.from(BUCKET).remove(paths);
        if (removal.error) {
          return new Response(JSON.stringify({ error: removal.error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const del = await supabaseAdmin
          .from("entry_photos")
          .delete()
          .in(
            "id",
            rows.map((row) => row.id),
          );
        if (del.error) {
          return new Response(JSON.stringify({ error: del.error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ purged: rows.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
