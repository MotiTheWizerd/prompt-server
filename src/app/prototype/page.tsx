"use client";

import { useState, useRef } from "react";
import {
  UserRound,
  ImagePlus,
  Crosshair,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ImageItem {
  data: string;
  filename: string;
  type: "reference" | "persona" | "target";
}

function ImageSlot({
  image,
  onUpload,
  onRemove,
  label,
  icon,
  accept,
}: {
  image: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  label: string;
  icon: React.ReactNode;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || "image/*"}
        onChange={(e) => {
          onUpload(e);
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="hidden"
      />
      <div className="text-xs text-gray-400 mb-1.5 font-medium">{label}</div>
      {image ? (
        <div className="relative group">
          <img
            src={image}
            alt={label}
            className="w-full h-40 object-cover rounded-lg border border-gray-700"
          />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-gray-600 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors cursor-pointer gap-2"
        >
          {icon}
          <span className="text-xs text-gray-500">Click to upload</span>
        </button>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-emerald-400 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function PrototypePage() {
  const [personaImage, setPersonaImage] = useState("");
  const [targetImage, setTargetImage] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [additionalText, setAdditionalText] = useState("");
  const [provider, setProvider] = useState("mistral");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "step1" | "step2" | "done">("idle");
  const [personaDescription, setPersonaDescription] = useState("");
  const [replacePrompt, setReplacePrompt] = useState("");
  const [timing, setTiming] = useState<{ step1Ms: number; step2Ms: number; totalMs: number } | null>(null);
  const [error, setError] = useState("");

  const refInputRef = useRef<HTMLInputElement>(null);

  const handleFileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const addReferenceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || referenceImages.length >= 5) return;
    const data = await handleFileToBase64(file);
    setReferenceImages((prev) => [...prev, data]);
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRun = async () => {
    if (!personaImage || !targetImage) {
      setError("Both persona and target images are required");
      return;
    }

    setLoading(true);
    setError("");
    setPersonaDescription("");
    setReplacePrompt("");
    setTiming(null);
    setStep("step1");

    try {
      const images: ImageItem[] = [
        ...referenceImages.map((data, i) => ({
          data,
          filename: `reference-${i + 1}.jpg`,
          type: "reference" as const,
        })),
        { data: personaImage, filename: "persona.jpg", type: "persona" as const },
        { data: targetImage, filename: "target.jpg", type: "target" as const },
      ];

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          text: additionalText || undefined,
          providerId: provider,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Pipeline failed");
        setStep("idle");
      } else {
        setPersonaDescription(result.personaDescription || "");
        setStep("step2");
        setReplacePrompt(result.replacePrompt || "");
        setTiming(result.timing || null);
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Pipeline Prototype
          </h1>
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-purple-500"
        >
          <option value="mistral">Mistral AI</option>
          <option value="glm">GLM (Zhipu)</option>
          <option value="claude">Claude (CLI)</option>
        </select>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Image inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ImageSlot
            image={personaImage}
            onUpload={async (e) => {
              const file = e.target.files?.[0];
              if (file) setPersonaImage(await handleFileToBase64(file));
            }}
            onRemove={() => setPersonaImage("")}
            label="Persona Image"
            icon={<UserRound className="w-6 h-6 text-gray-500" />}
          />
          <ImageSlot
            image={targetImage}
            onUpload={async (e) => {
              const file = e.target.files?.[0];
              if (file) setTargetImage(await handleFileToBase64(file));
            }}
            onRemove={() => setTargetImage("")}
            label="Target Image"
            icon={<Crosshair className="w-6 h-6 text-gray-500" />}
          />

          {/* Reference images */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5 font-medium">
              Reference Images ({referenceImages.length}/5)
            </div>
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              onChange={addReferenceImage}
              className="hidden"
            />
            {referenceImages.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {referenceImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`ref-${i + 1}`}
                        className="w-full h-[72px] object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        onClick={() => removeReferenceImage(i)}
                        className="absolute top-1 right-1 p-0.5 rounded bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {referenceImages.length < 5 && (
                  <button
                    onClick={() => refInputRef.current?.click()}
                    className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-xs text-gray-500 hover:border-purple-500/50 hover:text-gray-400 transition-colors"
                  >
                    + Add reference
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => refInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-gray-600 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors cursor-pointer gap-2"
              >
                <ImagePlus className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Optional references</span>
              </button>
            )}
          </div>
        </div>

        {/* Additional text + run */}
        <div className="flex gap-3">
          <input
            value={additionalText}
            onChange={(e) => setAdditionalText(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500 placeholder-gray-600 transition-colors"
            placeholder="Additional instructions (optional)"
          />
          <button
            onClick={handleRun}
            disabled={loading || !personaImage || !targetImage}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Pipeline
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Progress indicator */}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {step === "step1" && "Step 1: Analyzing persona..."}
            {step === "step2" && "Step 2: Generating replace prompt..."}
          </div>
        )}

        {/* Results */}
        {(personaDescription || replacePrompt) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 result */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-400">
                  Step 1: Persona Description
                </h3>
                {personaDescription && <CopyButton text={personaDescription} />}
              </div>
              <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto leading-relaxed">
                {personaDescription || <span className="text-gray-600 italic">Processing...</span>}
              </div>
            </div>

            {/* Step 2 result */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-purple-400">
                  Step 2: Replace Prompt
                </h3>
                {replacePrompt && <CopyButton text={replacePrompt} />}
              </div>
              <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto leading-relaxed">
                {replacePrompt || <span className="text-gray-600 italic">Waiting for step 1...</span>}
              </div>
            </div>
          </div>
        )}

        {/* Timing */}
        {timing && (
          <div className="flex gap-4 text-[11px] text-gray-500">
            <span>Step 1: {(timing.step1Ms / 1000).toFixed(1)}s</span>
            <span>Step 2: {(timing.step2Ms / 1000).toFixed(1)}s</span>
            <span>Total: {(timing.totalMs / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
