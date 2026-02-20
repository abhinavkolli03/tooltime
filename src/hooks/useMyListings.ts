import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { Tool } from '@/types/tool.types';

export const useMyListings = () => {
    const { user } = useAuthStore();
    const [listings, setListings] = useState<Tool[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setListings([]);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'tools'),
            where('lenderId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tools = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tool));
            setListings(tools);
            setIsLoading(false);
        }, (error) => {
            console.error('Error listening to my listings:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { listings, count: listings.length, isLoading };
};
