import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';

interface AuthGateProps {
  onSignedIn: () => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ onSignedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const signIn = async (mode: 'signin' | 'signup') => {
    if (!supabase) {
      setMessage('Chưa cấu hình biến môi trường Supabase.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });

      if (result.error) throw result.error;
      setMessage(mode === 'signup' ? 'Đã tạo tài khoản. Nếu Supabase yêu cầu xác nhận email, hãy xác nhận rồi đăng nhập.' : 'Đăng nhập thành công.');
      if (result.data.session) onSignedIn();
    } catch (error: any) {
      setMessage(error.message || 'Không đăng nhập được.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <i className="fa-solid fa-terminal text-xs" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">LingoSnap cá nhân</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Đăng nhập đồng bộ dữ liệu</h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Dùng cùng một tài khoản trên laptop và điện thoại để đồng bộ note, câu hỏi phỏng vấn, từ vựng và Pomodoro.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); signIn('signin'); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
            />
          </div>

          {message && (
            <div className="text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-lg p-3">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => signIn('signup')}
              className="py-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50"
            >
              Tạo mới
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;
