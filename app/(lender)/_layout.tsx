import { Stack } from 'expo-router';

export default function LenderLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        </Stack>
    );
}
