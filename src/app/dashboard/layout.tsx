"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("authenticated") !== "true") {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="h-screen flex bg-gray-950 text-white">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
