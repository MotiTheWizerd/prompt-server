"use client";

import { useUserStore } from "@/store/user-store";

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-7 h-7 text-[11px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function UserAvatar({ size = "md", className = "" }: UserAvatarProps) {
  const user = useUserStore((s) => s.user);

  const initials = getInitials(user?.name, user?.email);

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-semibold text-white select-none shrink-0 ${className}`}
      title={user?.name || user?.email || "User"}
    >
      {initials}
    </div>
  );
}
