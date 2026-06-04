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
      setMessage('Chưa cấu hình Supabase env.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 border border-gray-100 shadow-xl space-y-5">
        <div>
          <p className="text-blue-600 font-black uppercase tracking-widest text-xs mb-2">LingoSnap cá nhân</p>
          <h1 className="text-xl font-black text-gray-900">Đăng nhập để đồng bộ</h1>
          <p className="text-gray-500 font-medium mt-2">Dùng cùng một tài khoản trên laptop và điện thoại để thấy chung từ vựng, Pomodoro và streak.</p>
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-blue-500" />
        {message && <div className="text-sm font-bold text-blue-700 bg-blue-50 rounded-2xl p-4">{message}</div>}
        <div className="grid grid-cols-2 gap-3">
          <button disabled={loading} onClick={() => signIn('signin')} className="py-2.5 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 disabled:opacity-50">Đăng nhập</button>
          <button disabled={loading} onClick={() => signIn('signup')} className="py-2.5 rounded-2xl bg-gray-900 text-white font-black hover:bg-black disabled:opacity-50">Tạo mới</button>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;

