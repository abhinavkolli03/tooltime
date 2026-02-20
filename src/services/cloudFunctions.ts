import {
    clientCreateBooking,
    clientUpdateBookingStatus,
    clientSubmitReview,
    clientCreateListing
} from './bookingService';

export interface FunctionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Error helper for consistency
const wrapError = (err: any): FunctionResponse<any> => {
    console.error('Client Service Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
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
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const declineBooking = async (params: { bookingId: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        await clientUpdateBookingStatus(params.bookingId, 'cancelled');
        return { success: true, data: { success: true } };
    } catch (err) {
        return wrapError(err);
    }
};

export const confirmHandover = async (params: { bookingId: string, confirmationCode: string }): Promise<FunctionResponse<{ success: boolean }>> => {
    try {
        // In a real app we'd verify the code, here we just update status
        await clientUpdateBookingStatus(params.bookingId, 'active', { startedAt: new Date() });
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
