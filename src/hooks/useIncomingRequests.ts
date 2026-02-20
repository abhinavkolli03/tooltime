import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { Booking } from '@/types/booking.types';
import { Tool } from '@/types/tool.types';
import { UserProfile } from '@/types/user.types';

export type RequestWithDetails = Booking & {
    tool?: Tool;
    borrowerProfile?: UserProfile;
};

export const useIncomingRequests = () => {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<RequestWithDetails[]>([]);
    const [allBookings, setAllBookings] = useState<RequestWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setRequests([]);
            setAllBookings([]);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'bookings'),
            where('lenderId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const bookingsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

            const enriched = await Promise.all(bookingsData.map(async (b) => {
                try {
                    const [toolDoc, borrowerDoc] = await Promise.all([
                        getDoc(doc(db, 'tools', b.toolId)),
                        getDoc(doc(db, 'users', b.borrowerId))
                    ]);
                    return {
                        ...b,
                        tool: toolDoc.exists() ? { id: toolDoc.id, ...toolDoc.data() } as Tool : undefined,
                        borrowerProfile: borrowerDoc.exists() ? borrowerDoc.data() as UserProfile : undefined,
                    };
                } catch {
                    return { ...b };
                }
            }));

            const pending = enriched.filter(b => b.status === 'pending');
            setRequests(pending);
            setAllBookings(enriched);
            setIsLoading(false);
        }, (error) => {
            console.error('Error listening to incoming requests:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { requests, allBookings, count: requests.length, isLoading };
};
