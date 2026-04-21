import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
    Animated, Dimensions, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useIncomingRequests, RequestWithDetails } from '@/hooks/useIncomingRequests';
import { COLORS } from '@/constants/theme';
import { acceptBooking, declineBooking } from '@/services/cloudFunctions';
import { findOrCreateDirectThread } from '@/services/messageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = (SCREEN_WIDTH - 48) / 3;

type TabKey = 'pending' | 'active' | 'history';

const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'active', label: 'Active', icon: 'flash-outline' },
    { key: 'history', label: 'History', icon: 'archive-outline' },
];

export default function RequestsScreen() {
    const { requests, allBookings, isLoading } = useIncomingRequests();
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const tabIndicator = useRef(new Animated.Value(0)).current;

    const switchTab = (tab: TabKey, index: number) => {
        setActiveTab(tab);
        Animated.spring(tabIndicator, {
            toValue: index * TAB_WIDTH,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
        }).start();
    };

    const pendingRequests = useMemo(() =>
        allBookings.filter(b => b.status === 'pending'), [allBookings]);

    const activeRequests = useMemo(() =>
        allBookings.filter(b => ['accepted', 'en_route', 'delivered'].includes(b.status)), [allBookings]);

    const historyRequests = useMemo(() =>
        allBookings.filter(b => ['active', 'completed', 'cancelled'].includes(b.status))
            .sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
            }), [allBookings]);

    const currentData = useMemo(() => {
        switch (activeTab) {
            case 'pending': return pendingRequests;
            case 'active': return activeRequests;
            case 'history': return historyRequests;
        }
    }, [activeTab, pendingRequests, activeRequests, historyRequests]);

    const totalEarned = useMemo(() => {
        return allBookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.rentalFee || 0) - (b.platformFee || 0), 0);
    }, [allBookings]);

    const acceptanceRate = useMemo(() => {
        const decided = allBookings.filter(b => ['accepted', 'en_route', 'delivered', 'active', 'completed', 'cancelled'].includes(b.status));
        if (decided.length === 0) return 100;
        const accepted = decided.filter(b => b.status !== 'cancelled');
        return Math.round((accepted.length / decided.length) * 100);
    }, [allBookings]);

    const handleAccept = async (bookingId: string) => {
        setLoadingIds(prev => new Set(prev).add(bookingId));
        const result = await acceptBooking({ bookingId });
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to accept request');
        }
        setLoadingIds(prev => { const s = new Set(prev); s.delete(bookingId); return s; });
    };

    const handleDecline = async (bookingId: string) => {
        Alert.alert('Decline Request', 'Are you sure you want to decline this rental request?', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Decline', style: 'destructive', onPress: async () => {
                    setLoadingIds(prev => new Set(prev).add(bookingId));
                    const result = await declineBooking({ bookingId });
                    if (!result.success) {
                        Alert.alert('Error', result.error || 'Failed to decline request');
                    }
                    setLoadingIds(prev => { const s = new Set(prev); s.delete(bookingId); return s; });
                }
            }
        ]);
    };

    const handleMessage = async (item: RequestWithDetails) => {
        if (!item.tool?.name) return;
        try {
            const { threadId } = await findOrCreateDirectThread({
                otherUserId: item.borrowerId,
                toolId: item.toolId,
                toolName: item.tool.name,
                role: 'lender',
            });
            router.push({
                pathname: '/modals/chat',
                params: {
                    threadId,
                    otherName: item.borrowerProfile?.displayName || 'Borrower',
                    toolName: item.tool.name,
                },
            });
        } catch (e) {
            console.error('Error opening chat:', e);
        }
    };

    const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;
    const formatPayout = (req: RequestWithDetails) => {
        const payout = (req.rentalFee || 0) + (req.deliveryFee || 0) - (req.platformFee || 0);
        return formatCents(payout);
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

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'accepted': return { label: 'Preparing', color: '#5A7A4A', bg: '#EBF5E5', icon: 'cube-outline' };
            case 'en_route': return { label: 'En Route', color: '#C4622A', bg: '#FFF3EB', icon: 'navigate-outline' };
            case 'delivered': return { label: 'Delivered', color: '#2A6CB4', bg: '#EBF3FF', icon: 'location-outline' };
            case 'active': return { label: 'Active', color: '#7C5AC7', bg: '#F3EEFF', icon: 'play-circle-outline' };
            case 'completed': return { label: 'Completed', color: '#5A7A4A', bg: '#EBF5E5', icon: 'checkmark-circle-outline' };
            case 'cancelled': return { label: 'Cancelled', color: '#CC3333', bg: '#FFEBEB', icon: 'close-circle-outline' };
            default: return { label: 'Pending', color: '#9A8070', bg: '#F5F0E8', icon: 'time-outline' };
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await new Promise(r => setTimeout(r, 1000));
        setRefreshing(false);
    }, []);

    const renderPendingCard = (item: RequestWithDetails) => {
        const isItemLoading = loadingIds.has(item.id);
        const payout = (item.rentalFee || 0) + (item.deliveryFee || 0) - (item.platformFee || 0);

        return (
            <View style={styles.pendingCard}>
                {/* Urgency indicator */}
                <View style={styles.urgencyBar} />

                {/* Header: Borrower + Time */}
                <View style={styles.cardHeader}>
                    <View style={styles.borrowerInfo}>
                        <Image
                            source={{ uri: item.borrowerProfile?.avatarUrl || 'https://i.pravatar.cc/150' }}
                            style={styles.avatar}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.borrowerName}>
                                {item.borrowerProfile?.displayName || 'Borrower'}
                            </Text>
                            <View style={styles.metaRow}>
                                <Ionicons name="star" size={11} color="#D98634" />
                                <Text style={styles.metaText}>
                                    {item.borrowerProfile?.borrowerRating?.toFixed(1) || '5.0'}
                                </Text>
                                <View style={styles.metaDot} />
                                <Text style={styles.metaText}>
                                    {item.borrowerProfile?.totalRentals || 0} rentals
                                </Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.cardMsgBtn}
                        onPress={() => handleMessage(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.accent.primary} />
                    </TouchableOpacity>
                    <View style={styles.timeBadge}>
                        <Ionicons name="time-outline" size={12} color={COLORS.accent.primary} />
                        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                    </View>
                </View>

                {/* Tool Row */}
                <View style={styles.toolSection}>
                    <Image
                        source={{ uri: item.tool?.photoUrls?.[0] }}
                        style={styles.toolImage}
                        contentFit="cover"
                    />
                    <View style={styles.toolDetails}>
                        <Text style={styles.toolName} numberOfLines={1}>{item.tool?.name || 'Tool'}</Text>
                        <View style={styles.toolMeta}>
                            <View style={styles.chipSmall}>
                                <Ionicons name="time-outline" size={12} color="#9A8070" />
                                <Text style={styles.chipText}>{item.durationHours}h rental</Text>
                            </View>
                            <View style={styles.chipSmall}>
                                <Ionicons name="location-outline" size={12} color="#9A8070" />
                                <Text style={styles.chipText}>0.8 mi away</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Earnings breakdown */}
                <View style={styles.earningsRow}>
                    <View style={styles.earningsLeft}>
                        <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
                        <View style={styles.earningsBreakdown}>
                            <Text style={styles.earningsDetail}>
                                Rental {formatCents(item.rentalFee || 0)} + Delivery {formatCents(item.deliveryFee || 0)} − Fee {formatCents(item.platformFee || 0)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.payoutPill}>
                        <Text style={styles.payoutAmount}>{formatCents(payout)}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDecline(item.id)}
                        disabled={isItemLoading}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={18} color={COLORS.text.primary} />
                        <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.acceptBtn, isItemLoading && { opacity: 0.6 }]}
                        onPress={() => handleAccept(item.id)}
                        disabled={isItemLoading}
                        activeOpacity={0.7}
                    >
                        {isItemLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.acceptBtnText}>Accept & Earn</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderActiveCard = (item: RequestWithDetails) => {
        const config = getStatusConfig(item.status);

        return (
            <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push({ pathname: '/modals/lender-delivery', params: { bookingId: item.id } })}
                activeOpacity={0.7}
            >
                <View style={styles.activeCardLeft}>
                    <Image
                        source={{ uri: item.tool?.photoUrls?.[0] || 'https://via.placeholder.com/50' }}
                        style={styles.activeThumb}
                        contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.activeToolName} numberOfLines={1}>
                            {item.tool?.name || 'Tool'}
                        </Text>
                        <Text style={styles.activeBorrower} numberOfLines={1}>
                            to {item.borrowerProfile?.displayName || 'Borrower'}
                        </Text>
                    </View>
                </View>
                <View style={styles.activeCardRight}>
                    <TouchableOpacity
                        style={styles.cardMsgBtn}
                        onPress={(e) => { e.stopPropagation(); handleMessage(item); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.accent.primary} />
                    </TouchableOpacity>
                    <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon as any} size={12} color={config.color} />
                        <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9A8070" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderHistoryCard = (item: RequestWithDetails) => {
        const config = getStatusConfig(item.status);
        const payout = (item.rentalFee || 0) + (item.deliveryFee || 0) - (item.platformFee || 0);

        return (
            <View style={styles.historyCard}>
                <View style={styles.historyTop}>
                    <Image
                        source={{ uri: item.tool?.photoUrls?.[0] || 'https://via.placeholder.com/40' }}
                        style={styles.historyThumb}
                        contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.historyToolName} numberOfLines={1}>{item.tool?.name || 'Tool'}</Text>
                        <Text style={styles.historyBorrower}>
                            {item.borrowerProfile?.displayName || 'Borrower'} • {item.durationHours}h
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                        <Text style={[styles.historyStatus, { color: config.color }]}>{config.label}</Text>
                        {item.status === 'completed' && (
                            <Text style={styles.historyEarned}>+{formatCents(payout)}</Text>
                        )}
                    </View>
                </View>
                <Text style={styles.historyTime}>{timeAgo(item.createdAt)}</Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: RequestWithDetails }) => {
        switch (activeTab) {
            case 'pending': return renderPendingCard(item);
            case 'active': return renderActiveCard(item);
            case 'history': return renderHistoryCard(item);
        }
    };

    const renderEmpty = () => {
        const emptyConfig = {
            pending: {
                icon: 'checkmark-done-circle-outline' as const,
                title: 'All caught up!',
                subtitle: 'No pending requests. When borrowers request your tools, they\'ll appear here.',
            },
            active: {
                icon: 'flash-outline' as const,
                title: 'No active deliveries',
                subtitle: 'Accepted requests in progress will show here.',
            },
            history: {
                icon: 'archive-outline' as const,
                title: 'No rental history yet',
                subtitle: 'Completed and cancelled rentals will appear here.',
            },
        };
        const config = emptyConfig[activeTab];

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                    <Ionicons name={config.icon} size={48} color="#D4B896" />
                </View>
                <Text style={styles.emptyTitle}>{config.title}</Text>
                <Text style={styles.emptySub}>{config.subtitle}</Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Requests</Text>
                <View style={styles.headerRight}>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{acceptanceRate}%</Text>
                        <Text style={styles.headerStatLabel}>rate</Text>
                    </View>
                    <View style={styles.headerStatDivider} />
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{formatCents(totalEarned)}</Text>
                        <Text style={styles.headerStatLabel}>earned</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <View style={styles.tabRow}>
                    {TABS.map((tab, idx) => {
                        const count = tab.key === 'pending' ? pendingRequests.length
                            : tab.key === 'active' ? activeRequests.length
                            : historyRequests.length;
                        const isActive = activeTab === tab.key;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tabItem}
                                onPress={() => switchTab(tab.key, idx)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.tabContent}>
                                    <Ionicons
                                        name={tab.icon as any}
                                        size={16}
                                        color={isActive ? COLORS.accent.primary : '#9A8070'}
                                    />
                                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                        {tab.label}
                                    </Text>
                                    {count > 0 && (
                                        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                                            <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                                                {count}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Animated.View
                    style={[styles.tabIndicator, { transform: [{ translateX: tabIndicator }] }]}
                />
            </View>

            {/* Content */}
            <FlatList
                data={currentData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    currentData.length === 0 && { flex: 1 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.accent.primary}
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
    },
    title: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: COLORS.text.primary },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerStat: { alignItems: 'center' },
    headerStatValue: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary },
    headerStatLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070', marginTop: 1 },
    headerStatDivider: { width: 1, height: 24, backgroundColor: '#F5F0E8' },

    // Tabs
    tabContainer: { paddingHorizontal: 24, marginBottom: 8 },
    tabRow: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 14, padding: 4 },
    tabItem: { width: TAB_WIDTH, paddingVertical: 10, alignItems: 'center' },
    tabContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#9A8070' },
    tabLabelActive: { color: COLORS.accent.primary },
    tabBadge: {
        minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EDE4D4',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    tabBadgeActive: { backgroundColor: COLORS.accent.primary },
    tabBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070', fontWeight: '700' },
    tabBadgeTextActive: { color: '#FFFFFF' },
    tabIndicator: {
        position: 'absolute', bottom: 4, left: 4,
        width: TAB_WIDTH, height: 3, borderRadius: 2,
        backgroundColor: COLORS.accent.primary,
    },

    // List
    listContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },

    // ====== PENDING CARD ======
    pendingCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
        marginBottom: 16, borderWidth: 1, borderColor: '#F5F0E8',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        overflow: 'hidden',
    },
    urgencyBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, backgroundColor: COLORS.accent.primary,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16,
    },
    borrowerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F0E8' },
    borrowerName: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    metaText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070' },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D4B896' },
    timeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFF9F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
        borderWidth: 1, borderColor: '#FACB9B',
    },
    timeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: COLORS.accent.primary },

    // Tool Section
    toolSection: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAFAFA', borderRadius: 14, padding: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#F5F0E8',
    },
    toolImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F5F0E8' },
    toolDetails: { flex: 1, marginLeft: 14 },
    toolName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary, marginBottom: 6 },
    toolMeta: { flexDirection: 'row', gap: 10 },
    chipSmall: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
        borderWidth: 1, borderColor: '#F5F0E8',
    },
    chipText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9A8070' },

    // Earnings
    earningsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5F0E8',
    },
    earningsLeft: { flex: 1 },
    earningsLabel: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070',
        letterSpacing: 0.5, marginBottom: 4,
    },
    earningsBreakdown: { flexDirection: 'row', flexWrap: 'wrap' },
    earningsDetail: { fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9A8070', lineHeight: 16 },
    payoutPill: {
        backgroundColor: '#EBF5E5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
        borderWidth: 1, borderColor: '#C8E6B8',
    },
    payoutAmount: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: '#5A7A4A' },

    cardMsgBtn: {
        width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF5ED',
        alignItems: 'center', justifyContent: 'center',
    },

    // Actions
    actions: { flexDirection: 'row', gap: 12 },
    declineBtn: {
        flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0D4C0',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    declineBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    acceptBtn: {
        flex: 1.8, height: 48, borderRadius: 14, backgroundColor: '#5A7A4A',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    acceptBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#FFFFFF' },

    // ====== ACTIVE CARD ======
    activeCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#F5F0E8',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    },
    activeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    activeThumb: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F0E8' },
    activeToolName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    activeBorrower: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2 },
    activeCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    statusPillText: { fontFamily: 'DMSans-Medium', fontSize: 11 },

    // ====== HISTORY CARD ======
    historyCard: {
        backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: '#F5F0E8',
    },
    historyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F0E8' },
    historyToolName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary },
    historyBorrower: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
    historyStatus: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 },
    historyEarned: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#5A7A4A', marginTop: 3 },
    historyTime: {
        fontFamily: 'DMSans-Regular', fontSize: 11, color: '#BC9F77', marginTop: 8, marginLeft: 52,
    },

    // ====== EMPTY STATE ======
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF9F2',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: '#FACB9B',
    },
    emptyTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 22, color: COLORS.text.primary, marginBottom: 8 },
    emptySub: {
        fontFamily: 'DMSans-Regular', fontSize: 14, color: '#9A8070',
        textAlign: 'center', lineHeight: 21,
    },
});
