import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY missing");
  return k;
}

async function gatewayError(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
  throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
}

/** Text / script / dialogue generation */
export const generateText = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      prompt: z.string().min(1).max(4000),
      mode: z.enum(["any", "script", "dialogue", "song-lyrics", "shot-list"]).default("any"),
    }),
  )
  .handler(async ({ data }) => {
    const systems: Record<string, string> = {
      any: "You are a versatile creative AI. Answer richly and helpfully. Use markdown.",
      script: "You are a screenwriter. Write a compelling short script with scene headings, action, and dialogue.",
      dialogue: "You are a dialogue writer. Write natural, character-driven dialogue with stage directions in italics.",
      "song-lyrics":
        "You are a songwriter. Write lyrics with [Verse], [Chorus], [Bridge] tags. Include a brief mood/tempo note.",
      "shot-list": "You are a film director. Produce a numbered shot list with camera, lens, action, and duration.",
    };

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key() },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systems[data.mode] },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!res.ok) await gatewayError(res);
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    return { content: String(content) };
  });

/** Image generation -> returns base64 data URL */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      prompt: z.string().min(1).max(2000),
      aspect: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
    }),
  )
  .handler(async ({ data }) => {
    const sizeHint =
      data.aspect === "9:16"
        ? "vertical 9:16 portrait composition"
        : data.aspect === "1:1"
          ? "square 1:1 composition"
          : "cinematic 16:9 widescreen composition";

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key() },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate a cinematic, high-detail image. ${sizeHint}. Subject: ${data.prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) await gatewayError(res);
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const url: string | undefined = msg?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("No image returned");
    return { dataUrl: url };
  });
