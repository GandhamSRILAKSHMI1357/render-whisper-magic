import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function lovableKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY missing");
  return k;
}

function elevenKey() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ElevenLabs is not connected to this project");
  return k;
}

async function gatewayError(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  if (res.status === 429) throw new Error("Too many jobs running. Wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
  throw new Error(`AI error ${res.status}: ${text.slice(0, 250)}`);
}

/* ---------------------------------- Step 1: refine the idea into a prompt ---- */

export const refineIdea = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      idea: z.string().min(1).max(6000),
      format: z.enum(["9:16", "16:9"]),
      seconds: z.enum(["4", "6", "8"]),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey() },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a cinematographer writing prompts for a text-to-video model. Turn the user's idea or script into ONE dense English paragraph (max 950 characters) describing subject, wardrobe, setting, camera movement, lens, lighting, colour grade and mood. No headings, no shot numbers, no markdown, no dialogue quotes. Output only the paragraph.",
          },
          {
            role: "user",
            content: `Format: ${data.format} vertical-or-wide. Duration: ${data.seconds} seconds.\n\nIdea:\n${data.idea}`,
          },
        ],
      }),
    });
    if (!res.ok) await gatewayError(res);
    const json = await res.json();
    const prompt = String(json?.choices?.[0]?.message?.content ?? "").trim().slice(0, 1000);
    if (!prompt) throw new Error("Could not build a prompt from that idea.");
    return { prompt };
  });

/* ---------------------------------- Step 2: video job ------------------------ */

export const startVideo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      prompt: z.string().min(1).max(1200),
      format: z.enum(["9:16", "16:9"]),
      seconds: z.enum(["4", "6", "8"]),
      quality: z.enum(["lite", "fast", "best"]).default("lite"),
    }),
  )
  .handler(async ({ data }) => {
    const model =
      data.quality === "best"
        ? "google/veo-3.1"
        : data.quality === "fast"
          ? "google/veo-3.1-fast"
          : "google/veo-3.1-lite";

    const res = await fetch(`${GATEWAY}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey()}` },
      body: JSON.stringify({
        model,
        prompt: data.prompt,
        seconds: data.seconds,
        size: data.format === "9:16" ? "720x1280" : "1280x720",
      }),
    });
    if (!res.ok) await gatewayError(res);
    const job = await res.json();
    return { id: String(job.id), status: String(job.status ?? "in_progress") };
  });

export const pollVideo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/) }))
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/videos/${data.id}`, {
      headers: { Authorization: `Bearer ${lovableKey()}` },
    });
    if (!res.ok) await gatewayError(res);
    const job = await res.json();
    return {
      status: String(job.status ?? "in_progress"),
      progress: Number(job.progress ?? 0),
      error: job?.error?.message ? String(job.error.message) : null,
    };
  });

/* ---------------------------------- Step 3: voiceover ------------------------ */

export const generateVoiceover = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      text: z.string().min(1).max(2500),
      voiceId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9]+$/).default("XrExE9yKIg1WjnnlVkGX"),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": elevenKey(), "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true },
        }),
      },
    );
    if (!res.ok) throw new Error(`Voiceover failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const buf = await res.arrayBuffer();
    return { audio: Buffer.from(buf).toString("base64") };
  });

/* ---------------------------------- Step 4: music ---------------------------- */

export const generateScore = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      prompt: z.string().min(1).max(1000),
      seconds: z.number().min(5).max(60).default(15),
    }),
  )
  .handler(async ({ data }) => {
    const res = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: { "xi-api-key": elevenKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: data.prompt,
        music_length_ms: Math.round(data.seconds * 1000),
      }),
    });
    if (!res.ok) throw new Error(`Score failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const buf = await res.arrayBuffer();
    return { audio: Buffer.from(buf).toString("base64") };
  });
