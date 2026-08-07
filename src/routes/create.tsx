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
  component: CreatePage,
});

const STEPS = ["Idea", "Format", "Prompt", "Voice", "Score", "Render"] as const;

const VOICES = [
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda — warm, intimate" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — soft narration" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel — deep, cinematic" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George — classic trailer" },
];

function CreatePage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // step data
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState<"9:16" | "16:9">("9:16");
  const [seconds, setSeconds] = useState<"4" | "6" | "8">("8");
  const [quality, setQuality] = useState<"lite" | "fast" | "best">("lite");
  const [prompt, setPrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [scorePrompt, setScorePrompt] = useState("");
  const [scoreUrl, setScoreUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const doRefine = useServerFn(refineIdea);
  const doStart = useServerFn(startVideo);
  const doPoll = useServerFn(pollVideo);
  const doVoice = useServerFn(generateVoiceover);
  const doScore = useServerFn(generateScore);

  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const scoreRef = useRef<HTMLAudioElement>(null);

  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // poll the render job
  useEffect(() => {
    if (!videoId || videoUrl) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await doPoll({ data: { id: videoId } });
        if (!alive) return;
        setProgress(r.progress || 0);
        if (r.status === "completed") {
          setVideoUrl(`/api/video-content?id=${videoId}`);
        } else if (r.status === "failed") {
          setError(r.error ?? "Render failed. Try a different prompt.");
          setVideoId(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Render check failed");
      }
    };
    const t = setInterval(tick, 7000);
    void tick();
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [videoId, videoUrl, doPoll]);

  // play video + layered audio together
  const playAll = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    if (voiceRef.current) {
      voiceRef.current.currentTime = 0;
      void voiceRef.current.play();
    }
    if (scoreRef.current) {
      scoreRef.current.currentTime = 0;
      scoreRef.current.volume = 0.4;
      void scoreRef.current.play();
    }
    void v.play();
  };

  const beginRender = () =>
    run(async () => {
      setVideoUrl(null);
      setProgress(0);
      const r = await doStart({
        data: { prompt: prompt || idea.slice(0, 1000), format, seconds, quality },
      });
      setVideoId(r.id);
    });

  return (
    <main className="min-h-screen bg-background text-foreground grain">
      <div className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to studio
        </Link>

        <header className="mt-6">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/70">Aurum Studio</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Create a film</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Six guided steps. Use what the studio suggests, or skip any step you don't need.
          </p>
        </header>

        {/* progress rail */}
        <ol className="mt-8 flex flex-wrap items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                  i === step
                    ? "border-primary bg-primary/10 text-primary"
                    : i < step
                      ? "border-primary/30 text-primary/70"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-border">·</span>}
            </li>
          ))}
        </ol>

        <section className="mt-8 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
          {/* STEP 0 — IDEA */}
          {step === 0 && (
            <div className="space-y-4">
              <StepHead
                icon={Sparkles}
                title="What are we making?"
                hint="Paste a full script, a treatment, or just one sentence."
              />
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={10}
                placeholder="TITLE: THE ETERNAL GLANCE — a woman in an emerald silk saree on the steps of a 10th-century temple at golden hour..."
                className="w-full resize-y rounded-xl border border-border bg-background/60 p-4 text-sm outline-none focus:border-primary/60"
              />
              <Nav
                onNext={next}
                nextDisabled={idea.trim().length < 3}
                nextLabel="Use this idea"
              />
            </div>
          )}

          {/* STEP 1 — FORMAT */}
          {step === 1 && (
            <div className="space-y-6">
              <StepHead icon={Film} title="Format & length" hint="Shorts vertical, or YouTube widescreen." />
              <Choice
                label="Aspect ratio"
                value={format}
                onChange={(v) => setFormat(v as typeof format)}
                options={[
                  { v: "9:16", l: "9:16 Shorts / Reels" },
                  { v: "16:9", l: "16:9 YouTube" },
                ]}
              />
              <Choice
                label="Clip length"
                value={seconds}
                onChange={(v) => setSeconds(v as typeof seconds)}
                options={[
                  { v: "4", l: "4 sec" },
                  { v: "6", l: "6 sec" },
                  { v: "8", l: "8 sec" },
                ]}
              />
              <Choice
                label="Quality"
                value={quality}
                onChange={(v) => setQuality(v as typeof quality)}
                options={[
                  { v: "lite", l: "Draft" },
                  { v: "fast", l: "High" },
                  { v: "best", l: "Maximum" },
                ]}
              />
              <Nav onBack={back} onNext={next} nextLabel="Continue" />
            </div>
          )}

          {/* STEP 2 — PROMPT */}
          {step === 2 && (
            <div className="space-y-4">
              <StepHead
                icon={Wand2}
                title="Cinematic prompt"
                hint="Let the studio rewrite your idea into a director's prompt — or skip and use it as-is."
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await doRefine({ data: { idea, format, seconds } });
                    setPrompt(r.prompt);
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Write the prompt
              </button>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={7}
                placeholder="Your generated prompt appears here — edit freely."
                className="w-full resize-y rounded-xl border border-border bg-background/60 p-4 text-sm outline-none focus:border-primary/60"
              />
              <Nav onBack={back} onNext={next} onSkip={next} nextLabel="Use this prompt" />
            </div>
          )}

          {/* STEP 3 — VOICE */}
          {step === 3 && (
            <div className="space-y-4">
              <StepHead icon={Mic} title="Voiceover" hint="Optional narration or whispered dialogue." />
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                rows={4}
                placeholder="Time stands still... where the earth meets the heavens."
                className="w-full resize-y rounded-xl border border-border bg-background/60 p-4 text-sm outline-none focus:border-primary/60"
              />
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary/60"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || voiceText.trim().length < 2}
                onClick={() =>
                  run(async () => {
                    const r = await doVoice({ data: { text: voiceText, voiceId } });
                    setVoiceUrl(`data:audio/mpeg;base64,${r.audio}`);
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                Generate voiceover
              </button>
              {voiceUrl && <audio controls src={voiceUrl} className="w-full" />}
              <Nav onBack={back} onNext={next} onSkip={() => { setVoiceUrl(null); next(); }} nextLabel="Use this voice" />
            </div>
          )}

          {/* STEP 4 — SCORE */}
          {step === 4 && (
            <div className="space-y-4">
              <StepHead icon={Music4} title="Original score" hint="Describe the mood, instruments and tempo." />
              <textarea
                value={scorePrompt}
                onChange={(e) => setScorePrompt(e.target.value)}
                rows={3}
                placeholder="Slow haunting sitar, distant temple bells, warm tanpura drone, cinematic and reverent."
                className="w-full resize-y rounded-xl border border-border bg-background/60 p-4 text-sm outline-none focus:border-primary/60"
              />
              <button
                type="button"
                disabled={busy || scorePrompt.trim().length < 3}
                onClick={() =>
                  run(async () => {
                    const r = await doScore({ data: { prompt: scorePrompt, seconds: Number(seconds) + 4 } });
                    setScoreUrl(`data:audio/mpeg;base64,${r.audio}`);
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music4 className="h-4 w-4" />}
                Compose score
              </button>
              {scoreUrl && <audio controls src={scoreUrl} className="w-full" />}
              <Nav onBack={back} onNext={next} onSkip={() => { setScoreUrl(null); next(); }} nextLabel="Use this score" />
            </div>
          )}

          {/* STEP 5 — RENDER */}
          {step === 5 && (
            <div className="space-y-5">
              <StepHead icon={Film} title="Render your film" hint="This takes 1–3 minutes." />
              <div className="rounded-xl border border-border bg-background/50 p-4 text-xs text-muted-foreground">
                <p>
                  <span className="text-primary">Format</span> {format} · {seconds}s · {quality}
                </p>
                <p className="mt-2 line-clamp-3">{prompt || idea}</p>
                <p className="mt-2">
                  Voiceover {voiceUrl ? "on" : "skipped"} · Score {scoreUrl ? "on" : "skipped"}
                </p>
              </div>

              {!videoUrl && (
                <button
                  type="button"
                  disabled={busy || Boolean(videoId)}
                  onClick={beginRender}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy || videoId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                  {videoId ? `Rendering… ${progress}%` : "Generate video"}
                </button>
              )}

              {videoUrl && (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    className={`w-full rounded-xl border border-border ${format === "9:16" ? "max-w-xs mx-auto" : ""}`}
                  />
                  {voiceUrl && <audio ref={voiceRef} src={voiceUrl} className="hidden" />}
                  {scoreUrl && <audio ref={scoreRef} src={scoreUrl} className="hidden" />}
                  <div className="flex flex-wrap gap-3">
                    {(voiceUrl || scoreUrl) && (
                      <button
                        type="button"
                        onClick={playAll}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                      >
                        <Sparkles className="h-4 w-4" /> Play with audio
                      </button>
                    )}
                    <a
                      href={videoUrl}
                      download="aurum-film.mp4"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
                    >
                      <Download className="h-4 w-4" /> Download video
                    </a>
                    {voiceUrl && (
                      <a
                        href={voiceUrl}
                        download="voiceover.mp3"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
                      >
                        <Download className="h-4 w-4" /> Voiceover
                      </a>
                    )}
                    {scoreUrl && (
                      <a
                        href={scoreUrl}
                        download="score.mp3"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
                      >
                        <Download className="h-4 w-4" /> Score
                      </a>
                    )}
                  </div>
                </div>
              )}

              <Nav onBack={back} />
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function StepHead({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Sparkles;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === o.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  onSkip,
  nextLabel = "Continue",
  nextDisabled,
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Skip
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
