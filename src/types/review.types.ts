import { Timestamp } from 'firebase/firestore';

export interface Review {
    id: string;
    bookingId: string;
    reviewerId: string;
    revieweeId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    createdAt: Timestamp;
}
