import { useState } from 'react';
import { User } from '../types';
import { storage } from '../storage';

interface AuthProps {
  onLogin: (user: User) => void;
}

const EMOJI_AVATARS = ['😀', '😎', '🥳', '😇', '🤩', '😺', '🐶', '🦊', '🦁', '🐸', '🐼', '🐨', '🦄', '🐉', '🌟', '⭐'];

type Step = 'login' | 'register' | 'verify' | 'setup-profile';

export default function Auth({ onLogin }: AuthProps) {
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('😀');
  const [avatarType, setAvatarType] = useState<'emoji' | 'url' | 'base64'>('emoji');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentCode, setSentCode] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    const users = storage.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      setError('Пользователь с таким email не найден');
      return;
    }

    if (user.password !== password) {
      setError('Неверный пароль');
      return;
    }

    user.lastOnline = Date.now();
    storage.updateUser(user);
    
    // Сохраняем сессию
    localStorage.setItem('satorugram_session', JSON.stringify({
      oderId: user.id,
      email: user.email,
      timestamp: Date.now()
    }));
    localStorage.setItem('satorugram_current_user', JSON.stringify(user));
    
    onLogin(user);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (!validateEmail(email)) {
      setError('Введите корректный email');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    const users = storage.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('Этот email уже зарегистрирован');
      return;
    }

    setLoading(true);
    
    const code = generateCode();
    setSentCode(code);
    
    setTimeout(() => {
      alert(`📧 Код подтверждения для ${email}:\n\n${code}\n\n(В реальном приложении код придёт на почту)`);
      setLoading(false);
      setStep('verify');
    }, 1000);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verificationCode !== sentCode) {
      setError('Неверный код подтверждения');
      return;
    }

    setStep('setup-profile');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setError('Файл слишком большой (макс. 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatar(base64);
      setAvatarType('base64');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSetAvatarUrl = () => {
    if (avatarUrl.trim()) {
      setAvatar(avatarUrl.trim());
      setAvatarType('url');
    }
  };

  const handleCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('Введите никнейм');
      return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
      setError('Никнейм должен быть от 3 до 20 символов');
      return;
    }

    const users = storage.getUsers();
    if (users.find(u => u.nickname.toLowerCase() === nickname.toLowerCase())) {
      setError('Этот никнейм уже занят');
      return;
    }

    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      nickname: nickname.trim(),
      email: email.toLowerCase(),
      password,
      avatar,
      avatarType,
      createdAt: Date.now(),
      lastOnline: Date.now()
    };

    storage.saveUser(newUser);
    
    // Сохраняем сессию
    localStorage.setItem('satorugram_session', JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      timestamp: Date.now()
    }));
    localStorage.setItem('satorugram_current_user', JSON.stringify(newUser));
    
    onLogin(newUser);
  };

  const renderAvatar = (av: string, type: 'emoji' | 'url' | 'base64') => {
    if (type === 'emoji') {
      return <span className="text-4xl">{av}</span>;
    }
    return (
      <img 
        src={av} 
        alt="Avatar" 
        className="w-16 h-16 rounded-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23666" width="64" height="64"/><text x="32" y="40" text-anchor="middle" fill="white" font-size="24">?</text></svg>';
        }}
      />
    );
  };

  // Компонент для поля пароля с глазом
  const PasswordInput = ({ 
    value, 
    onChange, 
    placeholder, 
    show, 
    onToggleShow 
  }: { 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder: string;
    show: boolean;
    onToggleShow: () => void;
  }) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1"
      >
        {show ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Satorugram</h1>
          <p className="text-purple-200 text-sm">v1.0.0</p>
        </div>

        {/* Шаг 1: Вход */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-white/80 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="text-white/80 text-sm mb-1 block">Пароль</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Войти
            </button>

            <p className="text-center text-white/60 text-sm">
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => { setStep('register'); setError(''); }}
                className="text-purple-300 hover:underline"
              >
                Регистрация
              </button>
            </p>
          </form>
        )}

        {/* Шаг 2: Регистрация */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="text-white/80 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="text-white/80 text-sm mb-1 block">Пароль</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
            </div>
            <div>
              <label className="text-white/80 text-sm mb-1 block">Подтвердите пароль</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                show={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Отправка кода...' : 'Получить код подтверждения'}
            </button>

            <p className="text-center text-white/60 text-sm">
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => { setStep('login'); setError(''); }}
                className="text-purple-300 hover:underline"
              >
                Войти
              </button>
            </p>
          </form>
        )}

        {/* Шаг 3: Ввод кода подтверждения */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">📧</div>
              <p className="text-white/80">
                Код подтверждения отправлен на<br />
                <span className="text-purple-300 font-semibold">{email}</span>
              </p>
            </div>

            <div>
              <label className="text-white/80 text-sm mb-1 block">Введите 6-значный код</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 text-center text-2xl tracking-widest"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Подтвердить
            </button>

            <button
              type="button"
              onClick={() => { setStep('register'); setError(''); setVerificationCode(''); }}
              className="w-full py-2 text-white/60 text-sm hover:text-white"
            >
              ← Назад
            </button>
          </form>
        )}

        {/* Шаг 4: Настройка профиля */}
        {step === 'setup-profile' && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-white/80">Настройте свой профиль</p>
            </div>

            {/* Превью аватара */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-purple-400">
                {renderAvatar(avatar, avatarType)}
              </div>
            </div>

            {/* Выбор типа аватара */}
            <div className="space-y-3">
              <p className="text-white/80 text-sm">Выберите аватар:</p>
              
              {/* Эмодзи */}
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-2">Эмодзи:</p>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setAvatar(emoji); setAvatarType('emoji'); }}
                      className={`text-2xl p-1 rounded-lg transition ${
                        avatar === emoji && avatarType === 'emoji' 
                          ? 'bg-purple-500 scale-110' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL */}
              <div className="bg-white/5 rounded-xl p-3">
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

              {/* Загрузка файла */}
              <div className="bg-white/5 rounded-xl p-3">
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
            </div>

            {/* Никнейм */}
            <div>
              <label className="text-white/80 text-sm mb-1 block">Никнейм</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ваш уникальный никнейм"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-white/40 text-xs mt-1">3-20 символов, должен быть уникальным</p>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Завершить регистрацию
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
