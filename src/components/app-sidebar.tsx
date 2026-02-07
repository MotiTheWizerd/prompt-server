"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Workflow, UserRound, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: Workflow, label: "Editor", color: "text-blue-400" },
  { href: "/dashboard/characters", icon: UserRound, label: "Characters", color: "text-amber-400" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings", color: "text-gray-400" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem("authenticated");
    router.replace("/");
  };

  return (
    <aside className="w-14 border-r border-gray-800 bg-gray-950 flex flex-col items-center py-3 gap-1 shrink-0">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative group flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isActive
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive ? item.color : ""}`} />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 text-[11px] font-medium text-white bg-gray-800 border border-gray-700 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </span>
          </Link>
        );
      })}

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="relative group flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2 py-1 text-[11px] font-medium text-white bg-gray-800 border border-gray-700 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
