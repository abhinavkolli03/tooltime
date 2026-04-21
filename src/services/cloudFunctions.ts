import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
    clientCreateBooking,
    clientUpdateBookingStatus,
    clientSubmitReview,
    clientCreateListing
} from './bookingService';
import { sendBookingStatusMessage } from './messageService';

export interface FunctionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

const wrapError = (err: any): FunctionResponse<any> => {
    console.error('Client Service Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
};

const notifyBookingStatus = async (
    bookingId: string,
    status: 'accepted' | 'en_route' | 'delivered' | 'active' | 'completed' | 'cancelled'
) => {
    try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        if (!bookingSnap.exists()) return;
        const booking = bookingSnap.data();

        const toolSnap = await getDoc(doc(db, 'tools', booking.toolId));
        const toolName = toolSnap.exists() ? toolSnap.data().name || 'Tool' : 'Tool';

        await sendBookingStatusMessage({
            bookingId,
            borrowerId: booking.borrowerId,
            lenderId: booking.lenderId,
            toolId: booking.toolId,
            toolName,
            status,
        });
    } catch (err) {
        console.warn('Status message notification failed (non-blocking):', err);
    }
};

// Refactored to use local client-side services instead of Cloud Functions
export const createBooking = async (params: any): Promise<FunctionResponse<any>> => {
    try {
        const data = await clientCreateBooking(params);
        return { success: true, data };
    } catch (err) {
        return wrapError(err);
    }
};

export const acceptBooking = async (params: { bookingId: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'accepted', { acceptedAt: new Date() });
        notifyBookingStatus(params.bookingId, 'accepted');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const declineBooking = async (params: { bookingId: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'cancelled');
        notifyBookingStatus(params.bookingId, 'cancelled');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const startEnRoute = async (params: { bookingId: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'en_route', { enRouteAt: new Date() });
        notifyBookingStatus(params.bookingId, 'en_route');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const confirmDelivery = async (params: {
    bookingId: string;
    dropoffPhotoUrl?: string;
}): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'delivered', {
            deliveredAt: new Date(),
            dropoffPhotoUrl: params.dropoffPhotoUrl || null,
        });
        notifyBookingStatus(params.bookingId, 'delivered');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const confirmHandover = async (params: { bookingId: string, confirmationCode: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'active', { startedAt: new Date() });
        notifyBookingStatus(params.bookingId, 'active');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const confirmReturn = async (params: { bookingId: string, conditionPhotos: string[] }): Promise<FunctionResponse<{ depositReleased: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'completed', {
            completedAt: new Date(),
            depositStatus: 'released',
            conditionPhotos: params.conditionPhotos
        });
        notifyBookingStatus(params.bookingId, 'completed');
        return { success: true, data: { depositReleased: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const createListing = async (params: any): Promise<FunctionResponse<any>> => {
    try {
        const id = await clientCreateListing(params);
        return { success: true, data: { id } };
    } catch (err) {
        return wrapError(err);
    }
};

export const updateListing = async (params: any): Promise<FunctionResponse<any>> => {
    try {
        const { id, ...data } = params;
        await clientUpdateBookingStatus(id, 'n/a', data); // re-using status updater for generic doc update
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const submitReview = async (params: any): Promise<FunctionResponse<any>> => {
    try {
        await clientSubmitReview(params);
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const createStripeSetupIntent = async (params: any): Promise<FunctionResponse<{ clientSecret: string }>> => {
    return {
        success: true,
        data: { clientSecret: `seti_mock_${Math.random().toString(36).substring(7)}` }
    };
};
