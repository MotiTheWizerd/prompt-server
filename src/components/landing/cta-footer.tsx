"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { GradientText } from "./gradient-text";
import { BRAND } from "@/lib/constants";

export function CTAFooter() {
  return (
    <>
      {/* CTA Section */}
      <SectionWrapper className="relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-gradient-to-br from-blue-600/8 via-purple-600/5 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to build your first pipeline?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-gray-400">
            Start composing AI workflows in minutes. No configuration required.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-500/20"
          >
            Get Started — Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionWrapper>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <GradientText className="text-sm font-semibold">
            {BRAND.name}
          </GradientText>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
