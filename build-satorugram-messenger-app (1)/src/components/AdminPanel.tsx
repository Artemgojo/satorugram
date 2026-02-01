import { useState, useEffect } from 'react';
import { User } from '../types';
import { storage, subscribeToUpdates } from '../storage';

interface AdminPanelProps {
  currentUser: User;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [dmCount, setDmCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  const loadStats = () => {
    const allUsers = storage.getUsers();
    setUsers(allUsers.sort((a, b) => b.createdAt - a.createdAt));
    setOnlineCount(storage.getOnlineCount());
    
    const posts = storage.getPosts();
    setPostsCount(posts.length);
    setTotalLikes(posts.reduce((acc, post) => acc + post.likes.length, 0));
    
    setMessagesCount(storage.getMessages().length);
    setDmCount(storage.getDirectMessages().length);
  };

  useEffect(() => {
    loadStats();
    
    const unsubscribe = subscribeToUpdates(() => {
      loadStats();
    });

    const interval = setInterval(loadStats, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAvatar = (avatar: string, avatarType?: 'emoji' | 'url' | 'base64') => {
    if (avatarType === 'emoji' || !avatarType) {
      return <span className="text-sm">{avatar}</span>;
    }
    return (
      <img
        src={avatar}
        alt=""
        className="w-full h-full object-cover rounded-full"
      />
    );
  };

  // Проверка что текущий пользователь - админ
  if (currentUser.nickname !== 'Сатору') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white/40">
          <div className="text-4xl mb-2">🚫</div>
          <p>Доступ запрещён</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">👑 Панель администратора</h2>
          <p className="text-white/40 text-sm">Добро пожаловать, Сатору!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-purple-400">{users.length}</div>
            <div className="text-white/60 text-sm">Пользователей</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-green-400">{onlineCount}</div>
            <div className="text-white/60 text-sm">Онлайн</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-blue-400">{postsCount}</div>
            <div className="text-white/60 text-sm">Постов</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-yellow-400">{messagesCount}</div>
            <div className="text-white/60 text-sm">Сообщений в чате</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-cyan-400">{dmCount}</div>
            <div className="text-white/60 text-sm">Личных сообщений</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-3xl font-bold text-pink-400">{totalLikes}</div>
            <div className="text-white/60 text-sm">Лайков</div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">👥 Все пользователи ({users.length})</h3>
          </div>
          <div className="divide-y divide-white/10 max-h-80 overflow-y-auto">
            {users.length === 0 ? (
              <div className="p-4 text-center text-white/40">
                Пока нет зарегистрированных пользователей
              </div>
            ) : (
              users.map((user, index) => (
                <div key={user.id} className="p-3 flex items-center gap-3 hover:bg-white/5">
                  <div className="text-white/40 text-sm w-6">#{index + 1}</div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden relative">
                    {renderAvatar(user.avatar, user.avatarType)}
                    {storage.isUserOnline(user.id) && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-purple-900"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{user.nickname}</p>
                      {user.nickname === 'Сатору' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">👑</span>
                      )}
                      {storage.isUserOnline(user.id) && (
                        <span className="text-xs text-green-400">● онлайн</span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-xs">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">📊 Последние посты</h3>
          </div>
          <div className="divide-y divide-white/10 max-h-60 overflow-y-auto">
            {storage.getPosts().slice(0, 10).map((post) => (
              <div key={post.id} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">{post.authorNickname}</span>
                  <span className="text-white/30 text-xs">{formatDate(post.timestamp)}</span>
                </div>
                <p className="text-white/60 text-sm truncate">{post.text || '(картинка)'}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-pink-400 text-xs">❤️ {post.likes.length}</span>
                </div>
              </div>
            ))}
            {storage.getPosts().length === 0 && (
              <div className="p-4 text-center text-white/40">
                Пока нет постов
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
