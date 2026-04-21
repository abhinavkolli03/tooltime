import { db, auth } from './firebase';
import {
    doc,
    collection,
    addDoc,
    updateDoc,
    serverTimestamp,
    getDoc,
    increment
} from 'firebase/firestore';
import { createThreadForBooking } from './messageService';

export interface BookingResponse {
    bookingId: string;
    clientSecret: string;
    depositClientSecret: string;
}

export const clientCreateBooking = async (params: {
    toolId: string;
    durationHours: number;
    borrowerLat?: number;
    borrowerLng?: number;
}): Promise<BookingResponse> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');

    // 1. Fetch tool data for pricing
    const toolDoc = await getDoc(doc(db, 'tools', params.toolId));
    if (!toolDoc.exists()) throw new Error('Tool not found');
    const tool = toolDoc.data();

    const rentalFee = params.durationHours * tool.hourlyRate;
    const platformFee = Math.round(rentalFee * 0.1);
    const deliveryFee = tool.deliveryFee || 800;
    const totalCharged = rentalFee + platformFee + deliveryFee;
    const depositAmount = tool.depositAmount;

    // 2. Mock confirmation code
    const confirmationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 3. Create booking document
    const bookingRef = await addDoc(collection(db, 'bookings'), {
        toolId: params.toolId,
        borrowerId: user.uid,
        lenderId: tool.lenderId,
        status: 'pending',
        durationHours: params.durationHours,
        rentalFee,
        platformFee,
        deliveryFee,
        depositAmount,
        totalCharged,
        borrowerLat: params.borrowerLat || 30.2672,
        borrowerLng: params.borrowerLng || -97.7431,
        confirmationCode,
        depositStatus: 'held',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Auto-create a messaging thread for this booking
    try {
        await createThreadForBooking({
            bookingId: bookingRef.id,
            borrowerId: user.uid,
            lenderId: tool.lenderId,
            toolId: params.toolId,
            toolName: tool.name || 'Tool',
        });
    } catch (e) {
        console.error('Failed to create message thread:', e);
    }

    return {
        bookingId: bookingRef.id,
        // Mock Stripe secrets
        clientSecret: `pi_mock_pay_${Math.random().toString(36).substring(7)}`,
        depositClientSecret: `pi_mock_dep_${Math.random().toString(36).substring(7)}`,
    };
};

export const clientUpdateBookingStatus = async (bookingId: string, status: string, extraFields = {}) => {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
        status,
        ...extraFields,
        updatedAt: serverTimestamp()
    });
};

export const clientSubmitReview = async (params: {
    bookingId: string;
    rating: number;
    comment: string;
    rentAgain: boolean;
}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');

    const bookingDoc = await getDoc(doc(db, 'bookings', params.bookingId));
    if (!bookingDoc.exists()) throw new Error('Booking not found');
    const booking = bookingDoc.data();

    // 1. Add review
    await addDoc(collection(db, 'reviews'), {
        bookingId: params.bookingId,
        toolId: booking.toolId,
        lenderId: booking.lenderId,
        borrowerId: user.uid,
        rating: params.rating,
        comment: params.comment,
        rentAgain: params.rentAgain,
        createdAt: serverTimestamp(),
    });

    // 2. Mark tool as available again and update rating count (mock)
    await updateDoc(doc(db, 'tools', booking.toolId), {
        isAvailable: true,
        rentalCount: increment(1)
    });
};

export const clientCreateListing = async (params: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');

    const toolRef = await addDoc(collection(db, 'tools'), {
        ...params,
        lenderId: user.uid,
        isAvailable: true,
        createdAt: serverTimestamp(),
    });
    return toolRef.id;
};
