import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const usePushNotifications = () => {
    const { user } = useAuth();
    const router = useRouter();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    useEffect(() => {
        if (!user) return;

        const registerForPushNotificationsAsync = async () => {
            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (!Device.isDevice) {
                console.log('Mocking push token for Simulator...');
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, { pushToken: 'mock-simulator-token-123' }, { merge: true });
                return;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'dummy-project-id';
            try {
                const pushTokenString = (
                    await Notifications.getExpoPushTokenAsync({
                        projectId,
                    })
                ).data;

                // Save token to Firestore
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, {
                    pushToken: pushTokenString
                }, { merge: true });
            } catch (e: any) {
                console.error(e);
            }
        };

        registerForPushNotificationsAsync();

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification Received', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('Notification Response:', data);

            // Handle deep linking routes from notification data
            if (data?.route) {
                router.push(data.route as any);
            } else if (data?.type === 'booking_accepted') {
                router.push('/(borrower)/track' as any);
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [user]);

    return null;
};
