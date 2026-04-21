import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs,
    getDoc,
    arrayRemove,
    arrayUnion,
    limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Thread, Message, EnrichedThread } from '@/types/message.types';
import { UserProfile } from '@/types/user.types';
import { Tool } from '@/types/tool.types';

export const getOrCreateThread = async (params: {
    otherUserId: string;
    toolId: string;
    bookingId: string;
}): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');

    const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid),
        where('toolId', '==', params.toolId),
        where('bookingId', '==', params.bookingId),
        limit(1)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
        return snap.docs[0].id;
    }

    const threadRef = await addDoc(collection(db, 'messages'), {
        participants: [user.uid, params.otherUserId],
        toolId: params.toolId,
        bookingId: params.bookingId,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadBy: [],
    });

    return threadRef.id;
};

export const createThreadForBooking = async (params: {
    bookingId: string;
    borrowerId: string;
    lenderId: string;
    toolId: string;
    toolName: string;
}): Promise<string> => {
    const q = query(
        collection(db, 'messages'),
        where('bookingId', '==', params.bookingId),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const threadRef = await addDoc(collection(db, 'messages'), {
        participants: [params.borrowerId, params.lenderId],
        toolId: params.toolId,
        bookingId: params.bookingId,
        lastMessage: `Booking created for ${params.toolName}`,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadBy: [params.lenderId],
    });

    await addDoc(collection(db, 'messages', threadRef.id, 'chat'), {
        threadId: threadRef.id,
        senderId: 'system',
        text: `Booking created for ${params.toolName}. You can now message each other!`,
        createdAt: serverTimestamp(),
        type: 'system',
    });

    return threadRef.id;
};

export const sendMessage = async (threadId: string, text: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');
    if (!text.trim()) return;

    const threadRef = doc(db, 'messages', threadId);
    const threadSnap = await getDoc(threadRef);
    if (!threadSnap.exists()) throw new Error('Thread not found');

    const thread = threadSnap.data() as Thread;
    const otherUserId = thread.participants.find((p) => p !== user.uid);

    await addDoc(collection(db, 'messages', threadId, 'chat'), {
        threadId,
        senderId: user.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
        type: 'text',
    });

    await updateDoc(threadRef, {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        unreadBy: otherUserId ? arrayUnion(otherUserId) : [],
    });
};

export const markThreadRead = async (threadId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;

    const threadRef = doc(db, 'messages', threadId);
    await updateDoc(threadRef, {
        unreadBy: arrayRemove(user.uid),
    });
};

export const subscribeToMessages = (
    threadId: string,
    callback: (messages: Message[]) => void
) => {
    const q = query(
        collection(db, 'messages', threadId, 'chat'),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Message[];
        callback(msgs);
    });
};

export const subscribeToThreads = (
    userId: string,
    callback: (threads: EnrichedThread[]) => void
) => {
    const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', userId)
    );

    return onSnapshot(q, async (snapshot) => {
        const threadsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Thread[];

        const enriched = await Promise.all(
            threadsData.map(async (t) => {
                try {
                    const otherUid = t.participants.find((p) => p !== userId);
                    const [otherDoc, toolDoc] = await Promise.all([
                        otherUid ? getDoc(doc(db, 'users', otherUid)) : null,
                        getDoc(doc(db, 'tools', t.toolId)),
                    ]);
                    return {
                        ...t,
                        otherParticipantName: otherDoc?.data()?.displayName || 'User',
                        otherParticipantAvatar: otherDoc?.data()?.avatarUrl,
                        toolName: toolDoc?.data()?.name || 'Tool',
                        toolCategory: toolDoc?.data()?.category || '',
                        lenderId: toolDoc?.data()?.lenderId || '',
                    } as EnrichedThread;
                } catch {
                    return {
                        ...t,
                        otherParticipantName: 'User',
                        toolName: 'Tool',
                        toolCategory: '',
                        lenderId: '',
                    } as EnrichedThread;
                }
            })
        );

        enriched.sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
        });

        callback(enriched);
    });
};

export const searchUsers = async (searchText: string): Promise<UserProfile[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    const snap = await getDocs(collection(db, 'users'));
    const all = snap.docs
        .map(d => ({ ...d.data(), uid: d.id } as UserProfile))
        .filter(u => u.uid !== user.uid);

    if (!searchText.trim()) return all.slice(0, 20);

    const lower = searchText.toLowerCase();
    return all
        .filter(u =>
            u.displayName?.toLowerCase().includes(lower) ||
            u.email?.toLowerCase().includes(lower)
        )
        .slice(0, 20);
};

