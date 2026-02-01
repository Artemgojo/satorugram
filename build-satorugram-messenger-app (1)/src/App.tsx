import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import Feed from './components/Feed';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import DirectMessages from './components/DirectMessages';
import { User } from './types';
import { storage } from './storage';

const APP_VERSION = 'v1.0.0';

type Tab = 'feed' | 'chat' | 'dm' | 'profile' | 'admin';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [unreadDM, setUnreadDM] = useState(0);

  // Восстановление сессии при загрузке
  useEffect(() => {
    const restoreSession = () => {
      try {
        const savedUser = localStorage.getItem('satorugram_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser) as User;
          // Проверяем что пользователь всё ещё существует в базе
          const users = storage.getUsers();
          const existingUser = users.find(u => u.id === user.id);
          if (existingUser) {
            setCurrentUser(existingUser);
            storage.updateOnlineStatus(existingUser.id);
          } else {
            localStorage.removeItem('satorugram_current_user');
            localStorage.removeItem('satorugram_session');
          }
        }
      } catch {
        localStorage.removeItem('satorugram_current_user');
        localStorage.removeItem('satorugram_session');
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  // Update online status and unread count
  useEffect(() => {
    if (!currentUser) return;

    const updateStatus = () => {
      storage.updateOnlineStatus(currentUser.id);
      setUnreadDM(storage.getUnreadCount(currentUser.id));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        updateStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('satorugram_current_user', JSON.stringify(user));
    storage.updateOnlineStatus(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('satorugram_current_user');
    localStorage.removeItem('satorugram_session');
    setCurrentUser(null);
    setActiveTab('feed');
  };

  const handleUpdateUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('satorugram_current_user', JSON.stringify(user));
  };

  const isAdmin = currentUser?.nickname === 'Сатору';

  const renderAvatar = (avatar: string, avatarType?: 'emoji' | 'url' | 'base64') => {
    if (avatarType === 'emoji' || !avatarType) {
      return avatar;
    }
    return (
      <img
        src={avatar}
        alt=""
        className="w-full h-full object-cover rounded-full"
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌸</div>
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Satorugram
          </h1>
          <span className="text-xs text-white/40">{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm hidden sm:block">{currentUser.nickname}</span>
          {isAdmin && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full hidden sm:block">
              👑
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {renderAvatar(currentUser.avatar, currentUser.avatarType)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'feed' && <Feed currentUser={currentUser} />}
        {activeTab === 'chat' && <Chat currentUser={currentUser} />}
        {activeTab === 'dm' && <DirectMessages currentUser={currentUser} />}
        {activeTab === 'profile' && (
          <Profile
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
          />
        )}
        {activeTab === 'admin' && isAdmin && <AdminPanel currentUser={currentUser} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-black/20 backdrop-blur-lg border-t border-white/10 px-2 py-2">
        <div className="flex justify-around max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'feed'
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-xl">📰</span>
            <span className="text-xs">Лента</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-xl">💬</span>
            <span className="text-xs">Чат</span>
          </button>

          <button
            onClick={() => setActiveTab('dm')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative ${
              activeTab === 'dm'
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-xl">✉️</span>
            <span className="text-xs">ЛС</span>
            {unreadDM > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">{unreadDM > 9 ? '9+' : unreadDM}</span>
              </div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-xl">👤</span>
            <span className="text-xs">Профиль</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'admin'
                  ? 'text-yellow-400 bg-yellow-500/20'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <span className="text-xl">👑</span>
              <span className="text-xs">Админ</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
