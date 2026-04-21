import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { getQueryBounds, getDistanceKm } from '@/services/geo';
import { Tool } from '@/types/tool.types';

export interface ToolWithDistance extends Tool {
    distanceKm: number;
}

export const useNearbyTools = (centerLat: number | null, centerLng: number | null, radiusKm: number = 5) => {
    const [tools, setTools] = useState<ToolWithDistance[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const lastQueryLocation = useRef<{ lat: number, lng: number } | null>(null);
    const cachedTools = useRef<ToolWithDistance[]>([]);

    useEffect(() => {
        if (centerLat === null || centerLng === null) return;

        if (lastQueryLocation.current) {
            const distanceMoved = getDistanceKm(
                centerLat, centerLng,
                lastQueryLocation.current.lat, lastQueryLocation.current.lng
            );
            if (distanceMoved < 0.1 && cachedTools.current.length > 0) {
                setTools(cachedTools.current);
                return;
            }
        }

        const fetchNearbyTools = async () => {
            setIsLoading(true);
            try {
                const currentUserId = auth.currentUser?.uid;
                const bounds = getQueryBounds(centerLat, centerLng, radiusKm);
                const promises = bounds.map(bound => {
                    const q = query(
                        collection(db, 'tools'),
                        orderBy('geohash'),
                        startAt(bound[0]),
                        endAt(bound[1])
                    );
                    return getDocs(q);
                });

                const snapshots = await Promise.all(promises);
                const allDocs: any[] = [];

                snapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        allDocs.push({ id: doc.id, ...doc.data() });
                    });
                });

                const uniqueTools = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

                const filteredTools: ToolWithDistance[] = uniqueTools
                    .filter(tool => tool.isAvailable === true)
                    .filter(tool => tool.lenderId !== currentUserId)
                    .map(tool => ({
                        ...tool,
                        rating: tool.rating ?? 0,
                        rentalCount: tool.rentalCount ?? 0,
                        description: tool.description || '',
                        specs: tool.specs || [],
                        photoUrls: tool.photoUrls?.length ? tool.photoUrls : ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop'],
                        distanceKm: getDistanceKm(tool.lat, tool.lng, centerLat, centerLng),
                    }))
                    .filter(tool => tool.distanceKm <= radiusKm)
                    .sort((a, b) => a.distanceKm - b.distanceKm);

                setTools(filteredTools);
                cachedTools.current = filteredTools;
                lastQueryLocation.current = { lat: centerLat, lng: centerLng };
            } catch (error) {
                console.error('Error fetching nearby tools:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNearbyTools();
    }, [centerLat, centerLng, radiusKm]);

    return { tools, isLoading };
};
