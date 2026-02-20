import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useIncomingRequests, RequestWithDetails } from '@/hooks/useIncomingRequests';
import { useMyListings } from '@/hooks/useMyListings';
import { COLORS } from '@/constants/theme';
import { acceptBooking, declineBooking } from '@/services/cloudFunctions';
import { seedLenderData } from '@/services/seedLenderData';
import { Tool } from '@/types/tool.types';

export default function LenderDashboard() {
    const { profile } = useAuthStore();
    const { requests, allBookings, isLoading: reqLoading } = useIncomingRequests();
    const { listings, isLoading: listLoading } = useMyListings();

    // Seed demo data for lender on first visit
    useEffect(() => {
        seedLenderData();
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

    const handleAccept = async (bookingId: string) => {
        try {
            await acceptBooking({ bookingId });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleDecline = async (bookingId: string) => {
        Alert.alert('Decline Request', 'Are you sure you want to decline this request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Decline', style: 'destructive', onPress: async () => {
                    try { await declineBooking({ bookingId }); } catch (e: any) { Alert.alert('Error', e.message); }
                }
            }
        ]);
    };

    const formatCents = (c: number) => `$${(c / 100).toFixed(0)}`;

    if (reqLoading && listLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                    <TouchableOpacity style={styles.notifBtn}>
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

                {/* Active Delivery Banner */}
                {activeRentals.length > 0 && (
                    <TouchableOpacity style={styles.deliveryBanner}>
                        <View style={styles.deliveryLeft}>
                            <View style={styles.deliveryDot} />
                            <View>
                                <Text style={styles.deliveryStatus}>
                                    {activeRentals[0].status === 'en_route' ? 'IN TRANSIT' :
                                        activeRentals[0].status === 'accepted' ? 'PREPARING' :
                                            activeRentals[0].status === 'active' ? 'RENTED OUT' : 'DELIVERED'}
                                </Text>
                                <Text style={styles.deliveryText} numberOfLines={1}>
                                    {activeRentals[0].tool?.name || 'Tool'} to {activeRentals[0].borrowerProfile?.displayName || 'Borrower'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9A8070" />
                    </TouchableOpacity>
                )}

                {/* Pending Requests */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pending Requests</Text>
                    {requests.length > 0 && (
                        <TouchableOpacity onPress={() => router.push('/(lender)/requests')}>
                            <Text style={styles.viewAll}>View all</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {requests.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="checkmark-circle-outline" size={32} color="#EDE4D4" />
                        <Text style={styles.emptyText}>No pending requests — you're all caught up!</Text>
                    </View>
                ) : (
                    requests.slice(0, 3).map((req) => (
                        <View key={req.id} style={styles.requestCard}>
                            <View style={styles.reqHeader}>
                                <Image source={{ uri: req.borrowerProfile?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.reqAvatar} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.reqName}>{req.borrowerProfile?.displayName || 'Borrower'}</Text>
                                    <Text style={styles.reqDetail}>{req.tool?.name || 'Tool'} • {req.durationHours}h</Text>
                                </View>
                                <Text style={styles.reqPayout}>{formatCents((req.rentalFee || 0) - (req.platformFee || 0))}</Text>
                            </View>
                            <View style={styles.reqActions}>
                                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req.id)}>
                                    <Text style={styles.declineBtnText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id)}>
                                    <Text style={styles.acceptBtnText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                {/* My Listings */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Listings</Text>
                    <TouchableOpacity onPress={() => router.push('/(lender)/listings')}>
                        <Text style={styles.viewAll}>Manage</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, gap: 16 }}>
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
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Coming Soon', 'List a Tool form is coming soon!')}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
        padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#FACB9B', marginBottom: 28,
    },
    deliveryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    deliveryDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent.primary },
    deliveryStatus: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: COLORS.accent.primary, fontWeight: '700' },
    deliveryText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary, marginTop: 2 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, marginBottom: 16,
    },
    sectionTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary },
    viewAll: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.accent.primary },
    emptyCard: {
        marginHorizontal: 24, backgroundColor: '#FAFAFA', borderRadius: 16, padding: 24,
        alignItems: 'center', gap: 12, marginBottom: 28, borderWidth: 1, borderColor: '#F5F0E8',
    },
    emptyText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#9A8070', textAlign: 'center' },
    requestCard: {
        marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16,
        padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F5F0E8',
    },
    reqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    reqAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F0E8' },
    reqName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    reqDetail: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2 },
    reqPayout: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: COLORS.accent.primary },
    reqActions: { flexDirection: 'row', gap: 12 },
    declineBtn: {
        flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#E0D4C0',
        alignItems: 'center', justifyContent: 'center',
    },
    declineBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary },
    acceptBtn: {
        flex: 1, height: 40, borderRadius: 12, backgroundColor: '#5A7A4A',
        alignItems: 'center', justifyContent: 'center',
    },
    acceptBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#FFFFFF' },
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
