export interface Message {
    id: string;
    senderId: string; // Anonymous ID (e.g., User A, User B, or simple random string)
    senderName: string;
    content: string;
    image?: string; // Base64 encoded image
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
    adminKey?: string; // Secret key for deletion (server-only ideally, but stored in object for simplicity)
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
    image?: string;
};
