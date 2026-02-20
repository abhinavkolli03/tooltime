import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import RoleToggle from '@/components/ui/RoleToggle';

export default function ProfileScreen() {
    const { profile, role } = useAuthStore();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => { } },
        { icon: 'card-outline', label: 'Payment Methods', onPress: () => { } },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => { } },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security', onPress: () => { } },
        { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => { } },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* Avatar + Name */}
                <View style={styles.profileCard}>
                    <Image
                        source={{ uri: profile?.avatarUrl || 'https://i.pravatar.cc/150' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.displayName}>{profile?.displayName || 'User'}</Text>
                    <Text style={styles.email}>{profile?.email || ''}</Text>
                    <Text style={styles.memberSince}>
                        {profile?.memberSince ? `${profile.memberSince}` : ''}
                    </Text>

                    {/* Role Toggle */}
                    <View style={styles.roleSection}>
                        <Text style={styles.roleLabel}>CURRENT MODE</Text>
                        <RoleToggle />
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.totalRentals || 0}</Text>
                        <Text style={styles.statLabel}>Rentals</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.borrowerRating || 0}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.lenderRating || 0}</Text>
                        <Text style={styles.statLabel}>Lender ★</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                            <Ionicons name={item.icon as any} size={22} color={COLORS.text.primary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#E0D4C0" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#B84040" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
    title: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.text.primary },
    profileCard: {
        alignItems: 'center', paddingVertical: 24,
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F0E8',
        borderWidth: 3, borderColor: COLORS.accent.primary,
    },
    displayName: {
        fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary, marginTop: 16,
    },
    email: {
        fontFamily: 'DMSans-Regular', fontSize: 14, color: '#9A8070', marginTop: 4,
    },
    memberSince: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#C4B8A8', marginTop: 4,
    },
    roleSection: {
        alignItems: 'center', marginTop: 20,
    },
    roleLabel: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: '#9A8070', letterSpacing: 1, marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#FAFAFA',
        borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F5F0E8',
        marginBottom: 24,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary },
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 4 },
    statDivider: { width: 1, height: '100%', backgroundColor: '#F5F0E8' },
    menuSection: { marginHorizontal: 24, marginBottom: 24 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#F5F0E8', gap: 16,
    },
    menuLabel: { flex: 1, fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    signOutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: 24, height: 48, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#B84040',
    },
    signOutText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#B84040' },
});
