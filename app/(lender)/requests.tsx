import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useIncomingRequests, RequestWithDetails } from '@/hooks/useIncomingRequests';
import { COLORS } from '@/constants/theme';
import { acceptBooking, declineBooking } from '@/services/cloudFunctions';

export default function RequestsScreen() {
    const { requests, isLoading } = useIncomingRequests();
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;
    const formatPayout = (req: RequestWithDetails) => {
        const payout = (req.rentalFee || 0) + (req.deliveryFee || 0) - (req.platformFee || 0);
        return formatCents(payout);
    };

    const handleAccept = async (bookingId: string) => {
        setLoadingIds(prev => new Set(prev).add(bookingId));
        try {
            await acceptBooking({ bookingId });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoadingIds(prev => { const s = new Set(prev); s.delete(bookingId); return s; });
        }
    };

    const handleDecline = async (bookingId: string) => {
        Alert.alert('Decline Request', 'Are you sure you want to decline this rental request?', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Decline', style: 'destructive', onPress: async () => {
                    setLoadingIds(prev => new Set(prev).add(bookingId));
                    try {
                        await declineBooking({ bookingId });
                    } catch (e: any) {
                        Alert.alert('Error', e.message);
                    } finally {
                        setLoadingIds(prev => { const s = new Set(prev); s.delete(bookingId); return s; });
                    }
                }
            }
        ]);
    };

    const timeAgo = (ts: any) => {
        if (!ts) return 'just now';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const s = Math.floor((Date.now() - d.getTime()) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    };

    const renderItem = ({ item }: { item: RequestWithDetails }) => {
        const isItemLoading = loadingIds.has(item.id);

        return (
            <View style={styles.card}>
                {/* Borrower Info */}
                <View style={styles.borrowerRow}>
                    <Image source={{ uri: item.borrowerProfile?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.borrowerName}>{item.borrowerProfile?.displayName || 'Borrower'}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color="#D98634" />
                            <Text style={styles.ratingText}>
                                {item.borrowerProfile?.borrowerRating || 0} • {item.borrowerProfile?.totalRentals || 0} Rentals
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                </View>

                {/* Tool Details */}
                <View style={styles.toolRow}>
                    <Image source={{ uri: item.tool?.photoUrls?.[0] }} style={styles.toolThumb} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.toolName}>{item.tool?.name || 'Tool'}</Text>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <Ionicons name="time-outline" size={14} color="#9A8070" />
                                <Text style={styles.detailText}>{item.durationHours}h</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="location-outline" size={14} color="#9A8070" />
                                <Text style={styles.detailText}>0.8 mi</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Payout */}
                <View style={styles.payoutRow}>
                    <Text style={styles.payoutLabel}>TOTAL PAYOUT</Text>
                    <Text style={styles.payoutAmount}>{formatPayout(item)}</Text>
                    <View style={styles.payoutBadge}>
                        <Text style={styles.payoutBadgeText}>You Receive</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDecline(item.id)}
                        disabled={isItemLoading}
                    >
                        <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.acceptBtn, isItemLoading && { opacity: 0.6 }]}
                        onPress={() => handleAccept(item.id)}
                        disabled={isItemLoading}
                    >
                        {isItemLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.acceptBtnText}>Accept Request</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Requests</Text>
                <Text style={styles.subtitle}>{requests.length} pending</Text>
            </View>

            {requests.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptySub}>No pending requests — your tools are all caught up!</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'baseline', gap: 12,
    },
    title: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.text.primary },
    subtitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#9A8070' },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
        marginBottom: 16, borderWidth: 1, borderColor: '#F5F0E8',
    },
    borrowerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F0E8' },
    borrowerName: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    ratingText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070' },
    timeText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070' },
    toolRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 16,
    },
    toolThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F5F0E8' },
    toolName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    detailRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070' },
    payoutRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8,
    },
    payoutLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: '#9A8070' },
    payoutAmount: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: '#5A7A4A' },
    payoutBadge: { backgroundColor: '#E8F5E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    payoutBadgeText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: '#5A7A4A' },
    actions: { flexDirection: 'row', gap: 12 },
    declineBtn: {
        flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0D4C0',
        alignItems: 'center', justifyContent: 'center',
    },
    declineBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    acceptBtn: {
        flex: 1.5, height: 48, borderRadius: 14, backgroundColor: '#5A7A4A',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    acceptBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#FFFFFF' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary, marginTop: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 15, color: '#9A8070', textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
