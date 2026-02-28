import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // Hiển thị thông báo hoặc auto login tùy setup của Supabase
                alert('Đăng ký thành công! Vui lòng đăng nhập.');
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="text-center mb-4">
                    <h2>{isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h2>
                    <p className="text-muted">
                        {isLogin ? 'Chào mừng bạn quay lại!' : 'Đăng ký ngay để bắt đầu luyện tập'}
                    </p>
                </div>

                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} />
                        <span style={{ fontSize: '0.875rem' }}>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="nguyenvana@gmail.com"
                        />
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label" htmlFor="password">Mật khẩu</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                        {loading ? 'Đang xử lý...' : (isLogin ? <><LogIn size={20} /> Đăng Nhập</> : <><UserPlus size={20} /> Đăng Ký</>)}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', marginTop: '0.5rem' }}
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
