import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Film,
  Image as ImageIcon,
  Music4,
  Sparkles,
  Type,
  Wand2,
  Mic,
  Loader2,
  Download,
  ArrowRight,
} from "lucide-react";

import heroNoir from "@/assets/hero-noir.jpg";
import { generateImage, generateText } from "@/lib/ai/generate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum — Cinematic AI Studio" },
      {
        name: "description",
        content:
          "Type a prompt. Aurum generates scripts, dialogue, song lyrics, cinematic images, short reels and long-form video concepts — in one cinematic studio.",
      },
      { property: "og:title", content: "Aurum — Cinematic AI Studio" },
      {
        property: "og:description",
        content: "From prompt to picture, score and screenplay. One studio.",
      },
    ],
  }),
  component: Index,
});

type Mode =
  | "any"
  | "script"
  | "dialogue"
  | "song-lyrics"
  | "image-16x9"
  | "image-9x16"
  | "image-1x1"
  | "short-video"
  | "long-video"
  | "music"
  | "sfx";

const MODES: { id: Mode; label: string; hint: string; icon: typeof Type; group: string }[] = [
  { id: "any", label: "Anything", hint: "Open-ended generation", icon: Sparkles, group: "Text" },
  { id: "script", label: "Script", hint: "Scene-by-scene screenplay", icon: Clapperboard, group: "Text" },
  { id: "dialogue", label: "Dialogue", hint: "Character lines & beats", icon: Mic, group: "Text" },
  { id: "song-lyrics", label: "Song Lyrics", hint: "Verses, chorus, bridge", icon: Music4, group: "Text" },
  { id: "image-16x9", label: "Cinematic Still", hint: "16:9 widescreen frame", icon: ImageIcon, group: "Image" },
  { id: "image-9x16", label: "Vertical Poster", hint: "9:16 portrait", icon: ImageIcon, group: "Image" },
  { id: "image-1x1", label: "Square", hint: "1:1 cover art", icon: ImageIcon, group: "Image" },
  { id: "short-video", label: "Short / Reel", hint: "9:16 · ~15s storyboard", icon: Film, group: "Video" },
  { id: "long-video", label: "Long-form", hint: "16:9 · YouTube concept", icon: Film, group: "Video" },
  { id: "music", label: "Music Track", hint: "Score & soundtrack", icon: Music4, group: "Audio" },
  { id: "sfx", label: "Sound FX", hint: "Foley & ambience", icon: Wand2, group: "Audio" },
];

const SUGGESTIONS = [
  "A neo-noir detective interrogates an AI in a rain-soaked Tokyo alley",
  "Lo-fi study beat with vinyl crackle and distant city rain",
  "Opening monologue for a documentary about lost cosmonauts",
  "Vertical reel: golden hour surfer paddling into a glassy wave",
  "Power-ballad chorus about a city that never sleeps",
  "Storyboard a 90s heist film opening, six shots",
];

