import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, History } from 'lucide-react';

interface SessionRecord {
    id: string;
    list_id: string;
    total_words: number;
    correct_count: number;
    incorrect_count: number;
    created_at: string;
    lists: { name: string } | null;
}

export default function HistoryPage() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (session) fetchHistory();
    }, [session, currentPage, itemsPerPage]);

    const fetchHistory = async () => {
        setLoading(true);
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
            .from('practice_sessions')
            .select('*, lists(name)', { count: 'exact' })
            .eq('user_id', session?.user.id)
            .order('sort_order', { ascending: false })
            .range(from, to);

        if (!error && data) {
            setSessions(data as unknown as SessionRecord[]);
            if (count !== null) setTotalItems(count);
        }
        setLoading(false);
    };

    const calculateAccuracy = (correct: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((correct / total) * 100);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (!session) return null;

    return (
        <div className="container">
            <div className="flex items-center gap-4 mb-4 mt-4">
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ marginBottom: 0 }}>Lịch Sử Luyện Tập</h2>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Theo dõi quá trình ghi nhớ của bạn</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Hiển thị:</span>
                    <select
                        className="input"
                        style={{ width: 'auto', padding: '0.2rem 0.5rem' }}
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="py-8 text-center text-muted">Đang tải...</div>
                ) : sessions.length === 0 ? (
                    <div className="text-center text-muted py-8">
                        <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>Bạn chưa có lịch sử luyện tập nào.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem 0' }}>Thời gian</th>
                                        <th style={{ padding: '1rem 0' }}>Danh sách</th>
                                        <th style={{ padding: '1rem 0' }}>Số từ</th>
                                        <th style={{ padding: '1rem 0' }}>Đúng</th>
                                        <th style={{ padding: '1rem 0' }}>Sai</th>
                                        <th style={{ padding: '1rem 0' }}>Tỷ lệ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(s => {
                                        const date = new Date(s.created_at).toLocaleString('vi-VN');
                                        const accuracy = calculateAccuracy(s.correct_count, s.total_words);
                                        return (
                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>{date}</td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>{s.lists?.name || 'Đã xóa'}</td>
                                                <td style={{ padding: '1rem 0' }}>{s.total_words}</td>
                                                <td style={{ padding: '1rem 0', color: 'var(--success)', fontWeight: 'bold' }}>{s.correct_count}</td>
                                                <td style={{ padding: '1rem 0', color: 'var(--danger)', fontWeight: 'bold' }}>{s.incorrect_count}</td>
                                                <td style={{ padding: '1rem 0' }}>
                                                    <span style={{
                                                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.875rem',
                                                        backgroundColor: accuracy >= 80 ? '#d1fae5' : accuracy >= 50 ? '#fef3c7' : '#fee2e2',
                                                        color: accuracy >= 80 ? '#065f46' : accuracy >= 50 ? '#92400e' : '#991b1b'
                                                    }}>
                                                        {accuracy}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    Trang {currentPage} / {totalPages} (Tổng {totalItems} bản ghi)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-secondary"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        Trước
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
