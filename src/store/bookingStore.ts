import { create } from 'zustand';
import { Booking } from '@/types/booking.types';

interface BookingState {
    activeBooking: Booking | null;
    activeBookings: Record<string, Booking>;
    isLoading: boolean;
    setActiveBookings: (bookings: Booking[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    getBookingById: (id: string) => Booking | null;
}

export const useBookingStore = create<BookingState>((set, get) => ({
    activeBooking: null,
    activeBookings: {},
    isLoading: true,
    setActiveBookings: (bookings) => {
        const record: Record<string, Booking> = {};
        for (const b of bookings) record[b.id] = b;
        set({
            activeBookings: record,
            activeBooking: bookings.length > 0 ? bookings[0] : null,
        });
    },
    setIsLoading: (isLoading) => set({ isLoading }),
    getBookingById: (id) => get().activeBookings[id] ?? null,
}));
