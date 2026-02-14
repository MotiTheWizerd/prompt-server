"use client";

import { useEffect } from "react";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { CTAFooter } from "@/components/landing/cta-footer";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function LandingPage() {
  const { send, on, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    send("ping", {});

    const unsub = on("connection.ready", (data) => {
      console.log("WS connection.ready:", data);
    });
    return unsub;
  }, [isConnected, send, on]);

  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <UseCases />
      <CTAFooter />
    </main>
  );
}
