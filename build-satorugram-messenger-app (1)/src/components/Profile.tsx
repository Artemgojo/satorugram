import { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { storage } from '../storage';

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

const EMOJI_AVATARS = ['😀', '😎', '🥳', '😇', '🤩', '😺', '🐶', '🦊', '🦁', '🐸', '🐼', '🐨', '🦄', '🐉', '🌟', '⭐'];

export default function Profile({ currentUser, onUpdateUser, onLogout }: ProfileProps) {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatar, setNewAvatar] = useState(currentUser.avatar);
  const [newAvatarType, setNewAvatarType] = useState(currentUser.avatarType);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    const posts = storage.getPosts().filter(p => p.authorId === currentUser.id);
    setUserPosts(posts);
    setTotalLikes(posts.reduce((acc, post) => acc + post.likes.length, 0));
  }, [currentUser.id]);

  const handleSaveAvatar = () => {
    const updatedUser: User = {
      ...currentUser,
      avatar: newAvatar,
      avatarType: newAvatarType
    };
    storage.updateUser(updatedUser);
    onUpdateUser(updatedUser);
    setIsEditingAvatar(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert('Файл слишком большой (макс. 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setNewAvatar(base64);
      setNewAvatarType('base64');
    };
    reader.readAsDataURL(file);
  };

  const handleSetAvatarUrl = () => {
    if (avatarUrl.trim()) {
      setNewAvatar(avatarUrl.trim());
      setNewAvatarType('url');
    }
  };

  const renderAvatar = (avatar: string, avatarType: 'emoji' | 'url' | 'base64', size: 'small' | 'large' = 'large') => {
    const sizeClass = size === 'large' ? 'text-5xl' : 'text-2xl';
    if (avatarType === 'emoji') {
      return <span className={sizeClass}>{avatar}</span>;
    }
    return (
      <img
        src={avatar}
        alt="Avatar"
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23666" width="64" height="64"/><text x="32" y="40" text-anchor="middle" fill="white" font-size="24">?</text></svg>';
        }}
      />
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-purple-400 mx-auto">
              {renderAvatar(currentUser.avatar, currentUser.avatarType)}
            </div>
            <button
              onClick={() => {
                setIsEditingAvatar(true);
                setNewAvatar(currentUser.avatar);
                setNewAvatarType(currentUser.avatarType);
              }}
              className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white hover:bg-purple-600 transition"
            >
              ✏️
            </button>
          </div>

          {/* Name */}
          <h2 className="text-2xl font-bold text-white mb-1">{currentUser.nickname}</h2>
          <p className="text-white/50 text-sm mb-4">{currentUser.email}</p>
          <p className="text-white/40 text-xs">Регистрация: {formatDate(currentUser.createdAt)}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-purple-400">{userPosts.length}</div>
            <div className="text-white/60 text-sm">Постов</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-pink-400">{totalLikes}</div>
            <div className="text-white/60 text-sm">Лайков</div>
          </div>
        </div>

        {/* My Posts */}
        {userPosts.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">📝 Мои посты</h3>
            </div>
            <div className="divide-y divide-white/10 max-h-60 overflow-y-auto">
              {userPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="p-3">
                  <p className="text-white/80 text-sm line-clamp-2">{post.text || '(картинка)'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-pink-400 text-xs">❤️ {post.likes.length}</span>
                    <span className="text-white/30 text-xs">{formatDate(post.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition border border-red-500/30"
        >
          🚪 Выйти из аккаунта
        </button>
      </div>

      {/* Avatar Edit Modal */}
      {isEditingAvatar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Изменить аватар</h3>

            {/* Preview */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-purple-400">
                {renderAvatar(newAvatar, newAvatarType)}
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="bg-white/5 rounded-xl p-3 mb-3">
              <p className="text-white/60 text-xs mb-2">Эмодзи:</p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewAvatar(emoji);
                      setNewAvatarType('emoji');
                    }}
                    className={`text-2xl p-1 rounded-lg transition ${
                      newAvatar === emoji && newAvatarType === 'emoji'
                        ? 'bg-purple-500 scale-110'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div className="bg-white/5 rounded-xl p-3 mb-3">
              <p className="text-white/60 text-xs mb-2">URL картинки:</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-white/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetAvatarUrl}
                  className="px-3 py-2 bg-purple-500 rounded-lg text-white text-sm hover:bg-purple-600"
                >
                  ОК
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-white/60 text-xs mb-2">Загрузить из галереи (до 500KB):</p>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/80 text-sm text-center cursor-pointer hover:bg-white/20 transition">
                  📁 Выбрать файл
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingAvatar(false)}
                className="flex-1 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveAvatar}
                className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
