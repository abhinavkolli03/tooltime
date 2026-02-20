import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

// Error helper
const extractError = (error: any) => {
    if (error?.code) {
        throw new Error(`[${error.code}] ${error.message || 'Unknown Firebase Function error'}`);
    }
    throw error;
};

// Callable wrappers
export const createBooking = async (params: { toolId: string; durationHours: number }) => {
    try {
        const fn = httpsCallable<any, { bookingId: string; clientSecret: string; depositClientSecret: string }>(functions, 'createBooking');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const acceptBooking = async (params: { bookingId: string }) => {
    try {
        const fn = httpsCallable<any, { success: boolean }>(functions, 'acceptBooking');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const declineBooking = async (params: { bookingId: string }) => {
    try {
        const fn = httpsCallable<any, { success: boolean }>(functions, 'declineBooking');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const confirmHandover = async (params: { bookingId: string; confirmationCode: string }) => {
    try {
        const fn = httpsCallable<any, { success: boolean }>(functions, 'confirmHandover');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const confirmReturn = async (params: { bookingId: string; conditionPhotos: string[] }) => {
    try {
        const fn = httpsCallable<any, { depositReleased: boolean }>(functions, 'confirmReturn');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const createListing = async (params: any) => {
    try {
        const fn = httpsCallable<any, any>(functions, 'createListing');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const updateListing = async (params: any) => {
    try {
        const fn = httpsCallable<any, any>(functions, 'updateListing');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const submitReview = async (params: any) => {
    try {
        const fn = httpsCallable<any, any>(functions, 'submitReview');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};

export const createStripeSetupIntent = async (params: any) => {
    try {
        const fn = httpsCallable<any, { clientSecret: string }>(functions, 'createStripeSetupIntent');
        const { data } = await fn(params);
        return data;
    } catch (err) {
        extractError(err);
    }
};
