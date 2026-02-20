import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, UserRole } from '@/types/user.types';

interface AuthState {
    user: FirebaseUser | null;
    profile: UserProfile | null;
    role: UserRole | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: FirebaseUser | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setRole: (role: UserRole | null) => void;
    clearAuth: () => void;
    setIsLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            profile: null,
            role: null,
            isLoading: true,
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setProfile: (profile) => set({ profile, role: profile?.role || null }),
            setRole: (role) => set({ role }),
            clearAuth: () => set({ user: null, profile: null, role: null, isAuthenticated: false }),
            setIsLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'tooltime-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ role: state.role }), // strictly persist role
        }
    )
);
