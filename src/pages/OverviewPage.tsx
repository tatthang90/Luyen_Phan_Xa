import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CheckCircle, Brain, BookOpen } from 'lucide-react';

export default function OverviewPage() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalLists: 0,
        totalBaseWords: 0,
        totalSessions: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const { count: listCount } = await supabase.from('lists').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('type', 'base');
                const { data: sessionData } = await supabase.from('practice_sessions').select('correct_count, incorrect_count').eq('user_id', session.user.id);

                let totalC = 0; let totalI = 0;
                if (sessionData) {
                    sessionData.forEach(s => {
                        totalC += s.correct_count;
                        totalI += s.incorrect_count;
                    });
                }

                setStats({
                    totalLists: listCount || 0,
                    totalBaseWords: 0,
                    totalSessions: sessionData?.length || 0,
                    totalCorrect: totalC,
                    totalIncorrect: totalI
                });
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };

        fetchStats();
    }, [session]);

    if (!session) return null;

    return (
        <div className="container" style={{ padding: '1rem 0' }}>
            {/* Title Section */}
            <div className="mb-6">
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Tổng quan lộ trình học</h2>
                <p className="text-muted">Theo dõi tiến triển và kết quả rèn luyện của bạn.</p>
            </div>

            {loading ? (
                <div className="card p-12 text-center">
                    <p className="text-muted">Đang tính toán thống kê...</p>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid-cols-3 mb-8">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                                <BookOpen size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '4px' }}>Danh Sách Gốc</p>
                                <div className="flex items-baseline gap-1">
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.totalLists}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>chủ đề</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: 'var(--success)' }}>
                                <CheckCircle size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '4px' }}>Đã thuộc</p>
                                <div className="flex items-baseline gap-1">
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{stats.totalCorrect}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>lượt</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                            <div className="stat-icon" style={{ backgroundColor: '#fff1f2', color: 'var(--danger)' }}>
                                <Brain size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '4px' }}>Còn quên</p>
                                <div className="flex items-baseline gap-1">
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.totalIncorrect}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>lượt</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions / Shortcuts */}
                    <div className="card" style={{ padding: '2rem', background: 'linear-gradient(to right, #ffffff, #f9fafb)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bắt đầu hành động</h3>
                        <p className="text-muted mb-6" style={{ maxWidth: '600px' }}>
                            Luyện tập thêm hoặc tạo bộ từ vựng mới để tiếp tục hành trình phản xạ ngôn ngữ của bạn ngay hôm nay.
                        </p>
                        <div className="flex gap-4">
                            <button className="btn btn-primary" onClick={() => navigate('/lists-manager')} style={{ padding: '0.75rem 1.5rem' }}>
                                Đi tới Danh sách của bạn
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/history')} style={{ padding: '0.75rem 1.5rem' }}>
                                Xem lại lịch sử
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
