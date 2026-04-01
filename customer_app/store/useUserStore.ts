import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { getCusUserById } from "@/lib/supabase-app-functions"; // 👈 import it

type AppUser = {
  id: string;
  email?: string;

  username?: string;
  profileImage?: string | null;
  custom_role?: string;
  phone?: string | null;
};

type UserState = {
  user: AppUser | null;
  loading: boolean;

  setUser: (user: AppUser | null) => void;
  fetchUserSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  fetchUserSession: async () => {
    set({ loading: true });

    try {
      // 🔹 get auth session
      const { data: sessionData, error } = await supabase.auth.getSession();

      if (error) throw error;

      const authUser = sessionData.session?.user;

      if (!authUser) {
        set({ user: null, loading: false });
        return;
      }

      // 🔥 use YOUR function here
      const customUser = await getCusUserById(authUser.id);

      // 🔥 merge
      const mergedUser: AppUser = {
        id: authUser.id,
        email: authUser.email,

        username: customUser?.username,
        profileImage: customUser?.profileImage,
        custom_role: customUser?.custom_role,
        phone: customUser?.phone,
      };

      set({ user: mergedUser, loading: false });
    } catch (err) {
      console.error("❌ fetchUserSession error:", err);
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
