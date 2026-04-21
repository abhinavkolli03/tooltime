import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, Platform, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { UserProfile } from '@/types/user.types';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Stripe SDK only works on native platforms
let StripeProvider: any = ({ children }: any) => children;
if (Platform.OS !== 'web') {
  try {
    StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
  } catch (e) {
    console.warn('Stripe SDK not available');
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    'DMSerifDisplay-Regular': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  const {
    user,
    isLoading: isAuthLoading,
    isAuthenticated,
    setUser,
    setProfile,
    clearAuth,
    setIsLoading,
    role,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth State Changed:', !!firebaseUser);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            const currentProfile = useAuthStore.getState().profile;
            if (!currentProfile) {
              setProfile(null);
            }
          }
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!fontsLoaded && !fontError) return;

    const inAuthGroup = (segments as string[]).includes('(auth)');
    const performNavigation = async () => {
      try {
        if (!isAuthenticated && !inAuthGroup) {
          router.replace('/(auth)');
        } else if (isAuthenticated && inAuthGroup) {
          let targetPath: any = '/(borrower)/discover';
          if (role === 'lender') targetPath = '/(lender)/dashboard';
          router.replace(targetPath);
        }
      } catch (err) {
        console.error('Navigation error:', err);
      }
    };

    const timer = setTimeout(performNavigation, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading, segments, fontsLoaded, role]);

  if (!fontsLoaded && !fontError) return null;

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C4622A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey="pk_test_51P9Y3fRs97u7U9f8Y7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7" merchantIdentifier="com.tooltime.app">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(borrower)" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
          <Stack.Screen name="(lender)" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
          <Stack.Screen name="modals/booking" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/handover" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/return" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/review" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/list-tool" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/chat" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="modals/new-message" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/lender-delivery" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/borrower-tracking" options={{ presentation: 'modal' }} />
        </Stack>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
