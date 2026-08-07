import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/video-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
          return new Response("Bad id", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Not configured", { status: 500 });

        const upstream = await fetch(`https://ai.gateway.lovable.dev/v1/videos/${id}/content`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("Video not available", { status: 502 });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
