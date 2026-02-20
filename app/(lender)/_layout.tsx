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
                name="listings"
                options={{ title: 'Listings' }}
            />
            <Tabs.Screen
                name="requests"
                options={{ title: 'Requests' }}
            />
            <Tabs.Screen
                name="earnings"
                options={{ title: 'Earnings' }}
            />
            <Tabs.Screen
                name="profile"
                options={{ title: 'Profile' }}
            />
        </Tabs>
    );
}
