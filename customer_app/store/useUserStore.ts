import { create } from "zustand";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  email: string | null;
  [key: string]: any;
} | null;

interface UserState {
  user: User;
  loading: boolean;
  setUser: (user: User) => void;
  fetchUserSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  fetchUserSession: async () => {
    set({ loading: true });
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, loading: false });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
