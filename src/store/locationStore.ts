import { create } from 'zustand';

interface LocationState {
    userLocation: {
        latitude: number;
        longitude: number;
    } | null;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
    userLocation: null,
    setUserLocation: (location) => set({ userLocation: location }),
}));
