import React from 'react';
import { Tabs } from 'expo-router';
import LenderTabBar from '@/components/navigation/LenderTabBar';

export default function LenderLayout() {
    return (
        <Tabs
            tabBar={(props) => <LenderTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{ title: 'Dashboard' }}
            />
            <Tabs.Screen
                name="requests"
                options={{ title: 'Requests' }}
            />
            <Tabs.Screen
                name="messages"
                options={{ title: 'Messages' }}
            />
            <Tabs.Screen
                name="earnings"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="profile"
                options={{ title: 'Profile' }}
            />
            <Tabs.Screen
                name="listings"
                options={{ href: null }}
            />
        </Tabs>
    );
}
