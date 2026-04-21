import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/theme';
import { Message, Thread } from '@/types/message.types';
import { sendMessage, subscribeToMessages, markThreadRead } from '@/services/messageService';

export default function ChatScreen() {
    const { threadId, otherName, otherAvatar, toolName } = useLocalSearchParams<{
        threadId: string;
        otherName?: string;
        otherAvatar?: string;
        toolName?: string;
    }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [participantName, setParticipantName] = useState(otherName || 'Chat');
    const [participantAvatar, setParticipantAvatar] = useState(otherAvatar || '');
    const [headerToolName, setHeaderToolName] = useState(toolName || '');

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!threadId) return;

        markThreadRead(threadId);

        const fetchThreadMeta = async () => {
            if (otherName && toolName) {
                setIsLoading(false);
                return;
            }
            try {
                const threadSnap = await getDoc(doc(db, 'messages', threadId));
                if (!threadSnap.exists()) return;
                const thread = threadSnap.data() as Thread;

                const otherUid = thread.participants.find((p) => p !== user?.uid);
                if (otherUid) {
                    const userSnap = await getDoc(doc(db, 'users', otherUid));
                    if (userSnap.exists()) {
                        setParticipantName(userSnap.data().displayName || 'User');
                        setParticipantAvatar(userSnap.data().avatarUrl || '');
                    }
                }
                const toolSnap = await getDoc(doc(db, 'tools', thread.toolId));
                if (toolSnap.exists()) {
                    setHeaderToolName(toolSnap.data().name || 'Tool');
                }
            } catch (e) {
                console.error('Error fetching thread meta:', e);
            }
            setIsLoading(false);
        };

        fetchThreadMeta();

        const unsub = subscribeToMessages(threadId, (msgs) => {
            setMessages(msgs);
            setIsLoading(false);
        });

        return () => unsub();
    }, [threadId]);

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || !threadId || isSending) return;

        const text = inputText.trim();
        setInputText('');
        setIsSending(true);

        try {
            await sendMessage(threadId, text);
        } catch (e) {
            console.error('Send error:', e);
            setInputText(text);
        } finally {
            setIsSending(false);
        }
    }, [inputText, threadId, isSending]);

    const scrollToEnd = useCallback(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length]);

    useEffect(() => {
        const timer = setTimeout(scrollToEnd, 150);
        return () => clearTimeout(timer);
    }, [messages.length]);

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSeparator = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const shouldShowDate = (index: number) => {
        if (index === 0) return true;
        const prev = messages[index - 1];
        const curr = messages[index];
        if (!prev.createdAt || !curr.createdAt) return false;
        const prevDate = (prev.createdAt as any).toDate?.() || new Date(prev.createdAt as any);
        const currDate = (curr.createdAt as any).toDate?.() || new Date(curr.createdAt as any);
        return prevDate.toDateString() !== currDate.toDateString();
    };

    const STATUS_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
        accepted:  { icon: 'checkmark-circle', color: '#5A7A4A', bg: '#EBF5E5' },
        en_route:  { icon: 'navigate',         color: '#C4622A', bg: '#FFF3EB' },
        delivered: { icon: 'location',         color: '#2A6CB4', bg: '#EBF3FF' },
        active:    { icon: 'play-circle',      color: '#7C5AC7', bg: '#F3EEFF' },
        completed: { icon: 'trophy',           color: '#5A7A4A', bg: '#EBF5E5' },
        cancelled: { icon: 'close-circle',     color: '#CC3333', bg: '#FFEBEB' },
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.senderId === user?.uid;
        const isSystem = item.type === 'system' || item.type === 'status';
        const isStatus = item.type === 'status' && item.statusType;
        const showDate = shouldShowDate(index);

        return (
            <View>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{formatDateSeparator(item.createdAt)}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                {isStatus ? (
                    <View style={[styles.statusBubble, { backgroundColor: STATUS_ICON_MAP[item.statusType!]?.bg || '#F5F0E8' }]}>
                        <Ionicons
                            name={(STATUS_ICON_MAP[item.statusType!]?.icon || 'information-circle') as any}
                            size={16}
                            color={STATUS_ICON_MAP[item.statusType!]?.color || '#9A8070'}
                        />
                        <Text style={[styles.statusText, { color: STATUS_ICON_MAP[item.statusType!]?.color || '#9A8070' }]}>
                            {item.text}
                        </Text>
                    </View>
                ) : isSystem ? (
                    <View style={styles.systemBubble}>
                        <Ionicons name="information-circle-outline" size={14} color="#9A8070" />
                        <Text style={styles.systemText}>{item.text}</Text>
                    </View>
                ) : (
                    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                        {!isMe && (
                            <Image
                                source={{ uri: participantAvatar || 'https://i.pravatar.cc/150' }}
                                style={styles.msgAvatar}
                            />
                        )}
                        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                                {item.text}
                            </Text>
                            <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Image
                    source={{ uri: participantAvatar || 'https://i.pravatar.cc/150' }}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{participantName}</Text>
                    {headerToolName ? (
                        <Text style={styles.headerTool}>{headerToolName.toUpperCase()}</Text>
                    ) : null}
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={COLORS.accent.primary} />
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#EDE4D4" />
                        <Text style={styles.emptyTitle}>Start the conversation</Text>
                        <Text style={styles.emptySub}>
                            Send a message to coordinate your rental
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={scrollToEnd}
                    />
                )}

                {/* Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            placeholderTextColor="#BC9F77"
                            multiline
                            maxLength={1000}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="send" size={18} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    flex: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0E8',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    headerTool: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: COLORS.accent.primary,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    messageList: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        gap: 12,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F5F0E8',
    },
    dateText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: '#9A8070',
    },
    systemBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#F5F0E8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        marginBottom: 12,
        maxWidth: '85%',
    },
    systemText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
        flexShrink: 1,
    },
    statusBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        marginBottom: 12,
        maxWidth: '90%',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    statusText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        flexShrink: 1,
        lineHeight: 18,
    },
    bubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 8,
        maxWidth: '80%',
    },
    bubbleRowMe: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    msgAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 8,
        backgroundColor: '#F5F0E8',
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        maxWidth: '100%',
    },
    bubbleMe: {
        backgroundColor: COLORS.accent.primary,
        borderBottomRightRadius: 6,
    },
    bubbleOther: {
        backgroundColor: '#F5F0E8',
        borderBottomLeftRadius: 6,
    },
    bubbleText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
        lineHeight: 21,
    },
    bubbleTextMe: {
        color: '#FFFFFF',
    },
    timeText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 10,
        color: '#9A8070',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    timeTextMe: {
        color: 'rgba(255,255,255,0.7)',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 22,
        color: COLORS.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
        textAlign: 'center',
    },
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    textInput: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
        backgroundColor: '#F5F0E8',
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 12,
        maxHeight: 100,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#D4B896',
    },
});
