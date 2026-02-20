import { Stack } from 'expo-router';

export default function BorrowerLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="discover" options={{ headerShown: false }} />
        </Stack>
    );
}
