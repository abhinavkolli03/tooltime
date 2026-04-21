import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import RoleToggle from '@/components/ui/RoleToggle';
import { useIncomingRequests } from '@/hooks/useIncomingRequests';

export default function LenderProfileScreen() {
    const { profile, role } = useAuthStore();
    const { allBookings, isLoading: earningsLoading } = useIncomingRequests();
    const [earningsExpanded, setEarningsExpanded] = useState(false);

    const completedBookings = useMemo(() => {
        return allBookings.filter(b => b.status === 'completed');
    }, [allBookings]);

    const thisMonthEarnings = useMemo(() => {
        const now = new Date();
        return completedBookings
            .filter(b => {
                const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, b) => sum + (b.rentalFee || 0) - (b.platformFee || 0), 0);
    }, [completedBookings]);

    const allTimeEarnings = useMemo(() => {
        return completedBookings.reduce((sum, b) => sum + (b.rentalFee || 0) - (b.platformFee || 0), 0);
    }, [completedBookings]);

    const avgPerRental = useMemo(() => {
        if (completedBookings.length === 0) return 0;
        return Math.round(allTimeEarnings / completedBookings.length);
    }, [allTimeEarnings, completedBookings]);

    const fc = (c: number) => `$${(c / 100).toFixed(2)}`;

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = [
        { icon: 'card-outline', label: 'Payout Settings', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'construct-outline', label: 'Lender Requirements', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'notifications-outline', label: 'Notification Settings', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'shield-checkmark-outline', label: 'Trust & Safety', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
        { icon: 'help-circle-outline', label: 'Lender Support', onPress: () => Alert.alert('Coming Soon', 'This feature is under development.') },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* Avatar + Name */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: profile?.avatarUrl || 'https://i.pravatar.cc/150' }}
                            style={styles.avatar}
                        />
                        <View style={styles.lenderBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                        </View>
                    </View>
                    <Text style={styles.displayName}>{profile?.displayName || 'User'}</Text>
                    <Text style={styles.email}>{profile?.email || ''}</Text>
                    <Text style={styles.memberSince}>
                        {profile?.memberSince ? `Member since ${profile.memberSince}` : ''}
                    </Text>

                    {/* Role Toggle */}
                    <View style={styles.roleSection}>
                        <Text style={styles.roleLabel}>CURRENT MODE</Text>
                        <RoleToggle />
                    </View>
                </View>

                {/* Lender Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.lenderRating || 0}</Text>
                        <Text style={styles.statLabel}>Lender Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{earningsLoading ? '—' : completedBookings.length}</Text>
                        <Text style={styles.statLabel}>Tools Lent</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#5A7A4A' }]}>
                            {earningsLoading ? '—' : fc(allTimeEarnings)}
                        </Text>
                        <Text style={styles.statLabel}>Earned</Text>
                    </View>
                </View>

                {/* Earnings Card */}
                <TouchableOpacity
                    style={styles.earningsHeader}
                    onPress={() => setEarningsExpanded(!earningsExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.earningsHeaderLeft}>
                        <View style={styles.earningsIconWrap}>
                            <Ionicons name="wallet" size={20} color={COLORS.accent.primary} />
                        </View>
                        <View>
                            <Text style={styles.earningsTitle}>My Earnings</Text>
                            <Text style={styles.earningsPreview}>
                                {earningsLoading ? 'Loading...' : `${fc(allTimeEarnings)} all time`}
                            </Text>
                        </View>
                    </View>
                    <Ionicons
                        name={earningsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.text.muted}
                    />
                </TouchableOpacity>

                {earningsExpanded && (
                    <View style={styles.earningsBody}>
                        {earningsLoading ? (
                            <ActivityIndicator size="small" color={COLORS.accent.primary} />
                        ) : (
                            <View style={styles.earningsGrid}>
                                <View style={[styles.earningsCard, styles.earningsCardHighlight]}>
                                    <Text style={styles.earningsCardLabel}>This Month</Text>
                                    <Text style={styles.earningsCardValueGreen}>{fc(thisMonthEarnings)}</Text>
                                </View>
                                <View style={styles.earningsCard}>
                                    <Text style={styles.earningsCardLabel}>All Time</Text>
                                    <Text style={styles.earningsCardValue}>{fc(allTimeEarnings)}</Text>
                                </View>
                                <View style={styles.earningsCard}>
                                    <Text style={styles.earningsCardLabel}>Avg / Rental</Text>
                                    <Text style={styles.earningsCardValue}>{fc(avgPerRental)}</Text>
                                </View>
                                <View style={styles.earningsCard}>
                                    <Text style={styles.earningsCardLabel}>Completed</Text>
                                    <Text style={styles.earningsCardValue}>{completedBookings.length}</Text>
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
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F0E8',
        borderWidth: 3, borderColor: COLORS.accent.primary,
    },
    lenderBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.accent.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
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
    statLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 4, textAlign: 'center' },
    statDivider: { width: 1, height: '100%', backgroundColor: '#F5F0E8' },
    earningsHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 24, backgroundColor: '#FFF9F2', borderRadius: 16,
        padding: 16, marginBottom: 4, borderWidth: 1, borderColor: '#F5D4B8',
    },
    earningsHeaderLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    earningsIconWrap: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E4',
        alignItems: 'center', justifyContent: 'center',
    },
    earningsTitle: {
        fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary,
    },
    earningsPreview: {
        fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.text.muted, marginTop: 1,
    },
    earningsBody: {
        marginHorizontal: 24, backgroundColor: '#FFF9F2', borderRadius: 16,
        padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F5D4B8',
        borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0,
    },
    earningsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    earningsCard: {
        width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: '#F5F0E8', alignItems: 'center',
    },
    earningsCardHighlight: {
        backgroundColor: '#E8F5E2', borderColor: '#C8E6B8',
    },
    earningsCardLabel: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070',
        letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
    },
    earningsCardValue: {
        fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: COLORS.text.primary,
    },
    earningsCardValueGreen: {
        fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: '#5A7A4A',
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
