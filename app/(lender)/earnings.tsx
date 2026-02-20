import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useIncomingRequests, RequestWithDetails } from '@/hooks/useIncomingRequests';
import { COLORS } from '@/constants/theme';

export default function EarningsScreen() {
    const { allBookings, isLoading } = useIncomingRequests();

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

    const formatDate = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderTransaction = ({ item }: { item: RequestWithDetails }) => (
        <View style={styles.txRow}>
            <View style={styles.txIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#5A7A4A" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.txToolName}>{item.tool?.name || 'Tool'}</Text>
                <Text style={styles.txBorrower}>{item.borrowerProfile?.displayName || 'Borrower'} • {item.durationHours}h</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.txAmount}>+{fc((item.rentalFee || 0) - (item.platformFee || 0))}</Text>
                <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Earnings</Text>
            </View>

            {/* Demo Banner */}
            <View style={styles.demoBanner}>
                <Ionicons name="flask-outline" size={16} color={COLORS.accent.primary} />
                <Text style={styles.demoText}>Test Mode — payouts simulated</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
                    <Text style={styles.summaryLabel}>This Month</Text>
                    <Text style={styles.summaryAmountLarge}>{fc(thisMonthEarnings)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>All Time</Text>
                    <Text style={styles.summaryAmount}>{fc(allTimeEarnings)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Avg / Rental</Text>
                    <Text style={styles.summaryAmount}>{fc(avgPerRental)}</Text>
                </View>
            </View>

            {/* Transaction History */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>

            {completedBookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>No earnings yet</Text>
                    <Text style={styles.emptySub}>Complete your first rental to start earning!</Text>
                </View>
            ) : (
                <FlatList
                    data={completedBookings}
                    renderItem={renderTransaction}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}

            {/* Stripe Button */}
            <View style={styles.stripeContainer}>
                <TouchableOpacity
                    style={styles.stripeBtn}
                    onPress={() => Linking.openURL('https://dashboard.stripe.com')}
                >
                    <Ionicons name="open-outline" size={18} color={COLORS.accent.primary} />
                    <Text style={styles.stripeBtnText}>Open Stripe Dashboard</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
    title: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.text.primary },
    demoBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 24, backgroundColor: '#FFF9F2', borderRadius: 12,
        padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FACB9B',
    },
    demoText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: COLORS.accent.primary },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 28 },
    summaryCard: {
        flex: 1, backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#F5F0E8', alignItems: 'center',
    },
    summaryCardHighlight: { backgroundColor: '#E8F5E2', borderColor: '#C8E6B8' },
    summaryLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070', marginBottom: 8, letterSpacing: 0.5 },
    summaryAmount: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 18, color: COLORS.text.primary },
    summaryAmountLarge: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: '#5A7A4A' },
    sectionHeader: { paddingHorizontal: 24, marginBottom: 12 },
    sectionTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    listContent: { paddingHorizontal: 24, paddingBottom: 160 },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
    txIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E2', alignItems: 'center', justifyContent: 'center' },
    txToolName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    txBorrower: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2 },
    txAmount: { fontFamily: 'JetBrainsMono-Regular', fontSize: 15, color: '#5A7A4A', fontWeight: '700' },
    txDate: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 2 },
    separator: { height: 1, backgroundColor: '#F5F0E8' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary, marginTop: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 15, color: '#9A8070', textAlign: 'center', marginTop: 8, lineHeight: 22 },
    stripeContainer: {
        position: 'absolute', bottom: 100, left: 0, right: 0,
        paddingHorizontal: 24,
    },
    stripeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent.primary,
        backgroundColor: '#FFFFFF',
    },
    stripeBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.accent.primary },
});
