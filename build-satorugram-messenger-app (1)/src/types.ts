export interface User {
  id: string;
  nickname: string;
  email: string;
  password: string;
  avatar: string;
  avatarType: 'emoji' | 'url' | 'base64';
  createdAt: number;
  lastOnline: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatar: string;
  senderAvatarType?: 'emoji' | 'url' | 'base64';
  text: string;
  timestamp: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderNickname: string;
  senderAvatar: string;
  senderAvatarType?: 'emoji' | 'url' | 'base64';
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarType?: 'emoji' | 'url' | 'base64';
  text: string;
  imageUrl?: string;
  timestamp: number;
  likes: string[];
}
