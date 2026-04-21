import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import * as Location from 'expo-location';

// ─── VERIFIED UNSPLASH IMAGE IDS (confirmed via page metadata) ───────────────
const IMAGES = {
    dewalt_drill: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&fit=crop',
    circular_saw: 'https://images.unsplash.com/photo-1505855796860-aa05646cbf1f?w=800&fit=crop',
    pressure_washer: 'https://images.unsplash.com/photo-1640653488366-f7771cd7292d?w=800&fit=crop',
    miter_saw: 'https://images.unsplash.com/photo-1559295759-389f1c534a1d?w=800&fit=crop',
    chainsaw: 'https://images.unsplash.com/photo-1641366784341-446c64b421a2?w=800&fit=crop',
    lawn_mower: 'https://images.unsplash.com/photo-1689728222087-6984f72460c4?w=800&fit=crop',
    generator: 'https://images.unsplash.com/photo-1679274649021-067d0003d9bf?w=800&fit=crop',
    extension_ladder: 'https://images.unsplash.com/photo-1524806523029-d3cbcb5e72be?w=800&fit=crop',
    workshop_tools: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop',
    hand_tools_bench: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&fit=crop',
    measuring_tools: 'https://images.unsplash.com/photo-1503387762-592dea58f4bf?w=800&fit=crop',
    plumbing_wrench: 'https://images.unsplash.com/photo-1585713181935-d5f622cc2415?w=800&fit=crop',
    electrical_meter: 'https://images.unsplash.com/photo-1555819715-bc44a7ecf00d?w=800&fit=crop',
    nail_gun: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&fit=crop',
    air_compressor: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&fit=crop',
    wheelbarrow: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=800&fit=crop',
    impact_driver: 'https://images.unsplash.com/photo-1586864387789-628af9feed72?w=800&fit=crop',
};

// ─── DIVERSE LENDER PROFILES ─────────────────────────────────────────────────
const LENDER_PROFILES = [
    { uid: 'lender_marcus', displayName: 'Marcus H.', avatarUrl: 'https://i.pravatar.cc/150?u=marcus_lender', lenderRating: 4.9, totalLends: 87, memberSince: 'Jan 2024' },
    { uid: 'lender_elena', displayName: 'Elena K.', avatarUrl: 'https://i.pravatar.cc/150?u=elena_lender', lenderRating: 4.8, totalLends: 52, memberSince: 'Mar 2024' },
    { uid: 'lender_derek', displayName: 'Derek M.', avatarUrl: 'https://i.pravatar.cc/150?u=derek_lender', lenderRating: 4.7, totalLends: 34, memberSince: 'Jun 2024' },
    { uid: 'lender_sophia', displayName: 'Sophia R.', avatarUrl: 'https://i.pravatar.cc/150?u=sophia_lender', lenderRating: 4.9, totalLends: 61, memberSince: 'Feb 2024' },
    { uid: 'lender_james', displayName: 'James T.', avatarUrl: 'https://i.pravatar.cc/150?u=james_lender', lenderRating: 4.6, totalLends: 28, memberSince: 'May 2024' },
    { uid: 'lender_nina', displayName: 'Nina P.', avatarUrl: 'https://i.pravatar.cc/150?u=nina_lender', lenderRating: 4.8, totalLends: 43, memberSince: 'Apr 2024' },
    { uid: 'lender_carlos', displayName: 'Carlos V.', avatarUrl: 'https://i.pravatar.cc/150?u=carlos_lender', lenderRating: 4.7, totalLends: 39, memberSince: 'Jul 2024' },
];

// ─── TOOL DATA WITH VERIFIED IMAGES & ACCURATE RETAIL PRICES ─────────────────
interface ToolSeed {
    name: string;
    category: string;
    condition: 'excellent' | 'good' | 'fair';
    hourlyRate: number;
    dailyRate: number;
    depositAmount: number;
    marketRetailPrice: number;
    deliveryFee: number;
    description: string;
    specs: string[];
    image: string;
}

