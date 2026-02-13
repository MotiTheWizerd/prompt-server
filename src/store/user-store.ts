import { create } from "zustand";

export interface UserDetails {
  id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

interface UserStore {
  user: UserDetails | null;
  setUser: (user: UserDetails) => void;
  clearUser: () => void;
}

const USER_STORAGE_KEY = "user_details";

function loadUser(): UserDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useUserStore = create<UserStore>((set) => ({
  user: loadUser(),

  setUser: (user) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  clearUser: () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    set({ user: null });
  },
}));
