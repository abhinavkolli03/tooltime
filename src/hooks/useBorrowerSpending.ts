import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { Booking } from '@/types/booking.types';

export const useBorrowerSpending = () => {
    const { user } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setBookings([]);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'bookings'),
            where('borrowerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
            setBookings(data);
            setIsLoading(false);
        }, (error) => {
            console.error('Error listening to borrower bookings:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const completed = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);

    const thisMonthSpending = useMemo(() => {
        const now = new Date();
        return completed
            .filter(b => {
                const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, b) => sum + (b.totalCharged || 0), 0);
    }, [completed]);

    const allTimeSpending = useMemo(
        () => completed.reduce((sum, b) => sum + (b.totalCharged || 0), 0),
        [completed],
    );

    const totalRentals = completed.length;

    return { thisMonthSpending, allTimeSpending, totalRentals, isLoading };
};
