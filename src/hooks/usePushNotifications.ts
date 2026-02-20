import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
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

            if (Device.isDevice) {
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

                const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'dummy-project-id'; // Assuming standard EAS build configuration
                try {
                    const pushTokenString = (
                        await Notifications.getExpoPushTokenAsync({
                            projectId,
                        })
                    ).data;

                    // Save token to Firestore
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, {
                        pushToken: pushTokenString
                    });
                } catch (e: any) {
                    console.error(e);
                }
            } else {
                console.log('Must use physical device for Push Notifications');
            }
        };

        registerForPushNotificationsAsync();

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification Received', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.type === 'booking_accepted') {
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
