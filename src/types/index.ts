export interface Message {
    id: string;
    senderId: string; // Anonymous ID (e.g., User A, User B, or simple random string)
    senderName: string;
    content: string;
    timestamp: number;
}

export interface TypingEvent {
    roomId: string;
    userName: string;
    isTyping: boolean;
}

export interface Room {
    id: string;
    name: string;
    createdAt: number;
    users: string[]; // List of historical joined users
    activeUsers: Set<string>; // Currently connected
    messages: Message[];
}

export type CreateRoomRequest = {
    name: string;
    creatorName: string;
};

export type JoinRoomRequest = {
    userName: string;
};

export type SendMessageRequest = {
    senderId: string;
    senderName: string;
    content: string;
};
