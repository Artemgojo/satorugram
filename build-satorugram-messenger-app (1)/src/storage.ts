import { User, Message, Post, DirectMessage } from './types';

const USERS_KEY = 'satorugram_users';
const MESSAGES_KEY = 'satorugram_messages';
const POSTS_KEY = 'satorugram_posts';
const ONLINE_KEY = 'satorugram_online';
const DM_KEY = 'satorugram_dm';

// Online status management
export function updateOnlineStatus(userId: string): void {
  const online = getOnlineUsers();
  online[userId] = Date.now();
  localStorage.setItem(ONLINE_KEY, JSON.stringify(online));
  broadcastUpdate('online');
}

export function getOnlineUsers(): Record<string, number> {
  try {
    const data = localStorage.getItem(ONLINE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getOnlineCount(): number {
  const online = getOnlineUsers();
  const now = Date.now();
  const ONLINE_THRESHOLD = 30000;
  return Object.values(online).filter(time => now - time < ONLINE_THRESHOLD).length;
}

export function isUserOnline(userId: string): boolean {
  const online = getOnlineUsers();
  const lastSeen = online[userId];
  if (!lastSeen) return false;
  return Date.now() - lastSeen < 30000;
}

// Users
export function getUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveUser(user: User): void {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  broadcastUpdate('users');
}

export function getUserById(id: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.id === id);
}

export function checkNicknameExists(nickname: string): boolean {
  const users = getUsers();
  return users.some(user => user.nickname.toLowerCase() === nickname.toLowerCase().trim());
}

export function getUserByNickname(nickname: string): User | undefined {
  const users = getUsers();
  return users.find(user => user.nickname.toLowerCase() === nickname.toLowerCase().trim());
}

export function searchUsers(query: string): User[] {
  const users = getUsers();
  const lowerQuery = query.toLowerCase().trim();
  return users.filter(user => 
    user.nickname.toLowerCase().includes(lowerQuery)
  );
}

// Messages (общий чат)
export function getMessages(): Message[] {
  try {
    const data = localStorage.getItem(MESSAGES_KEY);
    const messages = data ? JSON.parse(data) : [];
    return messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export function addMessage(message: Message): void {
  const messages = getMessages();
  messages.push(message);
  const trimmed = messages.slice(-500);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  broadcastUpdate('messages');
}

// Direct Messages (личные сообщения)
export function getDirectMessages(): DirectMessage[] {
  try {
    const data = localStorage.getItem(DM_KEY);
    const messages = data ? JSON.parse(data) : [];
    return messages.sort((a: DirectMessage, b: DirectMessage) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export function addDirectMessage(message: DirectMessage): void {
  const messages = getDirectMessages();
  messages.push(message);
  localStorage.setItem(DM_KEY, JSON.stringify(messages));
  broadcastUpdate('dm');
}

export function getConversation(userId1: string, userId2: string): DirectMessage[] {
  const messages = getDirectMessages();
  return messages.filter(m => 
    (m.senderId === userId1 && m.receiverId === userId2) ||
    (m.senderId === userId2 && m.receiverId === userId1)
  );
}

export function getUserConversations(userId: string): { partnerId: string; lastMessage: DirectMessage; unreadCount: number }[] {
  const messages = getDirectMessages();
  const partners = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();
  
  messages.forEach(msg => {
    let partnerId: string;
    if (msg.senderId === userId) {
      partnerId = msg.receiverId;
    } else if (msg.receiverId === userId) {
      partnerId = msg.senderId;
    } else {
      return;
    }
    
    const existing = partners.get(partnerId);
    const unread = msg.receiverId === userId && !msg.read ? 1 : 0;
    
    if (!existing || msg.timestamp > existing.lastMessage.timestamp) {
      partners.set(partnerId, {
        lastMessage: msg,
        unreadCount: (existing?.unreadCount || 0) + unread
      });
    } else {
      existing.unreadCount += unread;
    }
  });
  
  return Array.from(partners.entries())
    .map(([partnerId, data]) => ({ partnerId, ...data }))
    .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
}

export function markConversationAsRead(userId: string, partnerId: string): void {
  const messages = getDirectMessages();
  const updated = messages.map(m => {
    if (m.senderId === partnerId && m.receiverId === userId && !m.read) {
      return { ...m, read: true };
    }
    return m;
  });
  localStorage.setItem(DM_KEY, JSON.stringify(updated));
  broadcastUpdate('dm');
}

export function getUnreadCount(userId: string): number {
  const messages = getDirectMessages();
  return messages.filter(m => m.receiverId === userId && !m.read).length;
}

// Posts
export function getPosts(): Post[] {
  try {
    const data = localStorage.getItem(POSTS_KEY);
    const posts = data ? JSON.parse(data) : [];
    return posts.sort((a: Post, b: Post) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function addPost(post: Post): void {
  const posts = getPosts();
  posts.unshift(post);
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  broadcastUpdate('posts');
}

export function updatePost(postId: string, updates: Partial<Post>): void {
  const posts = getPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index >= 0) {
    posts[index] = { ...posts[index], ...updates };
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    broadcastUpdate('posts');
  }
}

export function deletePost(postId: string): void {
  const posts = getPosts();
  const filtered = posts.filter(p => p.id !== postId);
  localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
  broadcastUpdate('posts');
}

export function updateUser(user: User): void {
  saveUser(user);
}

// BroadcastChannel for cross-tab sync
let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel('satorugram_sync');
} catch {
  // BroadcastChannel not supported
}

function broadcastUpdate(type: 'users' | 'messages' | 'posts' | 'online' | 'dm'): void {
  if (channel) {
    channel.postMessage({ type, timestamp: Date.now() });
  }
  window.dispatchEvent(new CustomEvent('satorugram_update', { detail: { type } }));
}

export function subscribeToUpdates(callback: (type: string) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    callback(event.data.type);
  };
  
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail.type);
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('satorugram_update', handleCustomEvent);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('satorugram_update', handleCustomEvent);
  };
}

// Storage object for convenient access
export const storage = {
  getUsers,
  saveUser,
  updateUser,
  getUserById,
  checkNicknameExists,
  getUserByNickname,
  searchUsers,
  getMessages,
  addMessage,
  getDirectMessages,
  addDirectMessage,
  getConversation,
  getUserConversations,
  markConversationAsRead,
  getUnreadCount,
  getPosts,
  addPost,
  updatePost,
  deletePost,
  updateOnlineStatus,
  getOnlineUsers,
  getOnlineCount,
  isUserOnline,
  subscribeToUpdates
};
