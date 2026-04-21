import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import { Booking, BookingStatus } from '@/types/booking.types';
import { Tool } from '@/types/tool.types';
import { updateDoc } from 'firebase/firestore';
import { findOrCreateDirectThread } from '@/services/messageService';

type BookingWithTool = Booking & { tool?: Tool; lenderName?: string };

export default function ActivityScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [bookings, setBookings] = useState<BookingWithTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'bookings'),
            where('borrowerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const bookingsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BookingWithTool));

            const enrichedBookings = await Promise.all(bookingsData.map(async (b) => {
                const toolDoc = await getDoc(doc(db, 'tools', b.toolId));
                const lenderDoc = await getDoc(doc(db, 'users', b.lenderId));

                return {
                    ...b,
                    tool: toolDoc.exists() ? toolDoc.data() as Tool : undefined,
                    lenderName: lenderDoc.exists() ? lenderDoc.data()?.displayName : 'Lender'
                };
            }));

            setBookings(enrichedBookings);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCancel = (bookingId: string) => {
        Alert.alert(
            "Cancel Request",
            "Are you sure you want to cancel this tool request?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'bookings', bookingId), {
                                status: 'cancelled',
                                updatedAt: new Date()
                            });
                        } catch (error) {
                            console.error("Error cancelling booking:", error);
                            Alert.alert("Error", "Could not cancel booking. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleMessage = async (booking: BookingWithTool) => {
        if (!booking.tool?.name) return;
        try {
            const { threadId } = await findOrCreateDirectThread({
                otherUserId: booking.lenderId,
                toolId: booking.toolId,
                toolName: booking.tool.name,
                role: 'borrower',
            });
            router.push({
                pathname: '/modals/chat',
                params: {
                    threadId,
                    otherName: booking.lenderName || 'Lender',
                    toolName: booking.tool.name,
                },
            });
        } catch (e) {
            console.error('Error opening chat:', e);
            router.push('/modals/new-message');
        }
    };

    const filteredBookings = useMemo(() => {
        if (activeTab === 'active') {
            return bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
        }
        return bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
    }, [bookings, activeTab]);

    const renderBookingCard = ({ item }: { item: BookingWithTool }) => {
        const isHistory = ['completed', 'cancelled'].includes(item.status);
        const isActive = ['accepted', 'en_route', 'delivered', 'active'].includes(item.status);

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    item.status === 'pending' && styles.cardPending,
                    isActive && styles.cardActive,
                    item.status === 'completed' && styles.cardCompleted,
                    item.status === 'cancelled' && styles.cardCancelled,
                ]}
                onPress={() => {
                    const isActive = ['pending', 'accepted', 'en_route', 'delivered', 'active'].includes(item.status);
                    if (isActive) {
                        router.push({
                            pathname: '/modals/borrower-tracking',
                            params: { bookingId: item.id }
                        });
                    } else if (item.tool?.id) {
                        router.push({
                            pathname: '/(borrower)/tool/[toolId]',
                            params: { toolId: item.tool.id }
                        });
                    }
                }}
            >
                <View style={styles.cardHeader}>
                    <Image
                        source={{ uri: item.tool?.photoUrls?.[0] || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop' }}
                        style={styles.toolThumb}
                        contentFit="cover"
                        transition={200}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.toolName}>{item.tool?.name || 'Tool'}</Text>
                        <Text style={styles.lenderText}>from {item.lenderName || 'Lender'}</Text>
                    </View>
                    {!['completed', 'cancelled'].includes(item.status) && (
                        <TouchableOpacity
                            style={styles.cardMsgBtn}
                            onPress={(e) => { e.stopPropagation(); handleMessage(item); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.accent.primary} />
                        </TouchableOpacity>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                {renderStatusContent(item)}
            </TouchableOpacity>
        );
    };

    const renderStatusContent = (booking: BookingWithTool) => {
        switch (booking.status) {
            case 'pending':
                return (
                    <View style={styles.statusDetail}>
                        <Text style={styles.waitText}>Waiting for {booking.lenderName?.split(' ')[0]} to respond...</Text>
                        <View style={styles.pulsingRow}>
                            <View style={styles.dot} />
                            <View style={[styles.dot, { opacity: 0.6 }]} />
                            <View style={[styles.dot, { opacity: 0.3 }]} />
                        </View>
                        <View style={styles.actionRow}>
                            <Text style={styles.timestamp}>Requested {timeAgo(booking.createdAt)}</Text>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => handleCancel(booking.id)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'accepted':
            case 'en_route':
                return (
                    <View style={styles.statusDetail}>
                        <View style={styles.progressRow}>
                            <View style={[styles.step, styles.stepCompleted]} />
                            <View style={styles.connector} />
                            <View style={[styles.step, booking.status === 'en_route' && styles.stepActive]} />
                            <View style={styles.connector} />
                            <View style={styles.step} />
                            <View style={styles.connector} />
                            <View style={styles.step} />
                        </View>
                        <View style={styles.actionRow}>
                            <Text style={styles.statusMessage}>
                                {booking.status === 'accepted' ? 'Lender is preparing your tool' : 'Lender is on the way!'}
                            </Text>
                            <TouchableOpacity
                                style={styles.trackBtn}
                                onPress={() => router.push({
                                    pathname: '/modals/borrower-tracking',
                                    params: { bookingId: booking.id }
                                })}
                            >
                                <Ionicons name="navigate-outline" size={16} color="#FFF" />
                                <Text style={styles.trackBtnText}>Track</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'delivered':
                return (
                    <View style={styles.statusDetail}>
                        <View style={styles.noticeBox}>
                            <Ionicons name="alert-circle" size={20} color={COLORS.accent.primary} />
                            <Text style={styles.noticeText}>Lender has arrived! Confirm handover to start.</Text>
                        </View>
                        <TouchableOpacity style={styles.primaryActionBtn} onPress={() => Alert.alert('Handover Confirmed', 'Your rental is now active. Enjoy your tool!')}>
                            <Text style={styles.primaryActionText}>Confirm Handover</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'active':
                return (
                    <View style={styles.statusDetail}>
                        <View style={styles.usageRow}>
                            <View>
                                <Text style={styles.usageLabel}>Time Remaining</Text>
                                <Text style={styles.usageValue}>2h 15m</Text>
                            </View>
                            <TouchableOpacity style={styles.returnBtn} onPress={() => Alert.alert('Return Initiated', 'The lender has been notified. Please prepare the tool for pickup.')}>
                                <Text style={styles.returnBtnText}>Initiate Return</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'completed':
                return (
                    <View style={styles.statusDetail}>
                        <View style={styles.completedRow}>
                            <View style={styles.historyStat}>
                                <Text style={styles.historyLabel}>Duration</Text>
                                <Text style={styles.historyValue}>{booking.durationHours} hrs</Text>
                            </View>
                            <View style={styles.historyStat}>
                                <Text style={styles.historyLabel}>Total Paid</Text>
                                <Text style={styles.historyValue}>${((booking.totalCharged ?? 0) / 100).toFixed(2)}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.reviewBtn}
                                onPress={() => router.push({
                                    pathname: '/modals/review',
                                    params: {
                                        bookingId: booking.id,
                                        toolName: booking.tool?.name || 'Tool'
                                    }
                                })}
                            >
                                <Text style={styles.reviewBtnText}>Review</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Rentals</Text>
                <View style={styles.tabBar}>
                    {(['active', 'history'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab === 'active' ? 'Active' : 'Past'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {filteredBookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="construct-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>Nothing here yet</Text>
                    <Text style={styles.emptySub}>When you request tools, they'll show up here for you to track and manage.</Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(borrower)/discover')}>
                        <Text style={styles.browseBtnText}>Browse Tools</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    renderItem={renderBookingCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const getStatusColor = (status: BookingStatus) => {
    switch (status) {
        case 'pending': return '#D98634';
        case 'accepted':
        case 'en_route':
        case 'delivered': return '#C4622A';
        case 'active': return '#5A7A4A';
        case 'completed': return '#9A8070';
        case 'cancelled': return '#B84040';
        default: return '#9A8070';
    }
};

const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'seconds ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 20,
    },
    title: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: COLORS.text.primary,
        marginBottom: 20,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#9A8070',
    },
    activeTabText: {
        color: COLORS.text.primary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F5F0E8',
    },
    cardPending: {
        borderColor: '#FACB9B',
        backgroundColor: '#FFF9F2',
    },
    cardActive: {
        borderColor: '#C4622A',
        borderWidth: 1.5,
    },
    cardCompleted: {
        opacity: 0.8,
    },
    cardCancelled: {
        opacity: 0.6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    toolThumb: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    toolName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    lenderText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
        marginTop: 2,
    },
    cardMsgBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF5ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 10,
        color: '#FFFFFF',
    },
    statusDetail: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    waitText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#D98634',
        marginBottom: 8,
    },
    pulsingRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FACB9B',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timestamp: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    cancelBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    cancelBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: '#B84040',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    step: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EDE4D4',
    },
    stepActive: {
        backgroundColor: '#C4622A',
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    stepCompleted: {
        backgroundColor: '#C4622A',
    },
    connector: {
        flex: 1,
        height: 2,
        backgroundColor: '#EDE4D4',
        marginHorizontal: 4,
    },
    statusMessage: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
        flex: 1,
    },
    trackBtn: {
        backgroundColor: COLORS.accent.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    trackBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: '#FFFFFF',
    },
    noticeBox: {
        flexDirection: 'row',
        backgroundColor: '#F5F0E8',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    noticeText: {
        flex: 1,
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: COLORS.text.primary,
    },
    primaryActionBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryActionText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: '#FFFFFF',
    },
    usageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    usageLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    usageValue: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: '#5A7A4A',
    },
    returnBtn: {
        borderWidth: 1,
        borderColor: COLORS.accent.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    returnBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.accent.primary,
    },
    completedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyStat: {
        gap: 2,
    },
    historyLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 11,
        color: '#9A8070',
    },
    historyValue: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 14,
        color: COLORS.text.primary,
    },
    reviewBtn: {
        backgroundColor: '#F5F0E8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    reviewBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: COLORS.text.primary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 24,
        color: COLORS.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: '#9A8070',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    browseBtn: {
        backgroundColor: COLORS.accent.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
    },
    browseBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