export const getUserTools = async (userId: string): Promise<Tool[]> => {
    const q = query(
        collection(db, 'tools'),
        where('lenderId', '==', userId),
        where('isAvailable', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tool));
};

export const findOrCreateDirectThread = async (params: {
    otherUserId: string;
    toolId: string;
    toolName: string;
    role: 'borrower' | 'lender';
}): Promise<{ threadId: string; isNew: boolean }> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Unauthenticated');

    const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid),
        where('toolId', '==', params.toolId)
    );
    const snap = await getDocs(q);

    const existing = snap.docs.find(d => {
        const data = d.data();
        return data.participants?.includes(params.otherUserId);
    });

    if (existing) {
        return { threadId: existing.id, isNew: false };
    }

    const borrowerId = params.role === 'borrower' ? user.uid : params.otherUserId;
    const lenderId = params.role === 'lender' ? user.uid : params.otherUserId;

    const threadRef = await addDoc(collection(db, 'messages'), {
        participants: [borrowerId, lenderId],
        toolId: params.toolId,
        bookingId: '',
        lastMessage: `New conversation about ${params.toolName}`,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadBy: [params.otherUserId],
    });

    await addDoc(collection(db, 'messages', threadRef.id, 'chat'), {
        threadId: threadRef.id,
        senderId: 'system',
        text: `Conversation started about ${params.toolName}. Say hello!`,
        createdAt: serverTimestamp(),
        type: 'system',
    });

    return { threadId: threadRef.id, isNew: true };
};

export const sendBookingStatusMessage = async (params: {
    bookingId: string;
    borrowerId: string;
    lenderId: string;
    toolId: string;
    toolName: string;
    status: 'accepted' | 'en_route' | 'delivered' | 'active' | 'completed' | 'cancelled';
}): Promise<void> => {
    const STATUS_MESSAGES: Record<string, string> = {
        accepted: `📦 Booking accepted! ${params.toolName} is being prepared for delivery.`,
        en_route: `🚗 ${params.toolName} is on the way! Your lender is heading to you now.`,
        delivered: `📍 ${params.toolName} has been dropped off. Please confirm you've received it.`,
        active: `✅ Rental is now active! Enjoy using ${params.toolName}.`,
        completed: `🎉 Rental complete! ${params.toolName} has been returned. Thanks for using ToolTime!`,
        cancelled: `❌ This booking for ${params.toolName} has been cancelled.`,
    };

    const text = STATUS_MESSAGES[params.status];
    if (!text) return;

    try {
        const q = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', params.borrowerId),
            where('toolId', '==', params.toolId)
        );
        const snap = await getDocs(q);

        let threadId: string | null = null;

        const existingThread = snap.docs.find(d => {
            const data = d.data();
            return data.participants?.includes(params.lenderId);
        });

        if (existingThread) {
            threadId = existingThread.id;
        } else {
            const threadRef = await addDoc(collection(db, 'messages'), {
                participants: [params.borrowerId, params.lenderId],
                toolId: params.toolId,
                bookingId: params.bookingId,
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                unreadBy: [params.borrowerId, params.lenderId],
            });
            threadId = threadRef.id;
        }

        await addDoc(collection(db, 'messages', threadId, 'chat'), {
            threadId,
            senderId: 'system',
            text,
            createdAt: serverTimestamp(),
            type: 'status',
            statusType: params.status,
        });

        const otherUserId = params.status === 'en_route' || params.status === 'delivered'
            ? params.borrowerId
            : params.lenderId;

        await updateDoc(doc(db, 'messages', threadId), {
            lastMessage: text,
            lastMessageAt: serverTimestamp(),
            unreadBy: arrayUnion(otherUserId),
        });
    } catch (err) {
        console.warn('sendBookingStatusMessage failed (non-blocking):', err);
    }
};

export const findThreadForBooking = async (
    bookingId: string,
    otherUserId: string,
): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid),
        where('bookingId', '==', bookingId),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const toolQ = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid)
    );
    const allSnap = await getDocs(toolQ);
    const match = allSnap.docs.find(d => {
        const data = d.data();
        return data.participants?.includes(otherUserId);
    });

    return match?.id || null;
};
