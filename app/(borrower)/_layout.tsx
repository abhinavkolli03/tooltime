import React from 'react';
import { Tabs } from 'expo-router';
import BorrowerTabBar from '@/components/navigation/BorrowerTabBar';
import { useBooking } from '@/hooks/useBooking';

export default function BorrowerLayout() {
    // Initialize active booking listener
    useBooking();

    return (
        <Tabs
            tabBar={(props) => <BorrowerTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                }}
            />
            <Tabs.Screen
                name="rentals"
                options={{
                    title: 'Rentals',
                }}
            />
            <Tabs.Screen
                name="track"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                }}
            />
            <Tabs.Screen
                name="tool/[toolId]"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
