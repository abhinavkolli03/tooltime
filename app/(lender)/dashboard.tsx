import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useIncomingRequests } from '@/hooks/useIncomingRequests';
import { useMyListings } from '@/hooks/useMyListings';
import { COLORS } from '@/constants/theme';
import { seedLenderData } from '@/services/seedLenderData';
import BorrowerDiscoverSkeleton from '@/components/skeletons/BorrowerDiscoverSkeleton';
import LenderDashboardSkeleton from '@/components/skeletons/LenderDashboardSkeleton';

export default function LenderDashboard() {
    const { profile, setRole } = useAuthStore();
    const { requests, allBookings, isLoading: reqLoading } = useIncomingRequests();
    const { listings, isLoading: listLoading } = useMyListings();
    const [showBorrowerTransition, setShowBorrowerTransition] = useState(false);

    // Seed demo data for lender on first visit
    useEffect(() => {
        const checkSeed = async () => {
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const seeded = await AsyncStorage.getItem('tooltime_lender_seeded');
                if (!seeded) {
                    await seedLenderData();
                    await AsyncStorage.setItem('tooltime_lender_seeded', 'true');
                }
            } catch (e) {
                seedLenderData();
            }
        };
        checkSeed();
    }, []);

    const firstName = profile?.displayName?.split(' ')[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const activeRentals = useMemo(() => {
        return allBookings.filter(b => ['accepted', 'en_route', 'delivered', 'active'].includes(b.status));
    }, [allBookings]);

    const completedThisMonth = useMemo(() => {
        const now = new Date();
        return allBookings.filter(b => {
            if (b.status !== 'completed') return false;
            const created = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        });
    }, [allBookings]);

    const monthEarnings = useMemo(() => {
        return completedThisMonth.reduce((sum, b) => sum + (b.rentalFee || 0) - (b.platformFee || 0), 0);
    }, [completedThisMonth]);

    const formatCents = (c: number) => `$${(c / 100).toFixed(0)}`;

    useEffect(() => {
        if (showBorrowerTransition) {
            const frame = requestAnimationFrame(() => {
                setRole('borrower');
                router.replace('/(borrower)/discover');
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [showBorrowerTransition]);

    if (showBorrowerTransition) {
        return <BorrowerDiscoverSkeleton />;
    }

    if (reqLoading && listLoading) {
        return <LenderDashboardSkeleton />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Toggle Pill - Fixed at top */}
            <View style={styles.topToggleContainer}>
                <View style={styles.togglePill}>
                    <TouchableOpacity
                        style={styles.toggleSide}
                        onPress={() => setShowBorrowerTransition(true)}
                    >
                        <Text style={styles.toggleInactiveText}>Borrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleSide, styles.toggleActive]}
                    >
                        <Text style={styles.toggleActiveText}>Lend</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image source={{ uri: profile?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                        <View>
                            <Text style={styles.greeting}>{greeting},</Text>
                            <Text style={styles.name}>{firstName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.notifBtn} onPress={() => Alert.alert('Notifications', 'Notification center coming soon!')}>
                        <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
                        {requests.length > 0 && <View style={styles.notifDot} />}
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>TOOLS LISTED</Text>
                        <Text style={styles.statValue}>{listings.length}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>ACTIVE RENTALS</Text>
                        <Text style={styles.statValue}>{activeRentals.length}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>THIS MONTH</Text>
                        <Text style={[styles.statValue, { color: '#5A7A4A' }]}>{formatCents(monthEarnings)}</Text>
                    </View>
                </View>

                {/* Active Deliveries */}
                {activeRentals.length > 0 && activeRentals.map((rental) => {
                    const statusLabel =
                        rental.status === 'en_route' ? 'IN TRANSIT' :
                        rental.status === 'accepted' ? 'PREPARING' :
                        rental.status === 'active' ? 'RENTED OUT' : 'DELIVERED';
                    const needsAction = rental.status === 'accepted' || rental.status === 'en_route';
                    return (
                        <TouchableOpacity
                            key={rental.id}
                            style={[styles.deliveryBanner, needsAction && styles.deliveryBannerUrgent]}
                            onPress={() => router.push({ pathname: '/modals/lender-delivery', params: { bookingId: rental.id } })}
                        >
                            <View style={styles.deliveryLeft}>
                                <Image
                                    source={{ uri: rental.tool?.photoUrls?.[0] || 'https://via.placeholder.com/40' }}
                                    style={styles.deliveryThumb}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.deliveryStatus}>{statusLabel}</Text>
                                    <Text style={styles.deliveryText} numberOfLines={1}>
                                        {rental.tool?.name || 'Tool'} to {rental.borrowerProfile?.displayName || 'Borrower'}
                                    </Text>
                                </View>
                            </View>
                            {needsAction && (
                                <View style={styles.deliveryActionHint}>
                                    <Text style={styles.deliveryActionText}>Action needed</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#9A8070" />
                        </TouchableOpacity>
                    );
                })}

                {/* My Tools */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Tools</Text>
                    <TouchableOpacity onPress={() => router.push('/(lender)/listings')}>
                        <View style={styles.manageBtn}>
                            <Ionicons name="settings-outline" size={16} color={COLORS.accent.primary} />
                            <Text style={styles.manageBtnText}>Manage All</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {listings.length === 0 ? (
                    <View style={styles.emptyListings}>
                        <Ionicons name="construct-outline" size={48} color="#EDE4D4" />
                        <Text style={styles.emptyListingsTitle}>No tools listed yet</Text>
                        <Text style={styles.emptyListingsText}>Start earning by listing your first tool</Text>
                        <TouchableOpacity
                            style={styles.listToolBtn}
                            onPress={() => router.push('/modals/list-tool')}
                        >
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                            <Text style={styles.listToolBtnText}>List Your First Tool</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, gap: 16, paddingRight: 24 }}>
                        {listings.map((tool) => (
                            <View key={tool.id} style={styles.listingCard}>
                                <Image source={{ uri: tool.photoUrls?.[0] }} style={styles.listingImg} contentFit="cover" />
                                <View style={[styles.availBadge, { backgroundColor: tool.isAvailable ? '#5A7A4A' : COLORS.accent.primary }]}>
                                    <Text style={styles.availText}>{tool.isAvailable ? 'AVAILABLE' : 'RENTED'}</Text>
                                </View>
                                <Text style={styles.listingName} numberOfLines={1}>{tool.name}</Text>
                                <Text style={styles.listingPrice}>{formatCents(tool.dailyRate)} / day</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/modals/list-tool')}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topToggleContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    togglePill: {
        flexDirection: 'row',
        height: 36,
        backgroundColor: '#EDE4D4',
        borderRadius: 18,
        padding: 2,
    },
    toggleSide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: '#C4622A',
        borderRadius: 14,
    },
    toggleActiveText: {
        color: '#FFFFFF',
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    toggleInactiveText: {
        color: '#9A8070',
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F0E8' },
    greeting: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#9A8070' },
    name: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary },
    notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' },
    notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#B84040' },
    statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1, backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#F5F0E8', alignItems: 'center',
    },
    statLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070', marginBottom: 8, letterSpacing: 0.5 },
    statValue: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary },
    deliveryBanner: {
        marginHorizontal: 24, backgroundColor: '#FFF9F2', borderRadius: 16,
        padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#FACB9B', marginBottom: 10, gap: 8,
    },
    deliveryBannerUrgent: {
        borderColor: COLORS.accent.primary, borderWidth: 1.5,
    },
    deliveryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    deliveryThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F5F0E8' },
    deliveryStatus: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: COLORS.accent.primary, fontWeight: '700' },
    deliveryText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary, marginTop: 2 },
    deliveryActionHint: {
        backgroundColor: COLORS.accent.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    deliveryActionText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: '#FFFFFF', letterSpacing: 0.3 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, marginBottom: 16,
    },
    sectionTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary },
    viewAll: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.accent.primary },
    manageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
        backgroundColor: '#FFF9F2', borderWidth: 1, borderColor: '#FACB9B',
    },
    manageBtnText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: COLORS.accent.primary },
    emptyListings: {
        marginHorizontal: 24, backgroundColor: '#FAFAFA', borderRadius: 20,
        padding: 32, alignItems: 'center', marginBottom: 28,
        borderWidth: 1, borderColor: '#F5F0E8',
    },
    emptyListingsTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary, marginTop: 12 },
    emptyListingsText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#9A8070', marginTop: 4, marginBottom: 16, textAlign: 'center' },
    listToolBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.accent.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    },
    listToolBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#FFFFFF' },
    listingCard: { width: 160, marginBottom: 28 },
    listingImg: { width: 160, height: 130, borderRadius: 16, backgroundColor: '#F5F0E8', marginBottom: 8 },
    availBadge: {
        position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    availText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#FFFFFF', fontWeight: '700' },
    listingName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary },
    listingPrice: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2 },
    fab: {
        position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28,
        backgroundColor: COLORS.accent.primary, alignItems: 'center', justifyContent: 'center',
        shadowColor: COLORS.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
});
