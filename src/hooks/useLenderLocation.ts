import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getDistanceKm } from '@/services/geo';

export const useLenderLocation = (bookingId: string | undefined) => {
    const [lenderLocation, setLenderLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

    useEffect(() => {
        if (!bookingId) return;

        const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const lat = data.lenderLat;
                const lng = data.lenderLng;
                const borrowerLat = data.borrowerLat;
                const borrowerLng = data.borrowerLng;

                setStatus(data.status);

                if (lat && lng) {
                    setLenderLocation({ lat, lng });

                    if (borrowerLat && borrowerLng) {
                        // ETA calculation: Distance / 25km/h * 60 minutes
                        const dist = getDistanceKm(lat, lng, borrowerLat, borrowerLng);
                        const eta = Math.ceil((dist / 25) * 60);
                        setEtaMinutes(eta);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [bookingId]);

    return { lenderLocation, status, etaMinutes };
};
