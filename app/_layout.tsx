import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { UserProfile } from '@/types/user.types';
import { usePushNotifications } from '@/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  // Initialize Push Notifications listener
  usePushNotifications();

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
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            // Only overwrite with null if we don't already have an optimistic local profile
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
    if (isAuthLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to correct tab based on role
      if (role === 'borrower') {
        router.replace('/(borrower)/discover');
      } else if (role === 'lender') {
        router.replace('/(lender)/dashboard');
      } else if (role === 'both') {
        // If they have both roles, maybe default to borrower discovery 
        // Can adjust this behavior as needed
        router.replace('/(borrower)/discover');
      } else {
        // Fallback if role missing/still resolving
        // Will go to an intermediate error state or stay in auth if logic dictates
      }
    }
  }, [isAuthenticated, isAuthLoading, segments, fontsLoaded, role]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C4622A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(borrower)" options={{ headerShown: false }} />
      <Stack.Screen name="(lender)" options={{ headerShown: false }} />
    </Stack>
  );
}
