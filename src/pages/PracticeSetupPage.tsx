import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Play } from 'lucide-react';

interface List {
    id: string;
    name: string;
    type: 'base' | 'review';
    settings: any;
    linked_review_list_id?: string;
}

export default function PracticeSetupPage() {
    const { listId } = useParams();
    const navigate = useNavigate();

    const [list, setList] = useState<List | null>(null);

    // Settings
    const [order, setOrder] = useState<'random' | 'sequential' | 'reverse' | 'random_repeat'>('random');
    const [maxItems, setMaxItems] = useState<number>(20);
    const [showFeedback, setShowFeedback] = useState(true);
    const [timeLimit, setTimeLimit] = useState<number>(2);

    useEffect(() => {
        if (listId) {
            fetchList();
        }
    }, [listId]);

    const fetchList = async () => {
        const { data } = await supabase.from('lists').select('*').eq('id', listId).single();
        if (data) {
            setList(data);
            if (data.settings?.order) setOrder(data.settings.order);
            if (data.settings?.maxItems) setMaxItems(data.settings.maxItems);
            if (data.settings?.showFeedback !== undefined) setShowFeedback(data.settings.showFeedback);
            if (data.settings?.timeLimit !== undefined) setTimeLimit(data.settings.timeLimit);
        }
    };

    const handleStart = async () => {
        if (!listId) return;

        // Lưu setting mới nhất làm mặc định
        const newSettings = { order, maxItems, showFeedback, timeLimit };
        await supabase.from('lists').update({ settings: newSettings }).eq('id', listId);

        // Bắt đầu luyện tập
        navigate(`/practice/session/${listId}?order=${order}&feedback=${showFeedback}&timeLimit=${timeLimit}&maxItems=${maxItems}`);
    };

    if (!list) return <div className="container mt-4 text-center">Đang tải...</div>;

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <div className="flex items-center gap-4 mb-4 mt-4">
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/dashboard')} title="Về Trang chủ">
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ marginBottom: 0 }}>Thiết lập buổi luyện</h2>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>{list.name}</span>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => navigate(`/list/${listId}`)}>
                        Quản lý từ vựng
                    </button>
                </div>
            </div>

            <div className="card mb-4">
                <h3 className="mb-4">Tùy chỉnh</h3>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block', fontSize: '1.2rem', fontWeight: 600 }}>Thứ tự hiển thị từ</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)',
                            backgroundColor: order === 'sequential' ? '#eff6ff' : 'white',
                            transition: 'all 0.2s',
                            boxShadow: order === 'sequential' ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
                        }}>
                            <input type="radio" checked={order === 'sequential'} onChange={() => setOrder('sequential')} />
                            <span style={{ fontSize: '1.1rem' }}>Tuần tự</span>
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)',
                            backgroundColor: order === 'random' ? '#eff6ff' : 'white',
                            transition: 'all 0.2s',
                            boxShadow: order === 'random' ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
                        }}>
                            <input type="radio" checked={order === 'random'} onChange={() => setOrder('random')} />
                            <span style={{ fontSize: '1.1rem' }}>Ngẫu nhiên</span>
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)',
                            backgroundColor: order === 'reverse' ? '#eff6ff' : 'white',
                            transition: 'all 0.2s',
                            boxShadow: order === 'reverse' ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
                        }}>
                            <input type="radio" checked={order === 'reverse'} onChange={() => setOrder('reverse')} />
                            <span style={{ fontSize: '1.1rem' }}>Ngược lại</span>
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            padding: '1.25rem', borderRadius: '12px', border: order === 'random_repeat' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            backgroundColor: order === 'random_repeat' ? '#f0f7ff' : 'white',
                            color: order === 'random_repeat' ? 'var(--primary)' : 'inherit',
                            fontWeight: order === 'random_repeat' ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                            boxShadow: order === 'random_repeat' ? '0 4px 12px -2px rgba(59, 130, 246, 0.2)' : 'none'
                        }}>
                            <input type="radio" checked={order === 'random_repeat'} onChange={() => setOrder('random_repeat')} />
                            <span style={{ fontSize: '1.1rem' }}>Ngẫu nhiên (lặp lại)</span>
                        </label>
                    </div>
                </div>

                {order === 'random_repeat' && (
                    <div className="form-group" style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '16px',
                        border: '1.5px dashed var(--primary)',
                        marginTop: '0.5rem'
                    }}>
                        <label className="form-label" style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'block', fontWeight: 600 }}>Số câu hỏi tối đa</label>
                        <div className="flex flex-col gap-4">
                            <input
                                type="number"
                                className="input"
                                min={1} max={500}
                                value={maxItems}
                                onChange={(e) => setMaxItems(Number(e.target.value) || 20)}
                                style={{ maxWidth: '100%', fontSize: '1.25rem', padding: '1rem', border: '1px solid #bae6fd' }}
                            />
                            <p className="text-muted" style={{ fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>Hệ thống sẽ bốc ngẫu nhiên từ danh sách cho đến khi đủ số lượng (có thể lặp lại cùng một từ).</p>
                        </div>
                    </div>
                )}

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block', fontSize: '1.1rem', fontWeight: 600 }}>Thời gian hiện mỗi từ (giây)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            className="input"
                            min={1} max={60}
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(Number(e.target.value) || 2)}
                            style={{ maxWidth: '150px', padding: '1rem', fontSize: '1.25rem', textAlign: 'center' }}
                        />
                        <span className="text-muted" style={{ fontSize: '1.1rem' }}>Giây</span>
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block', fontSize: '1.1rem', fontWeight: 600 }}>Phản hồi</label>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                        padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)',
                        backgroundColor: showFeedback ? '#f0fdf4' : 'white',
                        transition: 'all 0.2s'
                    }}>
                        <input type="checkbox" checked={showFeedback} onChange={(e) => setShowFeedback(e.target.checked)} style={{ transform: 'scale(1.5)' }} />
                        <span style={{ fontSize: '1.1rem' }}>Hiện thống kê nhỏ góc sau mỗi từ</span>
                    </label>
                </div>
            </div>

            <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.2rem' }} onClick={handleStart}>
                <Play size={24} /> Bắt đầu luyện tập
            </button>
        </div>
    );
}
