import { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { storage, subscribeToUpdates } from '../storage';

interface ChatProps {
  currentUser: User;
}

export default function Chat({ currentUser }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const loadMessages = () => {
    const allMessages = storage.getMessages();
    setMessages(allMessages);
  };

  useEffect(() => {
    loadMessages();
    
    const unsubscribe = subscribeToUpdates((type) => {
      if (type === 'messages') {
        loadMessages();
      }
    });

    // Polling for real-time feel
    const interval = setInterval(loadMessages, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderNickname: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      senderAvatarType: currentUser.avatarType,
      text: newMessage.trim(),
      timestamp: Date.now()
    };

    storage.addMessage(message);
    setNewMessage('');
    setAutoScroll(true);
    loadMessages();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
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

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  
  messages.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: formatDate(msg.timestamp), messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="p-3 border-b border-white/10 bg-white/5">
        <h2 className="text-white font-semibold text-center">💬 Общий чат</h2>
        <p className="text-white/40 text-xs text-center">Все пользователи видят эти сообщения</p>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-4xl mb-2">💭</div>
            <p>Начните общение!</p>
            <p className="text-sm">Напишите первое сообщение</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/40 text-xs">{group.date}</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>
              
              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {renderAvatar(msg.senderAvatar, msg.senderAvatarType)}
                      </div>
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        <p className={`text-xs text-white/50 mb-1 ${isOwn ? 'text-right' : ''}`}>
                          {msg.senderNickname}
                        </p>
                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-purple-500 text-white rounded-tr-sm'
                              : 'bg-white/10 text-white rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        <p className={`text-xs text-white/30 mt-1 ${isOwn ? 'text-right' : ''}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
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
