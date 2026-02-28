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
        <div className="container" style={{ padding: 0 }}>
            {/* Title */}
            <h2 className="mb-4">Tổng quan lộ trình học</h2>

            {loading ? (
                <p className="text-muted text-center mt-4">Đang tính toán thống kê...</p>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid-cols-3 mb-4">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#e0e7ff', color: 'var(--primary)' }}>
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Danh Sách Gốc</p>
                                <h3 style={{ marginBottom: 0 }}>{stats.totalLists} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>chủ đề</span></h3>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: 'var(--success)' }}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Đã thuộc</p>
                                <h3 style={{ marginBottom: 0 }}>{stats.totalCorrect} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>lượt</span></h3>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: 'var(--danger)' }}>
                                <Brain size={24} />
                            </div>
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Còn quên</p>
                                <h3 style={{ marginBottom: 0 }}>{stats.totalIncorrect} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>lượt</span></h3>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions / Shortcuts */}
                    <div className="card">
                        <h3>Bắt đầu hành động</h3>
                        <p className="text-muted mb-4">Luyện tập thêm hoặc tạo bộ từ vựng mới để tiếp tục hành trình.</p>
                        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/lists-manager')}>
                                Đi tới Danh sách của bạn
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/history')}>
                                Xem lại lịch sử
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
