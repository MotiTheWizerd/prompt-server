"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";

const steps = [
  {
    number: "01",
    title: "Drop your nodes",
    description:
      "Drag processing nodes from the sidebar onto the canvas — prompts, enhancers, translators, image generators.",
  },
  {
    number: "02",
    title: "Connect the flow",
    description:
      "Wire outputs to inputs. Each connection defines how data flows through your AI pipeline.",
  },
  {
    number: "03",
    title: "Hit play",
    description:
      "Run your pipeline end-to-end. Watch results propagate through each node in real time.",
  },
];

export function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Three steps to your first pipeline
      </h2>
      <p className="mx-auto mb-14 max-w-xl text-center text-gray-400">
        Go from idea to working AI workflow in minutes.
      </p>

      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.15, ease: "easeOut" }}
            className="relative text-center md:text-left"
          >
            {/* Step number */}
            <span className="mb-4 inline-block text-5xl font-bold text-gray-800">
              {step.number}
            </span>

            {/* Connector line (desktop only) */}
            {i < steps.length - 1 && (
              <div className="absolute right-0 top-8 hidden h-px w-8 translate-x-full bg-gray-800 md:block" />
            )}

            <h3 className="mb-2 text-xl font-semibold text-white">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
