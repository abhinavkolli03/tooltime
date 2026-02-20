import { create } from 'zustand';
import { Booking } from '@/types/booking.types';

interface BookingState {
    activeBooking: Booking | null;
    isLoading: boolean;
    setActiveBooking: (booking: Booking | null) => void;
    setIsLoading: (isLoading: boolean) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    activeBooking: null,
    isLoading: true,
    setActiveBooking: (booking) => set({ activeBooking: booking }),
    setIsLoading: (isLoading) => set({ isLoading }),
}));
