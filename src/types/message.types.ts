import { Timestamp } from 'firebase/firestore';

export interface Thread {
    id: string;
    participants: string[];
    toolId: string;
    bookingId: string;
    lastMessage: string;
    lastMessageAt: Timestamp | null;
    createdAt: Timestamp;
    unreadBy?: string[];
}

export interface EnrichedThread extends Thread {
    otherParticipantName: string;
    otherParticipantAvatar?: string;
    toolName: string;
    toolCategory: string;
    lenderId: string;
}

export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    text: string;
    createdAt: Timestamp;
    type: 'text' | 'system' | 'status';
    statusType?: 'accepted' | 'en_route' | 'delivered' | 'active' | 'completed' | 'cancelled';
}