const TOOLS: ToolSeed[] = [
    {
        name: 'DeWalt 20V MAX Cordless Drill/Driver Kit',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 350,
        dailyRate: 1800,
        depositAmount: 5000,
        marketRetailPrice: 12900,
        deliveryFee: 800,
        description: 'Compact, lightweight 20V MAX drill/driver with 2-speed transmission for a wide range of fastening and drilling applications. Includes 2 lithium-ion batteries, charger, and contractor bag.',
        specs: ['20V MAX lithium-ion', '2-speed: 0-450 / 0-1500 RPM', '300 UWO power output', '1/2" ratcheting chuck', 'Includes 2 batteries + charger'],
        image: IMAGES.dewalt_drill,
    },
    {
        name: 'Makita 7-1/4" Circular Saw',
        category: 'power_tools',
        condition: 'good',
        hourlyRate: 500,
        dailyRate: 2500,
        depositAmount: 7500,
        marketRetailPrice: 17900,
        deliveryFee: 800,
        description: 'Powerful 15 AMP circular saw with built-in LED light and laser guide for precise cuts. Lightweight magnesium construction at only 10.6 lbs. Cuts 2x lumber at 45°.',
        specs: ['15 AMP motor', '5,800 RPM no-load speed', '7-1/4" carbide blade', 'LED light + laser guide', '2-7/16" depth at 90°'],
        image: IMAGES.circular_saw,
    },
    {
        name: 'Ryobi 1900 PSI Electric Pressure Washer',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 600,
        dailyRate: 3500,
        depositAmount: 6000,
        marketRetailPrice: 19900,
        deliveryFee: 800,
        description: 'Electric pressure washer that delivers 1900 PSI of force for quick cleaning of driveways, decks, fencing, and patio furniture. No gas, no fumes — plug in and go.',
        specs: ['1900 PSI / 1.2 GPM', '13 AMP electric motor', '3 quick-connect nozzles', '25ft high-pressure hose', 'On-board soap tank'],
        image: IMAGES.pressure_washer,
    },
    {
        name: 'DeWalt 12" Double-Bevel Compound Miter Saw',
        category: 'power_tools',
        condition: 'good',
        hourlyRate: 700,
        dailyRate: 3500,
        depositAmount: 10000,
        marketRetailPrice: 34900,
        deliveryFee: 1000,
        description: 'Professional 12-inch miter saw with dual-bevel capability for crown molding and complex angle cuts. XPS crosscut positioning system provides adjustment-free cut line indication.',
        specs: ['15 AMP / 3,800 RPM motor', '12" carbide blade', 'XPS LED cut-line system', '0-50° miter left & right', '0-48° bevel left & right'],
        image: IMAGES.miter_saw,
    },
    {
        name: 'Husqvarna 16" Gas Chainsaw',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 800,
        dailyRate: 4000,
        depositAmount: 12000,
        marketRetailPrice: 32900,
        deliveryFee: 1000,
        description: 'Reliable 16-inch gas-powered chainsaw for tree trimming, firewood, and storm cleanup. Features X-Torq engine for lower emissions and fuel consumption. Easy side-mounted chain tensioning.',
        specs: ['40.9cc X-Torq engine', '16" bar and chain', 'Inertia chain brake', 'Air Injection filtration', 'Combined choke/stop control'],
        image: IMAGES.chainsaw,
    },
    {
        name: 'EGO 56V 21" Self-Propelled Mower',
        category: 'outdoor',
        condition: 'excellent',
        hourlyRate: 900,
        dailyRate: 5000,
        depositAmount: 15000,
        marketRetailPrice: 54900,
        deliveryFee: 1500,
        description: 'Whisper-quiet battery-powered mower with power equivalent to a 175cc gas engine. 21" cutting deck with 6-position height adjustment. Includes 7.5Ah battery and rapid charger.',
        specs: ['56V ARC Lithium 7.5Ah', '21" steel deck', 'Self-propelled variable speed', '60 min runtime', 'Folds flat for storage'],
        image: IMAGES.lawn_mower,
    },
    {
        name: 'Honda EU2200i Portable Inverter Generator',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 1200,
        dailyRate: 6500,
        depositAmount: 20000,
        marketRetailPrice: 114900,
        deliveryFee: 1200,
        description: 'Ultra-quiet inverter generator providing 2200W of clean, stable power safe for laptops and sensitive electronics. Perfect for camping, tailgating, or emergency home backup.',
        specs: ['2200W max / 1800W rated', 'GXR120 commercial engine', 'Super quiet: 48-57 dBA', '8.1 hrs runtime at 25% load', 'Parallel capable'],
        image: IMAGES.generator,
    },
    {
        name: 'Werner 16ft Aluminum Extension Ladder',
        category: 'outdoor',
        condition: 'good',
        hourlyRate: 300,
        dailyRate: 1500,
        depositAmount: 5000,
        marketRetailPrice: 16900,
        deliveryFee: 1200,
        description: 'Heavy-duty aluminum extension ladder rated for 225 lbs. Interlocking side rails, spring-loaded locks, and slip-resistant rungs. Ideal for gutters, painting, and roof access.',
        specs: ['16ft reach height', '225 lb load capacity', 'Duty Rating Type II', 'Mar-resistant end caps', 'Spring-loaded locks'],
        image: IMAGES.extension_ladder,
    },
    {
        name: 'Milwaukee M18 FUEL Impact Driver',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 400,
        dailyRate: 2000,
        depositAmount: 5000,
        marketRetailPrice: 14900,
        deliveryFee: 800,
        description: 'Most powerful 18V impact driver available. POWERSTATE brushless motor delivers 2000 in-lbs of torque. REDLINK PLUS intelligence prevents overheating for all-day use.',
        specs: ['2000 in-lbs torque', 'POWERSTATE brushless motor', '0-3600 RPM / 0-4350 IPM', '1/4" hex quick-change', 'Built-in LED with delay'],
        image: IMAGES.impact_driver,
    },
    {
        name: 'Bosch 1-1/8" SDS-Plus Rotary Hammer',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 750,
        dailyRate: 4000,
        depositAmount: 12000,
        marketRetailPrice: 29900,
        deliveryFee: 1000,
        description: 'Heavy-duty rotary hammer for drilling through concrete, stone, and masonry. Three modes: rotation only, hammer drill, and hammer only. Vibration Control side handle reduces fatigue.',
        specs: ['8 AMP motor / 2.4 ft-lbs impact energy', 'SDS-Plus bit system', '3 modes: Drill / Hammer Drill / Chisel', 'Vibration Control handle', '0-1,300 RPM / 0-5,800 BPM'],
        image: IMAGES.workshop_tools,
    },
    {
        name: 'Ridgid 14" Pipe Wrench Set (3-Piece)',
        category: 'plumbing',
        condition: 'good',
        hourlyRate: 200,
        dailyRate: 1000,
        depositAmount: 2500,
        marketRetailPrice: 6900,
        deliveryFee: 800,
        description: 'Professional-grade 3-piece pipe wrench set (10", 14", 18") with I-beam handle for maximum strength. Self-cleaning threads and always-parallel jaws ensure positive grip.',
        specs: ['3-piece set: 10" / 14" / 18"', 'Ductile iron housing', 'Self-cleaning threads', 'Floating hook jaw', 'Full lifetime warranty'],
        image: IMAGES.plumbing_wrench,
    },
    {
        name: 'Ridgid PowerSpin+ Drain Cleaner',
        category: 'plumbing',
        condition: 'good',
        hourlyRate: 350,
        dailyRate: 1800,
        depositAmount: 4000,
        marketRetailPrice: 12900,
        deliveryFee: 800,
        description: 'Powered drain auger for clearing tough clogs in sinks, tubs, and shower drains. Autofeed mechanism advances the cable with one hand, keeping the other clean.',
        specs: ['25ft x 1/4" cable', 'Autofeed mechanism', '?"–2" drain size range', 'Bulb & retrieval auger heads', 'Inner drum contains mess'],
        image: IMAGES.plumbing_wrench,
    },
    {
        name: 'Fluke 117 True-RMS Digital Multimeter',
        category: 'electrical',
        condition: 'excellent',
        hourlyRate: 200,
        dailyRate: 1000,
        depositAmount: 3000,
        marketRetailPrice: 18900,
        deliveryFee: 800,
        description: 'Professional electrician\'s multimeter with non-contact voltage detection. True-RMS for accurate readings on non-linear loads. AutoVolt automatically selects AC or DC voltage.',
        specs: ['True-RMS AC voltage', 'Non-contact voltage detector', 'AutoVolt (auto AC/DC select)', '6000 count display', 'CAT III 600V safety rated'],
        image: IMAGES.electrical_meter,
    },
    {
        name: 'Klein 11-in-1 Wire Stripper/Crimper',
        category: 'electrical',
        condition: 'good',
        hourlyRate: 100,
        dailyRate: 500,
        depositAmount: 1500,
        marketRetailPrice: 3900,
        deliveryFee: 800,
        description: 'Multi-purpose electrician\'s tool that strips, cuts, loops, and crimps. Self-adjusting mechanism handles 10-20 AWG solid and 12-22 AWG stranded wire without adjustment.',
        specs: ['10-20 AWG solid / 12-22 AWG stranded', 'Self-adjusting pressure', 'Built-in wire looper', 'Insulated/non-insulated crimper', 'Ergonomic grip handles'],
        image: IMAGES.electrical_meter,
    },
    {
        name: 'Stanley FatMax 100ft Tape Measure',
        category: 'measuring',
        condition: 'excellent',
        hourlyRate: 100,
        dailyRate: 500,
        depositAmount: 1500,
        marketRetailPrice: 2900,
        deliveryFee: 800,
        description: 'Long-range 100-foot open-reel tape measure with fiberglass blade for durability. Double-sided printing and high-visibility markings. 3:1 gear ratio for fast rewind.',
        specs: ['100ft / 30m fiberglass blade', 'Double-sided markings', '3:1 gear ratio rewind', 'ABS impact-resistant case', 'Folding end hook'],
        image: IMAGES.measuring_tools,
    },
    {
        name: 'DeWalt Self-Leveling Cross-Line Laser',
        category: 'measuring',
        condition: 'excellent',
        hourlyRate: 400,
        dailyRate: 2000,
        depositAmount: 4000,
        marketRetailPrice: 11900,
        deliveryFee: 800,
        description: 'Projects bright cross-line laser (horizontal + vertical) visible up to 50ft. Self-leveling within 4° and locks in manual mode for angled lines. Includes magnetic bracket and case.',
        specs: ['50ft indoor visibility', 'Self-levels within 4°', 'Full-time pulse mode', '1/8" accuracy at 30ft', 'Magnetic pivot bracket'],
        image: IMAGES.nail_gun,
    },
    {
        name: 'Jackson 6 cu ft Steel Wheelbarrow',
        category: 'outdoor',
        condition: 'fair',
        hourlyRate: 200,
        dailyRate: 1000,
        depositAmount: 2500,
        marketRetailPrice: 8900,
        deliveryFee: 1000,
        description: 'Heavy-duty 6 cubic foot steel tray wheelbarrow for hauling dirt, mulch, gravel, and debris. Seamless steel tray won\'t leak. Pneumatic tire rolls smoothly over rough terrain.',
        specs: ['6 cu ft seamless steel tray', '16" pneumatic tire', 'Hardwood handles', '300 lb load capacity', 'Rust-resistant powder coat'],
        image: IMAGES.wheelbarrow,
    },
    {
        name: 'DeWalt 7" Wet Tile Saw with Stand',
        category: 'power_tools',
        condition: 'good',
        hourlyRate: 600,
        dailyRate: 3000,
        depositAmount: 8000,
        marketRetailPrice: 29900,
        deliveryFee: 1200,
        description: 'Professional 7-inch wet tile saw with stainless steel rail system for smooth, accurate cuts on ceramic, porcelain, and stone tiles. Includes folding stand and 7" diamond blade.',
        specs: ['Stainless steel rail system', '7" continuous rim diamond blade', '45° miter capability', '24" rip capacity / 18" diagonal', 'Integrated water management'],
        image: IMAGES.circular_saw,
    },
    {
        name: 'Bostitch 18-Gauge Pneumatic Brad Nailer',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 350,
        dailyRate: 1800,
        depositAmount: 4500,
        marketRetailPrice: 9900,
        deliveryFee: 800,
        description: 'Lightweight oil-free brad nailer for trim, molding, cabinetry, and craft projects. Drives 18-gauge nails from 5/8" to 2-1/8". Dial-a-depth for precise countersinking.',
        specs: ['18-gauge: 5/8" to 2-1/8" nails', 'Oil-free operation', 'Dial-A-Depth control', 'Selectable trigger', '100-nail magazine'],
        image: IMAGES.nail_gun,
    },
    {
        name: 'DeWalt 6-Gallon Pancake Air Compressor',
        category: 'power_tools',
        condition: 'excellent',
        hourlyRate: 500,
        dailyRate: 2500,
        depositAmount: 7000,
        marketRetailPrice: 19900,
        deliveryFee: 1000,
        description: '165 max PSI 6-gallon compressor with 78.5 dBA noise level for indoor use. High-efficiency motor starts easily in cold weather. Powers nail guns, staplers, and inflation.',
        specs: ['165 max PSI / 6 gallon', '2.6 SCFM at 90 PSI', '78.5 dBA operation', 'Oil-free pump (no maintenance)', '30 lb portable weight'],
        image: IMAGES.air_compressor,
    },
];

