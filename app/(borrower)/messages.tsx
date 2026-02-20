import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';

interface Thread {
    id: string;
    participants: string[];
    toolId: string;
    bookingId: string;
    lastMessage: string;
    lastMessageAt: any;
    otherParticipantName?: string;
    otherParticipantAvatar?: string;
    toolName?: string;
    toolCategory?: string;
}

export default function MessagesScreen() {
    const { user } = useAuthStore();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const threadsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Thread));

            const enrichedThreads = await Promise.all(threadsData.map(async (t) => {
                try {
                    const otherUid = t.participants.find(p => p !== user.uid);
                    const [otherDoc, toolDoc] = await Promise.all([
                        otherUid ? getDoc(doc(db, 'users', otherUid)) : null,
                        getDoc(doc(db, 'tools', t.toolId))
                    ]);
                    return {
                        ...t,
                        otherParticipantName: otherDoc?.data()?.displayName || 'User',
                        otherParticipantAvatar: otherDoc?.data()?.avatarUrl,
                        toolName: toolDoc?.data()?.name || 'Tool',
                        toolCategory: toolDoc?.data()?.category || '',
                    };
                } catch {
                    return t;
                }
            }));

            enrichedThreads.sort((a, b) => {
                const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
                const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });

            setThreads(enrichedThreads);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching messages:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredThreads = search
        ? threads.filter(t =>
            t.otherParticipantName?.toLowerCase().includes(search.toLowerCase()) ||
            t.toolName?.toLowerCase().includes(search.toLowerCase())
        )
        : threads;

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

    const renderThreadItem = ({ item }: { item: Thread }) => {
        // Mocking unread status for Marcus G. as shown in figma
        const isUnread = item.otherParticipantName === 'Marcus G.';

        return (
            <TouchableOpacity style={styles.threadCard} activeOpacity={0.8}>
                <View style={styles.avatarWrapper}>
                    <Image
                        source={{ uri: item.otherParticipantAvatar || 'https://i.pravatar.cc/150' }}
                        style={styles.avatar}
                    />
                    {isUnread && (
                        <View style={styles.unreadCountBadge}>
                            <Text style={styles.unreadCountText}>1</Text>
                        </View>
                    )}
                </View>
                <View style={styles.threadInfo}>
                    <View style={styles.threadHeader}>
                        <Text style={styles.nameText}>{item.otherParticipantName}</Text>
                        <Text style={styles.timeText}>{timeAgo(item.lastMessageAt)}</Text>
                    </View>
                    <Text style={styles.toolTagText}>{item.toolName?.toUpperCase()}</Text>
                    <Text style={styles.previewText} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <TouchableOpacity style={styles.writeIcon}>
                    <Ionicons name="create-outline" size={24} color="#6B4226" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#BC9F77" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search conversations..."
                    placeholderTextColor="#BC9F77"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#BC9F77" />
                </View>
            ) : threads.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptySub}>When you reach out to lenders, your conversations will show up here.</Text>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F6F2',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        marginBottom: 20,
    },
    title: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: '#1C1410',
    },
    writeIcon: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 24,
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        marginBottom: 24,
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
        color: '#1C1410',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    threadCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F5F0E8',
    },
    unreadCountBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#C4622A',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadCountText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'DMSans-Bold',
    },
    threadInfo: {
        flex: 1,
        marginLeft: 16,
    },
    threadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 17,
        color: '#1C1410',
    },
    timeText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    toolTagText: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 10,
        color: '#C4622A',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    previewText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
        marginTop: 4,
    },
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
        color: '#1C1410',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: '#9A8070',
        textAlign: 'center',
    },
});
