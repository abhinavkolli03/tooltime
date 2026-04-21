import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import RoleToggle from '@/components/ui/RoleToggle';
import { useBorrowerSpending } from '@/hooks/useBorrowerSpending';

export default function ProfileScreen() {
    const { profile, role } = useAuthStore();
    const { thisMonthSpending, allTimeSpending, totalRentals, isLoading: spendingLoading } = useBorrowerSpending();
    const [spendingExpanded, setSpendingExpanded] = useState(false);

    const fc = (c: number) => `$${(c / 100).toFixed(2)}`;

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'card-outline', label: 'Payment Methods', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
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

                {/* Borrower Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{spendingLoading ? '—' : totalRentals}</Text>
                        <Text style={styles.statLabel}>Rentals</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.borrowerRating || 0}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{spendingLoading ? '—' : fc(allTimeSpending)}</Text>
                        <Text style={styles.statLabel}>Total Spent</Text>
                    </View>
                </View>

                {/* Spending Card */}
                <TouchableOpacity
                    style={styles.spendingHeader}
                    onPress={() => setSpendingExpanded(!spendingExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.spendingHeaderLeft}>
                        <View style={styles.spendingIconWrap}>
                            <Ionicons name="receipt" size={20} color={COLORS.semantic.info} />
                        </View>
                        <View>
                            <Text style={styles.spendingTitle}>My Spending</Text>
                            <Text style={styles.spendingPreview}>
                                {spendingLoading ? 'Loading...' : `${fc(allTimeSpending)} all time`}
                            </Text>
                        </View>
                    </View>
                    <Ionicons
                        name={spendingExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.text.muted}
                    />
                </TouchableOpacity>

                {spendingExpanded && (
                    <View style={styles.spendingBody}>
                        {spendingLoading ? (
                            <ActivityIndicator size="small" color={COLORS.semantic.info} />
                        ) : (
                            <View style={styles.spendingGrid}>
                                <View style={[styles.spendingCard, styles.spendingCardHighlight]}>
                                    <Text style={styles.spendingCardLabel}>This Month</Text>
                                    <Text style={styles.spendingCardValueBlue}>{fc(thisMonthSpending)}</Text>
                                </View>
                                <View style={styles.spendingCard}>
                                    <Text style={styles.spendingCardLabel}>All Time</Text>
                                    <Text style={styles.spendingCardValue}>{fc(allTimeSpending)}</Text>
                                </View>
                                <View style={styles.spendingCard}>
                                    <Text style={styles.spendingCardLabel}>Rentals</Text>
                                    <Text style={styles.spendingCardValue}>{totalRentals}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

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
    spendingHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 24, backgroundColor: '#F0F6FF', borderRadius: 16,
        padding: 16, marginBottom: 4, borderWidth: 1, borderColor: '#C8DDFB',
    },
    spendingHeaderLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    spendingIconWrap: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0EDFF',
        alignItems: 'center', justifyContent: 'center',
    },
    spendingTitle: {
        fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary,
    },
    spendingPreview: {
        fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.text.muted, marginTop: 1,
    },
    spendingBody: {
        marginHorizontal: 24, backgroundColor: '#F0F6FF', borderRadius: 16,
        padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#C8DDFB',
        borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0,
    },
    spendingGrid: {
        flexDirection: 'row', gap: 10,
    },
    spendingCard: {
        flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: '#F5F0E8', alignItems: 'center',
    },
    spendingCardHighlight: {
        backgroundColor: '#E0EDFF', borderColor: '#C8DDFB',
    },
    spendingCardLabel: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070',
        letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
    },
    spendingCardValue: {
        fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: COLORS.text.primary,
    },
    spendingCardValueBlue: {
        fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: COLORS.semantic.info,
    },
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