function Index() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("any");
  const [result, setResult] = useState<
    | { kind: "text"; content: string }
    | { kind: "image"; dataUrl: string }
    | { kind: "notice"; title: string; body: string }
    | null
  >(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const textFn = useServerFn(generateText);
  const imgFn = useServerFn(generateImage);

  const textMut = useMutation({
    mutationFn: (vars: { prompt: string; mode: "any" | "script" | "dialogue" | "song-lyrics" }) =>
      textFn({ data: vars }),
    onSuccess: (r) => setResult({ kind: "text", content: r.content }),
    onError: (e) => setResult({ kind: "notice", title: "Generation failed", body: (e as Error).message }),
  });

  const imgMut = useMutation({
    mutationFn: (vars: { prompt: string; aspect: "16:9" | "9:16" | "1:1" }) => imgFn({ data: vars }),
    onSuccess: (r) => setResult({ kind: "image", dataUrl: r.dataUrl }),
    onError: (e) => setResult({ kind: "notice", title: "Generation failed", body: (e as Error).message }),
  });

  const isBusy = textMut.isPending || imgMut.isPending;

  function run() {
    const p = prompt.trim();
    if (!p || isBusy) return;
    if (mode === "any" || mode === "script" || mode === "dialogue" || mode === "song-lyrics") {
      textMut.mutate({ prompt: p, mode });
      return;
    }
    if (mode === "image-16x9") return imgMut.mutate({ prompt: p, aspect: "16:9" });
    if (mode === "image-9x16") return imgMut.mutate({ prompt: p, aspect: "9:16" });
    if (mode === "image-1x1") return imgMut.mutate({ prompt: p, aspect: "1:1" });

    if (mode === "short-video" || mode === "long-video") {
      // Generate a storyboard / shot list via text for now.
      setResult(null);
      textMut.mutate({
        prompt: `${p}\n\nFormat as ${
          mode === "short-video" ? "a 15-second vertical 9:16 reel storyboard (6 shots)" : "a long-form 16:9 YouTube video treatment with logline, 5-act outline, and shot list"
        }.`,
        mode: "script",
      });
      return;
    }
    if (mode === "music" || mode === "sfx") {
      setResult({
        kind: "notice",
        title: mode === "music" ? "Music engine ready to connect" : "Sound FX engine ready to connect",
        body:
          "Aurum routes music and sound effects through ElevenLabs. Ask Lovable to connect the ElevenLabs app connector and this panel will start generating " +
          (mode === "music" ? "original tracks" : "foley & ambience") +
          " from your prompt in seconds.",
      });
    }
  }

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const activeMeta = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== Hero ===== */}
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroNoir}
            alt=""
            width={1920}
            height={1080}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        </div>

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
              <span className="font-display text-lg font-semibold">A</span>
            </div>
            <span className="font-display text-xl tracking-wide">Aurum</span>
          </div>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#studio" className="hover:text-foreground">Studio</a>
            <Link to="/create" className="hover:text-foreground">Create a film</Link>
            <a href="#capabilities" className="hover:text-foreground">Capabilities</a>
            <a href="#gallery" className="hover:text-foreground">Gallery</a>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold transition hover:brightness-110"
          >
            Create a film <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <div className="mx-auto max-w-7xl px-6 pb-28 pt-20 md:pb-40 md:pt-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-gold" /> Cinematic AI Studio
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] md:text-7xl">
              From a single prompt to a <em className="text-gradient-gold not-italic">whole production</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Aurum turns one line of text into scripts, dialogue, lyrics, cinematic stills, short reels and long-form
              video concepts — in a studio that feels designed, not generated.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#studio"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-medium text-primary-foreground shadow-gold transition hover:brightness-110"
              >
                Start creating <Sparkles className="h-4 w-4" />
              </a>
              <a href="#capabilities" className="text-sm text-muted-foreground hover:text-foreground">
                See what it makes →
              </a>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative border-y border-border/60 bg-card/30 py-4 backdrop-blur">
          <div className="flex w-max gap-12 whitespace-nowrap marquee px-6 font-display text-xl text-muted-foreground/70">
            {[...Array(2)].flatMap((_, i) =>
              ["Scripts", "Dialogue", "Song Lyrics", "Cinematic Stills", "Short Reels", "Long-form Video", "Music", "Sound Design"].map(
                (w) => (
                  <span key={`${i}-${w}`} className="flex items-center gap-12">
                    {w} <span className="text-primary">✦</span>
                  </span>
                ),
              ),
            )}
          </div>
        </div>
      </header>

      {/* ===== Studio ===== */}
      <section id="studio" className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Composer */}
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">The Studio</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Ask anything. Get a finished piece.</h2>
            <p className="mt-4 text-muted-foreground">
              Pick a format, type your idea, hit generate. The composer adapts to every mode — text, image, video, or
              audio.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={[
                      "group flex items-start gap-2 rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-primary/60 bg-primary/10 shadow-gold"
                        : "border-border bg-card/40 hover:border-primary/30 hover:bg-card",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                        active ? "bg-gradient-gold text-primary-foreground" : "bg-secondary text-primary",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{m.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{m.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPrompt(s);
                    taRef.current?.focus();
                  }}
                  className="rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Output / prompt panel */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-1 shadow-soft backdrop-blur">
              <div className="grain pointer-events-none absolute inset-0 rounded-3xl" />
              <div className="relative rounded-[1.4rem] bg-background/60 p-6">
                {/* Prompt */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary">
                      <activeMeta.icon className="h-3.5 w-3.5" />
                    </span>
                    {activeMeta.group} · {activeMeta.label}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{prompt.length}/4000</span>
                </div>

                <textarea
                  ref={taRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 4000))}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
                  }}
                  rows={5}
                  placeholder={`Describe your ${activeMeta.label.toLowerCase()}... e.g. ${SUGGESTIONS[0]}`}
                  className="mt-4 w-full resize-none rounded-2xl border border-border bg-input/40 p-4 font-sans text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none"
                />

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘/Ctrl ↵</kbd> to generate
                  </p>
                  <button
                    type="button"
                    onClick={run}
                    disabled={!prompt.trim() || isBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-gold transition disabled:opacity-50 enabled:hover:brightness-110"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating
                      </>
                    ) : (
                      <>
                        Generate <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Output */}
                <div className="mt-6 min-h-[280px] rounded-2xl border border-border bg-background/60 p-5">
                  {isBusy && (
                    <div className="space-y-3">
                      <div className="h-2 w-1/3 rounded-full bg-muted shimmer" />
                      <div className="h-2 w-2/3 rounded-full bg-muted shimmer" />
                      <div className="h-2 w-1/2 rounded-full bg-muted shimmer" />
                      <div className="mt-6 h-40 rounded-xl bg-muted shimmer" />
                    </div>
                  )}

                  {!isBusy && !result && (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <p className="mt-4 font-display text-xl">Your creation will appear here</p>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        Choose a format on the left, write your idea, and let Aurum direct the result.
                      </p>
                    </div>
                  )}

                  {!isBusy && result?.kind === "text" && (
                    <div className="prose-output">
                      <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-foreground/90">
                        {result.content}
                      </pre>
                    </div>
                  )}

                  {!isBusy && result?.kind === "image" && (
                    <div className="space-y-3">
                      <img
                        src={result.dataUrl}
                        alt="Generated"
                        className="w-full rounded-xl border border-border"
                      />
                      <a
                        href={result.dataUrl}
                        download={`aurum-${Date.now()}.png`}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground hover:border-primary/40"
                      >
                        <Download className="h-3.5 w-3.5" /> Download image
                      </a>
                    </div>
                  )}

                  {!isBusy && result?.kind === "notice" && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                      <p className="font-display text-xl text-foreground">{result.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{result.body}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Capabilities ===== */}
      <section id="capabilities" className="relative border-t border-border/60 bg-noir">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid items-end gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Capabilities</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">
                One studio. Every <em className="text-gradient-gold not-italic">format</em>.
              </h2>
            </div>
            <p className="text-muted-foreground md:text-right">
              Built on Lovable AI — text and image generation are live. Music and sound effects activate the moment you
              connect ElevenLabs. Real-time video rendering plugs into Replicate.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: Type,
                title: "Scripts & Dialogue",
                body: "Screenplays, monologues, character beats, ad copy, narration — formatted and ready to shoot.",
                status: "Live",
              },
              {
                icon: ImageIcon,
                title: "Cinematic Stills",
                body: "Widescreen frames, vertical posters and square covers with art-directed lighting.",
                status: "Live",
              },
              {
                icon: Music4,
                title: "Lyrics & Songwriting",
                body: "Full lyric sheets with verses, choruses, bridges and mood notes for your composer.",
                status: "Live",
              },
              {
                icon: Film,
                title: "Shorts & Reels",
                body: "Storyboards and shot lists for 9:16 vertical content — paced for the algorithm.",
                status: "Storyboard",
              },
              {
                icon: Clapperboard,
                title: "Long-form Video",
                body: "16:9 YouTube treatments, 5-act outlines and full director shot lists.",
                status: "Storyboard",
              },
              {
                icon: Wand2,
                title: "Music & Sound FX",
                body: "Original score and foley generated on demand — connect ElevenLabs to activate.",
                status: "Connect",
              },
            ].map((c) => (
              <div key={c.title} className="group relative bg-card p-8 transition hover:bg-card/70">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em]",
                      c.status === "Live"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : c.status === "Storyboard"
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {c.status}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Gallery ===== */}
      <section id="gallery" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Gallery</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl md:text-5xl">
                A reel of what your prompts can become.
              </h2>
            </div>
            <a
              href="#studio"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Make your own <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            <div className="relative col-span-2 row-span-2 overflow-hidden rounded-3xl border border-border">
              <img src={heroNoir} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-0 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Cinematic Still</p>
                <p className="mt-1 font-display text-2xl">"Golden hour, no witnesses."</p>
              </div>
            </div>
            {[
              { tag: "Short Reel", title: "Rain on a chrome city" },
              { tag: "Dialogue", title: "Two strangers, one elevator" },
              { tag: "Song Lyrics", title: "Ballad for the night shift" },
              { tag: "Long-form", title: "Doc: Lost Cosmonauts" },
            ].map((g) => (
              <div
                key={g.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:border-primary/40"
              >
                <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
                <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-primary">{g.tag}</p>
                <p className="mt-1 font-display text-lg">{g.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="border-t border-border/60 bg-noir">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Begin</p>
          <h2 className="mt-3 font-display text-5xl md:text-6xl">
            Direct your first <em className="text-gradient-gold not-italic">scene</em>.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            No accounts. No queues. Type your idea, and Aurum returns a finished piece — script, image, story or song.
          </p>
          <a
            href="#studio"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-medium text-primary-foreground shadow-gold transition hover:brightness-110"
          >
            Open the studio <Sparkles className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Aurum Studio · A cinematic AI experiment</p>
          <p className="font-display tracking-[0.2em] uppercase text-primary">Aurum</p>
        </div>
      </footer>
    </div>
  );
}
