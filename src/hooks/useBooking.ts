import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { Booking } from '@/types/booking.types';

export const useBooking = () => {
    const { user } = useAuthStore();
    const { setActiveBookings, setIsLoading } = useBookingStore();

    useEffect(() => {
        if (!user) {
            setActiveBookings([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('borrowerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeBookings = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
                .filter(b => !['completed', 'cancelled', 'disputed'].includes(b.status));

            setActiveBookings(activeBookings);
            setIsLoading(false);
        }, (error) => {
            console.error('Error listening to active bookings:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);
};
