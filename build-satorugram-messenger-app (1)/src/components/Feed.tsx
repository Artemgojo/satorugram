import { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { storage, subscribeToUpdates } from '../storage';

interface FeedProps {
  currentUser: User;
}

export default function Feed({ currentUser }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);

  const loadPosts = () => {
    const allPosts = storage.getPosts();
    setPosts(allPosts);
  };

  useEffect(() => {
    loadPosts();
    
    const unsubscribe = subscribeToUpdates((type) => {
      if (type === 'posts') {
        loadPosts();
      }
    });

    const interval = setInterval(loadPosts, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleCreatePost = () => {
    if (!newPostText.trim() && !newPostImage.trim()) return;

    const post: Post = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      authorNickname: currentUser.nickname,
      authorAvatar: currentUser.avatar,
      authorAvatarType: currentUser.avatarType,
      text: newPostText.trim(),
      imageUrl: newPostImage.trim() || undefined,
      timestamp: Date.now(),
      likes: []
    };

    storage.addPost(post);
    setNewPostText('');
    setNewPostImage('');
    setShowNewPost(false);
    loadPosts();
  };

  const handleLike = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes.includes(currentUser.id);
    const newLikes = hasLiked
      ? post.likes.filter(id => id !== currentUser.id)
      : [...post.likes, currentUser.id];

    storage.updatePost(postId, { likes: newLikes });
    loadPosts();
  };

  const handleDelete = (postId: string) => {
    if (confirm('Удалить этот пост?')) {
      storage.deletePost(postId);
      loadPosts();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU');
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* New Post Button */}
      <div className="p-4 border-b border-white/10">
        {!showNewPost ? (
          <button
            onClick={() => setShowNewPost(true)}
            className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-white/60 hover:bg-white/20 transition"
          >
            ✏️ Написать пост...
          </button>
        ) : (
          <div className="bg-white/10 rounded-xl p-4 space-y-3">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Что нового?"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              rows={3}
            />
            <input
              type="url"
              value={newPostImage}
              onChange={(e) => setNewPostImage(e.target.value)}
              placeholder="URL картинки (необязательно)"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none text-sm"
            />
            {newPostImage && (
              <div className="relative">
                <img
                  src={newPostImage}
                  alt="Preview"
                  className="max-h-40 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreatePost}
                disabled={!newPostText.trim() && !newPostImage.trim()}
                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                Опубликовать
              </button>
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setNewPostText('');
                  setNewPostImage('');
                }}
                className="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {posts.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-4xl mb-2">📭</div>
            <p>Пока нет постов</p>
            <p className="text-sm">Будьте первым!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {renderAvatar(post.authorAvatar, post.authorAvatarType)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{post.authorNickname}</p>
                  <p className="text-white/40 text-xs">{formatTime(post.timestamp)}</p>
                </div>
                {post.authorId === currentUser.id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-white/40 hover:text-red-400 p-1"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Post Content */}
              {post.text && (
                <p className="text-white mb-3 whitespace-pre-wrap">{post.text}</p>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full max-h-96 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full transition ${
                    post.likes.includes(currentUser.id)
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {post.likes.includes(currentUser.id) ? '❤️' : '🤍'}
                  <span className="text-sm">{post.likes.length}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
