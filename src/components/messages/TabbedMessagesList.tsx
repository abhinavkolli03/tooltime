import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import { EnrichedThread } from '@/types/message.types';
import { subscribeToThreads } from '@/services/messageService';

type MessageTab = 'borrowing' | 'lending';

interface Props {
    defaultTab?: MessageTab;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_PADDING = 4;
const TAB_BAR_MARGIN = 24;
const TAB_BAR_INNER = SCREEN_WIDTH - TAB_BAR_MARGIN * 2 - TAB_BAR_PADDING * 2;
const HALF_TAB = TAB_BAR_INNER / 2;

export default function TabbedMessagesList({ defaultTab = 'borrowing' }: Props) {
    const { user } = useAuthStore();
    const [threads, setThreads] = useState<EnrichedThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<MessageTab>(defaultTab);
    const indicatorAnim = useRef(new Animated.Value(defaultTab === 'borrowing' ? 0 : 1)).current;

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToThreads(user.uid, (enrichedThreads) => {
            setThreads(enrichedThreads);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        Animated.spring(indicatorAnim, {
            toValue: activeTab === 'borrowing' ? 0 : 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    const borrowingThreads = useMemo(
        () => threads.filter(t => t.lenderId !== user?.uid),
        [threads, user],
    );

    const lendingThreads = useMemo(
        () => threads.filter(t => t.lenderId === user?.uid),
        [threads, user],
    );

    const activeThreads = activeTab === 'borrowing' ? borrowingThreads : lendingThreads;

    const filteredThreads = search
        ? activeThreads.filter(t =>
            t.otherParticipantName?.toLowerCase().includes(search.toLowerCase()) ||
            t.toolName?.toLowerCase().includes(search.toLowerCase())
        )
        : activeThreads;

    const borrowingUnread = useMemo(
        () => borrowingThreads.filter(t => t.unreadBy?.includes(user?.uid || '')).length,
        [borrowingThreads, user],
    );

    const lendingUnread = useMemo(
        () => lendingThreads.filter(t => t.unreadBy?.includes(user?.uid || '')).length,
        [lendingThreads, user],
    );

    const timeAgo = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const s = Math.floor((Date.now() - d.getTime()) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const openChat = (thread: EnrichedThread) => {
        router.push({
            pathname: '/modals/chat',
            params: {
                threadId: thread.id,
                otherName: thread.otherParticipantName,
                otherAvatar: thread.otherParticipantAvatar || '',
                toolName: thread.toolName,
            },
        });
    };

    const renderThreadItem = ({ item }: { item: EnrichedThread }) => {
        const isUnread = item.unreadBy?.includes(user?.uid || '');
        const isLending = item.lenderId === user?.uid;

        return (
            <TouchableOpacity style={styles.threadCard} activeOpacity={0.8} onPress={() => openChat(item)}>
                <View style={styles.avatarWrapper}>
                    <Image
                        source={{ uri: item.otherParticipantAvatar || 'https://i.pravatar.cc/150' }}
                        style={styles.avatar}
                    />
                    {isUnread && (
                        <View style={styles.unreadBadge}>
                            <View style={styles.unreadDot} />
                        </View>
                    )}
                </View>
                <View style={styles.threadInfo}>
                    <View style={styles.threadHeader}>
                        <Text style={[styles.nameText, isUnread && styles.nameTextUnread]}>
                            {item.otherParticipantName}
                        </Text>
                        <Text style={styles.timeText}>{timeAgo(item.lastMessageAt)}</Text>
                    </View>
                    <View style={styles.toolTagRow}>
                        <Text style={styles.toolTagText}>{item.toolName?.toUpperCase()}</Text>
                        <View style={[styles.roleChip, isLending ? styles.roleChipLending : styles.roleChipBorrowing]}>
                            <Text style={[styles.roleChipText, isLending ? styles.roleChipTextLending : styles.roleChipTextBorrowing]}>
                                {isLending ? 'Lending' : 'Borrowing'}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.previewText, isUnread && styles.previewTextUnread]} numberOfLines={1}>
                        {item.lastMessage || 'No messages yet'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D4B896" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
        );
    };

    const renderTabButton = (tab: MessageTab, label: string, count: number, unread: number) => {
        const isActive = activeTab === tab;
        return (
            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {label}
                </Text>
                <View style={styles.tabMeta}>
                    <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                        {count}
                    </Text>
                    {unread > 0 && (
                        <View style={styles.tabUnreadBadge}>
                            <Text style={styles.tabUnreadText}>{unread}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const emptyMessage = activeTab === 'borrowing'
        ? 'When you rent tools, conversations with lenders will appear here.'
        : 'When borrowers rent your tools, conversations will appear here.';

    return (
        <View style={styles.container}>
            {/* Tabs */}
            <View style={styles.tabBar}>
                <View style={styles.tabRow}>
                    {renderTabButton('borrowing', 'Borrowing', borrowingThreads.length, borrowingUnread)}
                    {renderTabButton('lending', 'Lending', lendingThreads.length, lendingUnread)}
                </View>
                <Animated.View style={[styles.tabIndicator, {
                    width: HALF_TAB,
                    transform: [{
                        translateX: indicatorAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, HALF_TAB],
                        }),
                    }],
                }]} />
            </View>

            {/* Search */}
            {activeThreads.length > 0 && (
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#BC9F77" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor="#BC9F77"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#BC9F77" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.accent.primary} />
                </View>
            ) : activeThreads.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>No conversations</Text>
                    <Text style={styles.emptySub}>{emptyMessage}</Text>
                </View>
            ) : filteredThreads.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>No matches</Text>
                    <Text style={styles.emptySub}>Try a different search term.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredThreads}
                    renderItem={renderThreadItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* New Message FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/modals/new-message')}
                activeOpacity={0.85}
            >
                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // --- Tabs ---
    tabBar: {
        marginHorizontal: 24,
        marginBottom: 16,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#F5F0E8',
        borderRadius: 14,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
        borderRadius: 12,
        zIndex: 1,
    },
    tabLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.muted,
    },
    tabLabelActive: {
        color: COLORS.text.primary,
    },
    tabMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tabCount: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: COLORS.text.muted,
    },
    tabCountActive: {
        color: COLORS.text.secondary,
    },
    tabUnreadBadge: {
        backgroundColor: COLORS.accent.primary,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabUnreadText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        top: TAB_BAR_PADDING,
        left: TAB_BAR_PADDING,
        height: 38,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },

    // --- Search ---
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 24,
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EFEBE7',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
    },

    // --- Thread List ---
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    threadCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F5F0E8',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F5F0E8',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: COLORS.accent.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    threadInfo: {
        flex: 1,
        marginLeft: 14,
    },
    threadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    nameTextUnread: {
        fontFamily: 'DMSans-Medium',
    },
    timeText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    toolTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    toolTagText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: COLORS.accent.primary,
        letterSpacing: 0.5,
    },
    roleChip: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleChipBorrowing: {
        backgroundColor: '#E0EDFF',
    },
    roleChipLending: {
        backgroundColor: '#E8F5E2',
    },
    roleChipText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 8,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    roleChipTextBorrowing: {
        color: COLORS.semantic.info,
    },
    roleChipTextLending: {
        color: COLORS.semantic.success,
    },
    previewText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
        marginTop: 4,
    },
    previewTextUnread: {
        color: COLORS.text.primary,
        fontFamily: 'DMSans-Medium',
    },

    // --- Empty / Loading ---
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginBottom: 100,
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
    },

    // --- FAB ---
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
});
