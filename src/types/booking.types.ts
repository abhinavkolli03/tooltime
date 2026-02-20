import { Timestamp } from 'firebase/firestore';

export type BookingStatus =
    'pending'        // awaiting lender accept
    | 'accepted'      // lender accepted
    | 'en_route'      // lender driving
    | 'delivered'     // handover confirmed
    | 'active'        // rental in progress
    | 'returning'     // borrower returning
    | 'completed'     // return confirmed
    | 'cancelled'     // either party cancelled
    | 'disputed';   // dispute raised

export interface Booking {
    id: string;
    toolId: string;
    borrowerId: string;
    lenderId: string;
    status: BookingStatus;
    durationHours: number;
    rentalFee: number;         // cents
    deliveryFee: number;       // cents
    platformFee: number;       // cents
    depositAmount: number;     // cents
    totalCharged: number;      // cents
    stripePaymentIntentId: string;
    stripeDepositIntentId: string;
    confirmationCode: string;  // 4-digit string
    borrowerLat: number;
    borrowerLng: number;
    startedAt: Timestamp | null;
    completedAt: Timestamp | null;
    createdAt: Timestamp;
}
