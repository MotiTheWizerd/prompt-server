"use client";

import { motion } from "framer-motion";
import { ImageIcon, UserRoundPen, ScanEye, Puzzle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

interface UseCase {
  icon: LucideIcon;
  accentColor: string;
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    icon: ImageIcon,
    accentColor: "border-blue-500 text-blue-400",
    title: "AI Art Pipelines",
    description:
      "Chain prompt generation, enhancement, and image generation into repeatable creative workflows.",
  },
  {
    icon: UserRoundPen,
    accentColor: "border-amber-500 text-amber-400",
    title: "Character-Consistent Content",
    description:
      "Maintain visual identity across generated images using persistent persona descriptions.",
  },
  {
    icon: ScanEye,
    accentColor: "border-emerald-500 text-emerald-400",
    title: "Image Analysis Workflows",
    description:
      "Describe images, extract details, and feed descriptions into downstream generation nodes.",
  },
  {
    icon: Puzzle,
    accentColor: "border-purple-500 text-purple-400",
    title: "Composable AI Agents",
    description:
      "Build complex multi-step AI processes from simple, reusable building blocks.",
  },
];

export function UseCases() {
  return (
    <SectionWrapper id="use-cases">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Built for creators and developers
      </h2>
      <p className="mx-auto mb-14 max-w-xl text-center text-gray-400">
        Whatever your AI workflow looks like, the tools are here.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {useCases.map((uc, i) => {
          const Icon = uc.icon;
          const [borderColor, textColor] = uc.accentColor.split(" ");

          return (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className={`rounded-xl border-l-2 ${borderColor} bg-gray-900/40 py-5 pl-5 pr-6 transition-colors hover:bg-gray-900/60`}
            >
              <div className="flex items-start gap-4">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${textColor}`} />
                <div>
                  <h3 className="mb-1 text-base font-semibold text-white">
                    {uc.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {uc.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
