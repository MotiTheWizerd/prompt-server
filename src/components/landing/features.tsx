"use client";

import {
  Workflow,
  Sparkles,
  UserRound,
  BookOpen,
  ImageIcon,
  Cpu,
} from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { FeatureCard } from "./feature-card";

const features = [
  {
    icon: Workflow,
    iconColor: "text-blue-400",
    title: "Visual Pipeline Editor",
    description:
      "Drag-and-drop nodes onto an infinite canvas. Connect inputs to outputs. See your entire AI workflow at a glance.",
  },
  {
    icon: Sparkles,
    iconColor: "text-violet-400",
    title: "Prompt Enhancement",
    description:
      "Built-in enhancers, translators, grammar fixers, and compressors. Refine prompts through composable stages.",
  },
  {
    icon: UserRound,
    iconColor: "text-amber-400",
    title: "Consistent Characters",
    description:
      "Upload a reference photo and let AI describe their features. Reuse personas across any workflow.",
  },
  {
    icon: BookOpen,
    iconColor: "text-emerald-400",
    title: "Story & Scene Building",
    description:
      "Generate rich narratives and atmospheric scene descriptions. Combine storytelling with visual generation.",
  },
  {
    icon: ImageIcon,
    iconColor: "text-fuchsia-400",
    title: "Multi-Model Image Gen",
    description:
      "Generate images through multiple AI providers. Switch models on the fly without changing your workflow.",
  },
  {
    icon: Cpu,
    iconColor: "text-orange-400",
    title: "Agentic Automation",
    description:
      "Build complex multi-step AI agents from simple, composable blocks. Automate just about anything.",
  },
];

export function Features() {
  return (
    <SectionWrapper id="features">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Everything you need to build with AI
      </h2>
      <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
        A complete toolkit for designing, testing, and deploying AI workflows — from text pipelines to image generation.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} index={i} />
        ))}
      </div>
    </SectionWrapper>
  );
}
