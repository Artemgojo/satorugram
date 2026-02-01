import { useState, useEffect, useRef } from 'react';
import { User, DirectMessage } from '../types';
import { storage, subscribeToUpdates } from '../storage';

interface DirectMessagesProps {
  currentUser: User;
}

export default function DirectMessages({ currentUser }: DirectMessagesProps) {
  const [view, setView] = useState<'list' | 'chat' | 'search'>('list');
  const [conversations, setConversations] = useState<{ partnerId: string; lastMessage: DirectMessage; unreadCount: number }[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    const convs = storage.getUserConversations(currentUser.id);
    setConversations(convs);
  };

  const loadMessages = () => {
    if (selectedPartner) {
      const msgs = storage.getConversation(currentUser.id, selectedPartner.id);
      setMessages(msgs);
      storage.markConversationAsRead(currentUser.id, selectedPartner.id);
    }
  };

  useEffect(() => {
    loadConversations();
    
    const unsubscribe = subscribeToUpdates((type) => {
      if (type === 'dm') {
        loadConversations();
        if (selectedPartner) {
          loadMessages();
        }
      }
    });

    const interval = setInterval(() => {
      loadConversations();
      if (selectedPartner) {
        loadMessages();
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [selectedPartner]);

  useEffect(() => {
    if (view === 'chat' && selectedPartner) {
      loadMessages();
    }
  }, [view, selectedPartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = storage.searchUsers(searchQuery).filter(u => u.id !== currentUser.id);
    setSearchResults(results);
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const openChat = (user: User) => {
    setSelectedPartner(user);
    setView('chat');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartner) return;

    const message: DirectMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      receiverId: selectedPartner.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderAvatarType: currentUser.avatarType,
      text: newMessage.trim(),
      timestamp: Date.now(),
      read: false
    };

    storage.addDirectMessage(message);
    setNewMessage('');
    loadMessages();
    loadConversations();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);

    if (hours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const renderAvatar = (avatar: string, avatarType?: 'emoji' | 'url' | 'base64') => {
    if (avatarType === 'emoji' || !avatarType) {
      return <span className="text-lg">{avatar}</span>;
    }
    return (
      <img
        src={avatar}
        alt=""
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  // Список диалогов
  if (view === 'list') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="text-white font-semibold">✉️ Личные сообщения</h2>
          <button
            onClick={() => setView('search')}
            className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30"
          >
            + Новый чат
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              <div className="text-4xl mb-2">📭</div>
              <p>Нет сообщений</p>
              <button
                onClick={() => setView('search')}
                className="mt-3 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30"
              >
                Найти собеседника
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {conversations.map((conv) => {
                const partner = storage.getUserById(conv.partnerId);
                if (!partner) return null;
                
                return (
                  <button
                    key={conv.partnerId}
                    onClick={() => openChat(partner)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative">
                      {renderAvatar(partner.avatar, partner.avatarType)}
                      {storage.isUserOnline(partner.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-purple-900"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-semibold truncate">{partner.nickname}</p>
                        <span className="text-white/40 text-xs">{formatTime(conv.lastMessage.timestamp)}</span>
                      </div>
                      <p className="text-white/50 text-sm truncate">
                        {conv.lastMessage.senderId === currentUser.id && 'Вы: '}
                        {conv.lastMessage.text}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">{conv.unreadCount}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Поиск пользователей
  if (view === 'search') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="text-white/60 hover:text-white"
          >
            ←
          </button>
          <h2 className="text-white font-semibold">Найти пользователя</h2>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите никнейм..."
            autoFocus
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery && searchResults.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              <p>Пользователь не найден</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => openChat(user)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative">
                    {renderAvatar(user.avatar, user.avatarType)}
                    {storage.isUserOnline(user.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-purple-900"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user.nickname}</p>
                    <p className="text-white/40 text-xs">
                      {storage.isUserOnline(user.id) ? 'В сети' : 'Не в сети'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Чат с пользователем
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-3">
        <button
          onClick={() => {
            setView('list');
            setSelectedPartner(null);
          }}
          className="text-white/60 hover:text-white"
        >
          ←
        </button>
        {selectedPartner && (
          <>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative">
              {renderAvatar(selectedPartner.avatar, selectedPartner.avatarType)}
              {storage.isUserOnline(selectedPartner.id) && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-purple-900"></div>
              )}
            </div>
            <div>
              <p className="text-white font-semibold">{selectedPartner.nickname}</p>
              <p className="text-white/40 text-xs">
                {storage.isUserOnline(selectedPartner.id) ? '🟢 В сети' : '⚫ Не в сети'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-4xl mb-2">👋</div>
            <p>Начните переписку!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-purple-500 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition disabled:opacity-50"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
