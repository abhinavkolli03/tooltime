import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// @ts-ignore - Firebase types for getReactNativePersistence are sometimes missing in strict mode
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);

import { getAuth } from 'firebase/auth';

// Use React Native AsyncStorage for persistent auth manually
let auth: any;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e: any) {
    if (e.code === 'auth/already-initialized') {
        auth = getAuth(app);
    } else {
        console.error(e);
        auth = getAuth(app); // fallback
    }
}

const storage = getStorage(app);

export { app, db, auth, storage };
