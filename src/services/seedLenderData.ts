import { db, auth } from './firebase';
import { doc, setDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import * as Location from 'expo-location';

/**
 * Seeds demo lender data for the currently logged-in user.
 * Creates tool listings and pending bookings so the lender dashboard
 * has real data to display during demos. Uses user's actual location.
 */
export const seedLenderData = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.error('seedLenderData: No authenticated user');
        return;
    }

    const existingTools = await getDocs(query(collection(db, 'tools'), where('lenderId', '==', user.uid)));
    if (existingTools.size > 0) {
        console.log('Lender data already exists — skipping seed');
        return;
    }

    console.log('Seeding lender demo data for:', user.uid);

    let baseLat = 30.2672;
    let baseLng = -97.7431;
    try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc.coords.latitude !== 0 && loc.coords.longitude !== 0) {
            baseLat = loc.coords.latitude;
            baseLng = loc.coords.longitude;
        }
    } catch (e) {
        // fallback to Austin
    }

    const LENDER_TOOLS = [
        {
            id: `lt_${user.uid}_1`,
            name: 'DeWalt 20V Cordless Drill',
            category: 'power_tools',
            condition: 'excellent',
            hourlyRate: 350,
            dailyRate: 1800,
            depositAmount: 5000,
            marketRetailPrice: 12900,
            deliveryFee: 800,
            photoUrls: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'],
            isAvailable: true,
            rating: 4.8,
            rentalCount: 24,
            description: 'Reliable 20V MAX cordless drill with 2 batteries and charger. Perfect for furniture assembly, shelving, and home repairs.',
            specs: ['20V MAX battery', '2-speed transmission', '15 drill bits included', '2 batteries + charger'],
        },
        {
            id: `lt_${user.uid}_2`,
            name: 'Makita Circular Saw',
            category: 'power_tools',
            condition: 'good',
            hourlyRate: 500,
            dailyRate: 2500,
            depositAmount: 7500,
            marketRetailPrice: 17900,
            deliveryFee: 800,
            photoUrls: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800'],
            isAvailable: false,
            rating: 4.9,
            rentalCount: 18,
            description: '7-1/4 inch circular saw with laser guide. Cuts through lumber, plywood, and OSB cleanly.',
            specs: ['7-1/4 inch blade', 'Laser cut guide', '2 blades included', '15 amp motor'],
        },
        {
            id: `lt_${user.uid}_3`,
            name: 'Stanley Laser Level Kit',
            category: 'measuring',
            condition: 'excellent',
            hourlyRate: 400,
            dailyRate: 2000,
            depositAmount: 4000,
            marketRetailPrice: 8900,
            deliveryFee: 800,
            photoUrls: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'],
            isAvailable: true,
            rating: 4.6,
            rentalCount: 8,
            description: 'Self-leveling cross-line laser with tripod. Projects horizontal and vertical lines up to 30ft.',
            specs: ['Self-leveling', '30ft range', 'Tripod included', 'Indoor/outdoor use'],
        },
        {
            id: `lt_${user.uid}_4`,
            name: 'Milwaukee Brad Nailer',
            category: 'power_tools',
            condition: 'excellent',
            hourlyRate: 450,
            dailyRate: 2200,
            depositAmount: 5500,
            marketRetailPrice: 17900,
            deliveryFee: 800,
            photoUrls: ['https://images.unsplash.com/photo-1586864387789-628af9feed72?w=800'],
            isAvailable: true,
            rating: 4.9,
            rentalCount: 31,
            description: '18-gauge pneumatic brad nailer for trim, molding, and light framing.',
            specs: ['18-gauge nails', '5/8" to 2" nail length', 'Depth adjustment', 'No-mar tip'],
        },
        {
            id: `lt_${user.uid}_5`,
            name: 'Ryobi Pressure Washer',
            category: 'outdoor',
            condition: 'good',
            hourlyRate: 600,
            dailyRate: 3500,
            depositAmount: 6000,
            marketRetailPrice: 19900,
            deliveryFee: 800,
            photoUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
            isAvailable: true,
            rating: 4.7,
            rentalCount: 11,
            description: '1600 PSI electric pressure washer. Great for driveways, decks, and fences.',
            specs: ['1600 PSI', '3 nozzle tips', '25ft hose included', 'Electric — no gas needed'],
        },
    ];

    const MOCK_BORROWERS = [
        {
            uid: 'demo_borrower_sarah',
            displayName: 'Sarah T.',
            email: 'sarah@tooltime.app',
            borrowerRating: 4.9,
            totalRentals: 12,
            avatarUrl: 'https://i.pravatar.cc/150?u=sarah_borrower',
            memberSince: 'Jun 2024',
            role: 'borrower',
        },
        {
            uid: 'demo_borrower_david',
            displayName: 'David K.',
            email: 'david@tooltime.app',
            borrowerRating: 4.7,
            totalRentals: 8,
            avatarUrl: 'https://i.pravatar.cc/150?u=david_borrower',
            memberSince: 'Aug 2024',
            role: 'borrower',
        },
        {
            uid: 'demo_borrower_jamie',
            displayName: 'Jamie L.',
            email: 'jamie@tooltime.app',
            borrowerRating: 4.8,
            totalRentals: 15,
            avatarUrl: 'https://i.pravatar.cc/150?u=jamie_borrower',
            memberSince: 'Jan 2025',
            role: 'borrower',
        },
    ];

    try {
        for (const borrower of MOCK_BORROWERS) {
            const { uid, ...data } = borrower;
            await setDoc(doc(db, 'users', uid), {
                ...data,
                createdAt: serverTimestamp(),
            }, { merge: true });
        }

        for (let i = 0; i < LENDER_TOOLS.length; i++) {
            const tool = LENDER_TOOLS[i];
            const { id, ...data } = tool;
            const lat = baseLat + (Math.random() - 0.5) * 0.02;
            const lng = baseLng + (Math.random() - 0.5) * 0.02;
            await setDoc(doc(db, 'tools', id), {
                ...data,
                lenderId: user.uid,
                lat,
                lng,
                geohash: geohashForLocation([lat, lng]),
                createdAt: serverTimestamp(),
            }, { merge: true });
        }

        const now = new Date();

        await setDoc(doc(db, 'bookings', `lb_${user.uid}_1`), {
            toolId: LENDER_TOOLS[0].id,
            borrowerId: 'demo_borrower_sarah',
            lenderId: user.uid,
            status: 'pending',
            durationHours: 72,
            rentalFee: 5400,
            deliveryFee: 800,
            platformFee: 540,
            depositAmount: 5000,
            totalCharged: 6740,
            borrowerLat: baseLat + 0.002,
            borrowerLng: baseLng - 0.003,
            confirmationCode: '4829',
            depositStatus: 'held',
            paymentStatus: 'pending',
            createdAt: Timestamp.fromDate(new Date(now.getTime() - 12 * 60000)),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'bookings', `lb_${user.uid}_2`), {
            toolId: LENDER_TOOLS[4].id,
            borrowerId: 'demo_borrower_david',
            lenderId: user.uid,
            status: 'pending',
            durationHours: 24,
            rentalFee: 3500,
            deliveryFee: 800,
            platformFee: 350,
            depositAmount: 6000,
            totalCharged: 4650,
            borrowerLat: baseLat - 0.001,
            borrowerLng: baseLng + 0.002,
            confirmationCode: '7153',
            depositStatus: 'held',
            paymentStatus: 'pending',
            createdAt: Timestamp.fromDate(new Date(now.getTime() - 25 * 60000)),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'bookings', `lb_${user.uid}_3`), {
            toolId: LENDER_TOOLS[1].id,
            borrowerId: 'demo_borrower_jamie',
            lenderId: user.uid,
            status: 'en_route',
            durationHours: 48,
            rentalFee: 5000,
            deliveryFee: 800,
            platformFee: 500,
            depositAmount: 7500,
            totalCharged: 6100,
            borrowerLat: baseLat - 0.003,
            borrowerLng: baseLng + 0.001,
            lenderLat: baseLat + 0.001,
            lenderLng: baseLng - 0.001,
            confirmationCode: '3091',
            depositStatus: 'held',
            paymentStatus: 'pending',
            createdAt: Timestamp.fromDate(new Date(now.getTime() - 45 * 60000)),
            acceptedAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 60000)),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'bookings', `lb_${user.uid}_4`), {
            toolId: LENDER_TOOLS[2].id,
            borrowerId: 'demo_borrower_sarah',
            lenderId: user.uid,
            status: 'completed',
            durationHours: 8,
            rentalFee: 3200,
            deliveryFee: 800,
            platformFee: 320,
            depositAmount: 4000,
            totalCharged: 4000,
            borrowerLat: baseLat,
            borrowerLng: baseLng,
            confirmationCode: '8823',
            depositStatus: 'released',
            paymentStatus: 'paid',
            createdAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60000)),
            completedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60000)),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'messages', `lb_${user.uid}_3`), {
            participants: [user.uid, 'demo_borrower_jamie'],
            toolId: LENDER_TOOLS[1].id,
            bookingId: `lb_${user.uid}_3`,
            lastMessage: "I'm on my way! Should be there in about 10 minutes.",
            lastMessageAt: serverTimestamp(),
            createdAt: serverTimestamp(),
        }, { merge: true });

        console.log('Lender demo data seeded successfully!');
    } catch (error) {
        console.error('Error seeding lender data:', error);
    }
};
