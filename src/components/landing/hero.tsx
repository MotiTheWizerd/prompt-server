"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { GradientText } from "./gradient-text";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: "easeOut" as const },
});

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div {...fade(0)}>
          <GradientText as="h1" className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            {BRAND.name}
          </GradientText>
        </motion.div>

        <motion.h2
          {...fade(0.15)}
          className="mt-6 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl"
        >
          {BRAND.tagline}
        </motion.h2>

        <motion.p
          {...fade(0.25)}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400"
        >
          {BRAND.description}
        </motion.p>

        <motion.div
          {...fade(0.4)}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-500/20"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() =>
              document
                .getElementById("how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            See How It Works
          </button>
        </motion.div>
      </div>
    </section>
  );
}
