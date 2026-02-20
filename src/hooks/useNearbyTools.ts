import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getQueryBounds, getDistanceKm } from '@/services/geo';
import { Tool } from '@/types/tool.types';

export interface ToolWithDistance extends Tool {
    distanceKm: number;
}

export const useNearbyTools = (centerLat: number | null, centerLng: number | null, radiusKm: number = 2) => {
    const [tools, setTools] = useState<ToolWithDistance[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Cache to avoid tiny movements triggering queries
    const lastQueryLocation = useRef<{ lat: number, lng: number } | null>(null);
    const cachedTools = useRef<ToolWithDistance[]>([]);

    useEffect(() => {
        if (centerLat === null || centerLng === null) return;

        // Only re-query if moved more than 0.1km (100m)
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
                const bounds = getQueryBounds(centerLat, centerLng, radiusKm);
                const promises = bounds.map(bound => {
                    const q = query(
                        collection(db, 'tools'),
                        // We filter isAvailable in memory to avoid index requirements for now, 
                        // unless we want to commit to managing indexes for every combination.
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

                // De-duplicate by ID
                const uniqueTools = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

                // Filter by availability, exact distance and sort
                const filteredTools: ToolWithDistance[] = uniqueTools
                    .filter(tool => tool.isAvailable === true)
                    .map(tool => ({
                        ...tool,
                        distanceKm: getDistanceKm(tool.lat, tool.lng, centerLat, centerLng)
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
