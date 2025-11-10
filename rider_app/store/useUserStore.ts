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
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Supabase auth error:", error);

        // If user doesn't exist, log out
        if (
          error.message.includes("User from sub claim in JWT does not exist")
        ) {
          await supabase.auth.signOut();
          set({ user: null });
        }

        set({ loading: false });
        return;
      }

      set({ user: data?.user ?? null, loading: false });
    } catch (err) {
      console.error("Unexpected error fetching user:", err);
      await supabase.auth.signOut();
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
