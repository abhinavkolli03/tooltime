import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };

const TOOLS = [
    {
        id: 'tool_1',
        name: 'DeWalt 20V Cordless Drill',
        lenderId: 'marcus_uid',
        category: 'power_tools',
        condition: 'good',
        hourlyRate: 350,
        dailyRate: 1800,
        depositAmount: 5000,
        marketRetailPrice: 12900,
        deliveryFee: 800,
        lat: 30.2711,
        lng: -97.7431,
        photoUrls: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800"],
        isAvailable: true,
        rating: 4.8,
        rentalCount: 24,
        description: "Reliable 20V MAX cordless drill with 2 batteries and charger. Perfect for furniture assembly, shelving, and general home repairs.",
        specs: ["20V MAX battery", "2-speed transmission", "15 drill bits included", "2 batteries + charger"]
    },
    {
        id: 'tool_2',
        name: 'Makita Circular Saw',
        lenderId: 'elena_uid',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 500,
        dailyRate: 2500,
        depositAmount: 7500,
        marketRetailPrice: 17900,
        deliveryFee: 800,
        lat: 30.2650,
        lng: -97.7489,
        photoUrls: ["https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800"],
        isAvailable: true,
        rating: 4.9,
        rentalCount: 18,
        description: "7-1/4 inch circular saw with laser guide. Cuts through lumber, plywood, and OSB cleanly.",
        specs: ["7-1/4 inch blade", "Laser cut guide", "2 blades included", "15 amp motor"]
    },
    {
        id: 'tool_3',
        name: 'Ryobi Pressure Washer',
        lenderId: 'derek_uid',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 600,
        dailyRate: 3500,
        depositAmount: 6000,
        marketRetailPrice: 19900,
        deliveryFee: 800,
        lat: 30.2598,
        lng: -97.7401,
        photoUrls: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
        isAvailable: true,
        rating: 4.7,
        rentalCount: 11,
        description: "1600 PSI electric pressure washer. Great for driveways, decks, fences, and siding.",
        specs: ["1600 PSI", "3 nozzle tips", "25ft hose included", "Electric"]
    },
    {
        id: 'tool_4',
        name: 'Stanley Laser Level Kit',
        lenderId: 'marcus_uid',
        category: 'measuring',
        condition: 'excellent',
        hourlyRate: 400,
        dailyRate: 2000,
        depositAmount: 4000,
        marketRetailPrice: 8900,
        deliveryFee: 800,
        lat: 30.2734,
        lng: -97.7368,
        photoUrls: ["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800"],
        isAvailable: true,
        rating: 4.6,
        rentalCount: 8,
        description: "Self-leveling cross-line laser with tripod. Projects horizontal and vertical lines simultaneously.",
        specs: ["Self-leveling", "30ft range", "Tripod included"]
    },
    {
        id: 'tool_5',
        name: 'Werner 10ft Ladder',
        lenderId: 'elena_uid',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 250,
        dailyRate: 1200,
        depositAmount: 3500,
        marketRetailPrice: 12900,
        deliveryFee: 800,
        lat: 30.2680,
        lng: -97.7520,
        photoUrls: ["https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800"],
        isAvailable: true,
        rating: 4.5,
        rentalCount: 15,
        description: "300 lb rated fiberglass ladder, great for gutters, painting, or any job needing safe height.",
        specs: ["300 lb capacity", "Non-conductive", "ANSI certified"]
    },
    {
        id: 'tool_9',
        name: 'Bosch Rotary Hammer',
        lenderId: 'marcus_uid',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 750,
        dailyRate: 4000,
        depositAmount: 12000,
        marketRetailPrice: 29900,
        deliveryFee: 1000,
        lat: 30.2750,
        lng: -97.7450,
        photoUrls: ["https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800"],
        isAvailable: true,
        rating: 5.0,
        rentalCount: 5,
        description: "Heavy-duty SDS-plus rotary hammer. Best for drilling through concrete, stone, and brick.",
        specs: ["SDS-plus Chuck", "3 modes: Drill, Hammer Drill, Chisel", "Anti-vibration"]
    },
    {
        id: 'tool_10',
        name: 'EGO Cordless Mower',
        lenderId: 'derek_uid',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 900,
        dailyRate: 5000,
        depositAmount: 15000,
        marketRetailPrice: 54900,
        deliveryFee: 1500,
        lat: 30.2580,
        lng: -97.7350,
        photoUrls: ["https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=800"],
        isAvailable: true,
        rating: 4.9,
        rentalCount: 12,
        description: "Quiet and powerful 56V electric mower. 21-inch cutting deck. Incl. battery and charger.",
        specs: ["21\" Deck", "Self-propelled", "60 min runtime"]
    },
    {
        id: 'tool_11',
        name: 'Honda Generator 2200W',
        lenderId: 'elena_uid',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 1200,
        dailyRate: 6500,
        depositAmount: 20000,
        marketRetailPrice: 110000,
        deliveryFee: 1200,
        lat: 30.2700,
        lng: -97.7550,
        photoUrls: ["https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800"],
        isAvailable: true,
        rating: 4.9,
        rentalCount: 20,
        description: "Super quiet inverter generator. Perfect for camping, tailgating, or backup power. Clean power for electronics.",
        specs: ["2200 Watts", "Gas powered", "Super quiet 48-57 dBA"]
    },
    {
        id: 'tool_12',
        name: 'DeWalt Miter Saw',
        lenderId: 'marcus_uid',
        category: 'power_tools',
        condition: 'good',
        hourlyRate: 700,
        dailyRate: 3500,
        depositAmount: 10000,
        marketRetailPrice: 34900,
        deliveryFee: 1000,
        lat: 30.2630,
        lng: -97.7380,
        photoUrls: ["https://images.unsplash.com/photo-1530124560676-44b2bfe97284?w=800"],
        isAvailable: true,
        rating: 4.7,
        rentalCount: 14,
        description: "12-inch double bevel compound miter saw. Includes heavy-duty stand. Perfect for trim and baseboards.",
        specs: ["12\" Blade", "Double Bevel", "Laser Guide"]
    },
    {
        id: 'tool_13',
        name: 'Werner Extension Ladder',
        lenderId: 'derek_uid',
        category: 'outdoor',
        condition: 'fair',
        hourlyRate: 300,
        dailyRate: 1500,
        depositAmount: 5000,
        marketRetailPrice: 24900,
        deliveryFee: 1500,
        lat: 30.2600,
        lng: -97.7450,
        photoUrls: ["https://images.unsplash.com/photo-1542156822-6924d1a71ace?w=800"],
        isAvailable: true,
        rating: 4.4,
        rentalCount: 6,
        description: "24ft Aluminum extension ladder. Lightweight but sturdy for roof and gutter work.",
        specs: ["24ft reach", "Aluminum", "250 lb capacity"]
    }
];

