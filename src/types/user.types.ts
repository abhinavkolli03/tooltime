import { Timestamp } from 'firebase/firestore';

export type UserRole = 'borrower' | 'lender' | 'both';

export interface UserProfile {
    uid: string;               // Firebase Auth UID
    displayName: string;
    email: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
    role: UserRole;
    lenderRating: number;        // 0–5
    borrowerRating: number;      // 0–5
    totalRentals: number;
    stripeCustomerId: string | null;
    stripeAccountId: string | null; // lenders only
    pushToken: string | null;
    createdAt: Timestamp;
    memberSince: string;         // "Member since 2023"
}
