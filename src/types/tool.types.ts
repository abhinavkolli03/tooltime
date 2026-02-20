import { Timestamp } from 'firebase/firestore';

export type ToolCategory =
    'power_tools' | 'hand_tools' |
    'measuring' | 'outdoor' |
    'plumbing' | 'electrical';

export type ToolCondition =
    'excellent' | 'good' | 'fair';

export interface Tool {
    id: string;                  // Firestore doc ID
    lenderId: string;           // owner's UID
    name: string;
    description: string;
    category: ToolCategory;
    condition: ToolCondition;
    photoUrls: string[];        // min 1, max 5
    hourlyRate: number;         // cents
    dailyRate: number;          // cents
    depositAmount: number;      // cents
    lat: number;
    lng: number;
    geohash: string;            // geofire-common hash
    isAvailable: boolean;
    rating: number;             // avg rating 0–5
    rentalCount: number;
    createdAt: Timestamp;
}
