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
    const [order, setOrder] = useState<'random' | 'sequential' | 'reverse'>('random');
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
            if (data.settings?.showFeedback !== undefined) setShowFeedback(data.settings.showFeedback);
            if (data.settings?.timeLimit !== undefined) setTimeLimit(data.settings.timeLimit);
        }
    };

    const handleStart = async () => {
        if (!listId) return;

        // Lưu setting mới nhất làm mặc định
        const newSettings = { order, showFeedback, timeLimit };
        await supabase.from('lists').update({ settings: newSettings }).eq('id', listId);

        // Bắt đầu luyện tập
        navigate(`/practice/session/${listId}?order=${order}&feedback=${showFeedback}&timeLimit=${timeLimit}`);
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

                <div className="form-group mb-4">
                    <label className="form-label">Thứ tự hiển thị từ</label>
                    <div className="flex gap-4">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" checked={order === 'sequential'} onChange={() => setOrder('sequential')} />
                            Tuần tự
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" checked={order === 'random'} onChange={() => setOrder('random')} />
                            Ngẫu nhiên
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" checked={order === 'reverse'} onChange={() => setOrder('reverse')} />
                            Ngược lại
                        </label>
                    </div>
                </div>

                <div className="form-group mb-4">
                    <label className="form-label">Thời gian hiện mỗi từ (giây)</label>
                    <input
                        type="number"
                        className="input"
                        min={1} max={60}
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(Number(e.target.value) || 2)}
                        style={{ maxWidth: '100px' }}
                    />
                </div>

                <div className="form-group mb-4">
                    <label className="form-label">Phản hồi</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showFeedback} onChange={(e) => setShowFeedback(e.target.checked)} />
                        Hiện thống kê nhỏ góc sau mỗi từ
                    </label>
                </div>
            </div>

            <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.2rem' }} onClick={handleStart}>
                <Play size={24} /> Bắt đầu luyện tập
            </button>
        </div>
    );
}