function randomOffset(range: number): number {
    return (Math.random() - 0.5) * range;
}

async function cleanOldSeedData() {
    try {
        const toolsSnap = await getDocs(collection(db, 'tools'));
        const deletePromises: Promise<void>[] = [];
        toolsSnap.forEach(docSnap => {
            const id = docSnap.id;
            if (id.startsWith('tool_') || id.startsWith('extra_') || id.startsWith('seed_tool_')) {
                deletePromises.push(deleteDoc(doc(db, 'tools', id)));
            }
        });
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log(`Cleaned ${deletePromises.length} old seed tools`);
        }
    } catch (e) {
        console.warn('cleanOldSeedData partial failure (non-blocking):', e);
    }
}

export const seedDatabase = async () => {
    try {
        console.log('Starting seed process...');
        const currentUserId = auth.currentUser?.uid;

        let CENTER = { lat: 30.2672, lng: -97.7431 };
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (loc.coords.latitude !== 0 && loc.coords.longitude !== 0) {
                CENTER = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            }
        } catch (e) {
            // fallback to Austin
        }

        // Clean up any old/stale seed data first
        await cleanOldSeedData();

        // 1. Seed lender profiles
        for (const lender of LENDER_PROFILES) {
            await setDoc(doc(db, 'users', lender.uid), {
                displayName: lender.displayName,
                avatarUrl: lender.avatarUrl,
                lenderRating: lender.lenderRating,
                borrowerRating: 4.5 + Math.random() * 0.4,
                totalLends: lender.totalLends,
                totalRentals: Math.floor(Math.random() * 15),
                email: `${lender.uid}@tooltime.app`,
                role: 'lender',
                memberSince: lender.memberSince,
                phoneNumber: '+1512555' + Math.floor(1000 + Math.random() * 9000),
                createdAt: serverTimestamp(),
            }, { merge: true });
        }

        // 2. Seed tools scattered around user's location (±3km radius)
        for (let i = 0; i < TOOLS.length; i++) {
            const template = TOOLS[i];
            const lender = LENDER_PROFILES[i % LENDER_PROFILES.length];

            if (lender.uid === currentUserId) continue;

            const lat = CENTER.lat + randomOffset(0.055);
            const lng = CENTER.lng + randomOffset(0.055);

            await setDoc(doc(db, 'tools', `seed_v4_${i}`), {
                name: template.name,
                lenderId: lender.uid,
                category: template.category,
                condition: template.condition,
                hourlyRate: template.hourlyRate,
                dailyRate: template.dailyRate,
                depositAmount: template.depositAmount,
                marketRetailPrice: template.marketRetailPrice,
                deliveryFee: template.deliveryFee,
                lat,
                lng,
                geohash: geohashForLocation([lat, lng]),
                photoUrls: [template.image],
                isAvailable: true,
                rating: 4.3 + Math.random() * 0.7,
                rentalCount: Math.floor(5 + Math.random() * 35),
                description: template.description,
                specs: template.specs,
                createdAt: serverTimestamp(),
            }, { merge: true });
        }

        // 3. Seed a few demo bookings for the current user
        const now = new Date();
        if (currentUserId) {
            await setDoc(doc(db, 'bookings', 'seed_booking_v4_001'), {
                toolId: 'seed_v4_0',
                borrowerId: currentUserId,
                lenderId: LENDER_PROFILES[0].uid,
                status: 'en_route',
                durationHours: 4,
                rentalFee: 1400,
                deliveryFee: 800,
                platformFee: 140,
                depositAmount: 5000,
                totalCharged: 2340,
                depositStatus: 'held',
                paymentStatus: 'pending',
                confirmationCode: '4829',
                borrowerLat: CENTER.lat,
                borrowerLng: CENTER.lng,
                lenderLat: CENTER.lat + 0.004,
                lenderLng: CENTER.lng - 0.003,
                createdAt: Timestamp.fromDate(new Date(now.getTime() - 20 * 60000)),
                acceptedAt: Timestamp.fromDate(new Date(now.getTime() - 12 * 60000)),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            await setDoc(doc(db, 'bookings', 'seed_booking_v4_002'), {
                toolId: 'seed_v4_2',
                borrowerId: currentUserId,
                lenderId: LENDER_PROFILES[2].uid,
                status: 'completed',
                durationHours: 6,
                rentalFee: 2100,
                deliveryFee: 800,
                platformFee: 210,
                depositAmount: 6000,
                totalCharged: 3110,
                depositStatus: 'released',
                paymentStatus: 'paid',
                confirmationCode: '7153',
                borrowerLat: CENTER.lat,
                borrowerLng: CENTER.lng,
                createdAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60000)),
                completedAt: Timestamp.fromDate(new Date(now.getTime() - 4 * 24 * 60 * 60000)),
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }

        console.log('Seed process completed successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