// Add more random tools to reach ~25-30
const EXTRA_TOOLS = [
    { name: 'Pipe Wrench Set', cat: 'plumbing', price: 200, img: 'https://images.unsplash.com/photo-1610444583731-971759510e49?w=800' },
    { name: 'Drain Auger (Snake)', cat: 'plumbing', price: 350, img: 'https://images.unsplash.com/photo-1585713181935-d5f622cc2415?w=800' },
    { name: 'PEX Crimp Tool', cat: 'plumbing', price: 250, img: 'https://images.unsplash.com/photo-1530124560676-44b2bfe97284?w=800' },
    { name: 'Multimeter', cat: 'electrical', price: 150, img: 'https://images.unsplash.com/photo-1555819715-bc44a7ecf00d?w=800' },
    { name: 'Wire Stripper/Crimper', cat: 'electrical', price: 100, img: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800' },
    { name: 'Circuit Breaker Finder', cat: 'electrical', price: 200, img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800' },
    { name: '100ft Tape Measure', cat: 'measuring', price: 100, img: 'https://images.unsplash.com/photo-1503387762-592dea58f4bf?w=800' },
    { name: 'Digital Caliper', cat: 'measuring', price: 150, img: 'https://images.unsplash.com/photo-1530124560676-44b2bfe97284?w=800' },
    { name: 'Wheelbarrow', cat: 'outdoor', price: 300, img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800' },
    { name: 'Post Hole Digger', cat: 'outdoor', price: 250, img: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=800' }
];

const LENDERS = ['marcus_uid', 'elena_uid', 'derek_uid'];

for (let i = 0; i < 15; i++) {
    const base = EXTRA_TOOLS[i % EXTRA_TOOLS.length];
    const offsetLat = (Math.random() - 0.5) * 0.05;
    const offsetLng = (Math.random() - 0.5) * 0.05;

    TOOLS.push({
        id: `extra_${i}`,
        name: base.name,
        lenderId: LENDERS[i % LENDERS.length],
        category: base.cat,
        condition: 'good',
        hourlyRate: base.price,
        dailyRate: base.price * 5,
        depositAmount: base.price * 10,
        marketRetailPrice: base.price * 30,
        deliveryFee: 800,
        lat: AUSTIN_CENTER.lat + offsetLat,
        lng: AUSTIN_CENTER.lng + offsetLng,
        photoUrls: [base.img],
        isAvailable: true,
        rating: 4.0 + Math.random(),
        rentalCount: Math.floor(Math.random() * 20),
        description: `Professional ${base.name} in good working order. Ready for your project.`,
        specs: ['Industry standard', 'Well maintained']
    });
}

const USERS = [
    {
        uid: 'marcus_uid',
        displayName: 'Marcus H.',
        lenderRating: 4.9,
        role: 'both',
        memberSince: 'Jan 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=marcus',
        createdAt: '2023-01-01T12:00:00Z'
    },
    {
        uid: 'elena_uid',
        displayName: 'Elena K.',
        lenderRating: 4.8,
        role: 'lender',
        memberSince: 'Mar 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=elena',
        createdAt: '2023-03-01T12:00:00Z'
    },
    {
        uid: 'derek_uid',
        displayName: 'Derek M.',
        lenderRating: 4.7,
        role: 'lender',
        memberSince: 'Jun 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=derek',
        createdAt: '2023-06-01T12:00:00Z'
    },
    {
        uid: 'borrower_uid',
        displayName: 'Jamie L.',
        borrowerRating: 4.7,
        role: 'borrower',
        memberSince: 'Sep 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=jamie',
        createdAt: '2023-09-01T12:00:00Z'
    }
];

const now = new Date();
const BOOKINGS = [
    {
        id: "booking_001",
        toolId: 'tool_1',
        borrowerId: 'borrower_uid',
        lenderId: 'marcus_uid',
        status: "pending",
        durationHours: 4,
        rentalFee: 1400,
        deliveryFee: 800,
        platformFee: 140,
        depositAmount: 5000,
        totalCharged: 2340,
        depositStatus: "held",
        borrowerLat: 30.2672,
        borrowerLng: -97.7431,
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 8 * 60000))
    },
    {
        id: "booking_002",
        toolId: 'tool_3',
        borrowerId: 'borrower_uid',
        lenderId: 'derek_uid',
        status: "en_route",
        durationHours: 3,
        rentalFee: 1800,
        deliveryFee: 800,
        platformFee: 180,
        depositAmount: 6000,
        totalCharged: 2780,
        depositStatus: "held",
        lenderLat: 30.2698,
        lenderLng: -97.7445,
        borrowerLat: 30.2672,
        borrowerLng: -97.7431,
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 22 * 60000)),
        acceptedAt: Timestamp.fromDate(new Date(now.getTime() - 15 * 60000))
    },
    {
        id: "booking_003",
        toolId: 'tool_5',
        borrowerId: 'borrower_uid',
        lenderId: 'elena_uid',
        status: "completed",
        durationHours: 6,
        rentalFee: 1500,
        deliveryFee: 800,
        platformFee: 150,
        depositAmount: 3500,
        totalCharged: 2450,
        depositStatus: "released",
        paymentStatus: "paid",
        createdAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60000)),
        startedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60000)),
        completedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60000 + 6 * 60 * 60000))
    }
];

export const seedDatabase = async () => {
    try {
        console.log('Starting seed process...');

        for (const user of USERS) {
            const { uid, ...data } = user;
            await setDoc(doc(db, 'users', uid), {
                ...data,
                email: `${uid}@example.com`,
                createdAt: data.createdAt || new Date().toISOString()
            }, { merge: true });
        }

        for (const tool of TOOLS) {
            const { id, ...data } = tool;
            await setDoc(doc(db, 'tools', id), {
                ...data,
                geohash: geohashForLocation([tool.lat, tool.lng]),
                createdAt: new Date().toISOString()
            }, { merge: true });
        }

        for (const booking of BOOKINGS) {
            const { id, ...data } = booking;
            await setDoc(doc(db, 'bookings', id), {
                ...data
            }, { merge: true });

            if (['accepted', 'en_route', 'delivered', 'active'].includes(booking.status)) {
                const threadId = booking.id;
                await setDoc(doc(db, 'messages', threadId), {
                    participants: [booking.borrowerId, booking.lenderId],
                    toolId: booking.toolId,
                    bookingId: booking.id,
                    lastMessage: "Booking confirmed! Feel free to message me here.",
                    lastMessageAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                }, { merge: true });
            }
        }
        console.log('Seed process completed successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
