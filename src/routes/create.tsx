import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Film,
  Loader2,
  Mic,
  Music4,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  generateScore,
  generateVoiceover,
  pollVideo,
  refineIdea,
  startVideo,
} from "@/lib/ai/studio.functions";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a Film — Aurum Studio" },
      {
        name: "description",
        content:
          "Step-by-step cinematic video creation: describe the idea, choose the format, add a voiceover and an original score, then render your film.",
      },
      { property: "og:title", content: "Create a Film — Aurum Studio" },
      {
        property: "og:description",
        content: "Idea to finished film in five guided steps, with voiceover and score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage;
});

const STEPS = ["Idea", "Format", "Prompt", "Voice", "Score", "Render"] as const;

function CreatePage() {
  return null;
}
