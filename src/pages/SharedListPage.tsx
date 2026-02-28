import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Share2, Download, ArrowLeft, Check } from 'lucide-react';

interface List {
    id: string;
    name: string;
    description: string;
    type: string;
    user_id: string;
}

interface Vocabulary {
    id: string;
    content_type: string;
    content: string;
}

export default function SharedListPage() {
    const { listId } = useParams();
    const navigate = useNavigate();
    const { session } = useAuth();
    const [list, setList] = useState<List | null>(null);
    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState(false);
    const [isCloned, setIsCloned] = useState(false);

    useEffect(() => {
        if (listId) {
            fetchSharedData();
            if (session) checkIfCloned();
        }
    }, [listId, session]);

    const checkIfCloned = async () => {
        if (!session?.user.id || !listId) return;
        const { data } = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('cloned_from_id', listId)
            .limit(1);

        if (data && data.length > 0) {
            setIsCloned(true);
        }
    };

    const fetchSharedData = async () => {
        setLoading(true);
        // Lấy thông tin list (chỉ nếu là public và base)
        const { data: listData, error: listError } = await supabase
            .from('lists')
            .select('*')
            .eq('id', listId)
            .eq('is_public', true)
            .eq('type', 'base')
            .single();

        if (listError || !listData) {
            console.error('Lỗi hoặc danh sách không tồn tại:', listError);
            setLoading(false);
            return;
        }

        setList(listData);

        // Lấy từ vựng
        const { data: vocabData } = await supabase
            .from('vocabularies')
            .select('id, content_type, content')
            .eq('list_id', listId)
            .order('sort_order', { ascending: true });

        if (vocabData) setVocabularies(vocabData);
        setLoading(false);
    };

    const handleClone = async () => {
        if (!session) {
            alert('Vui lòng đăng nhập để lưu danh sách này!');
            navigate('/login');
            return;
        }

        if (!list) return;

        setCloning(true);
        try {
            // 1. Tạo list mới cho người dùng hiện tại
            const { data: newList, error: listError } = await supabase
                .from('lists')
                .insert({
                    user_id: session.user.id,
                    name: `${list.name} (Bản sao)`,
                    description: list.description,
                    type: 'base',
                    is_public: false,
                    cloned_from_id: listId,
                    color: (list as any).color || '#4f46e5'
                })
                .select()
                .single();

            setIsCloned(true);

            if (listError) throw listError;

            // 2. Tạo review list đi kèm
            const { data: newReviewList } = await supabase
                .from('lists')
                .insert({
                    user_id: session.user.id,
                    name: `${list.name} (Bản sao) - Chưa nhớ`,
                    type: 'review',
                    is_public: false,
                    color: (list as any).color || '#4f46e5'
                })
                .select()
                .single();

            if (newReviewList) {
                await supabase.from('lists').update({ linked_review_list_id: newReviewList.id }).eq('id', newList.id);
            }

            // 3. Copy từ vựng (xóa last_5_results)
            if (vocabularies.length > 0) {
                const newVocabs = vocabularies.map(v => ({
                    list_id: newList.id,
                    content_type: v.content_type,
                    content: v.content,
                    last_5_results: [] // Reset kết quả luyện tập
                }));
                await supabase.from('vocabularies').insert(newVocabs);
            }

            alert('Đã lưu danh sách vào bộ sưu tập của bạn!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Lỗi khi clone danh sách:', error);
            alert('Có lỗi xảy ra khi lưu danh sách.');
        } finally {
            setCloning(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải danh sách chia sẻ...</div>;

    if (!list) {
        return (
            <div className="container p-8 text-center">
                <h2>Danh sách không tồn tại hoặc không được chia sẻ công khai.</h2>
                <button className="btn btn-primary mt-4" onClick={() => navigate('/dashboard')}>Về Dashboard</button>
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="flex items-center gap-4 mb-8">
                <button className="btn btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
                <div className="flex items-center gap-2">
                    <Share2 className="text-primary" />
                    <h1 className="text-2xl font-bold">Danh sách được chia sẻ</h1>
                </div>
            </div>

            <div className="card mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-primary">{list.name}</h2>
                        <p className="text-muted">{list.description || 'Không có mô tả'}</p>
                        <p className="mt-2 text-sm text-muted">Số lượng từ: <strong>{vocabularies.length}</strong> từ</p>
                    </div>
                    {isCloned ? (
                        <button className="btn btn-secondary flex items-center gap-2" disabled>
                            <Check size={18} />
                            Đã có trong bộ sưu tập
                        </button>
                    ) : (
                        <button
                            className="btn btn-success flex items-center gap-2"
                            onClick={handleClone}
                            disabled={cloning}
                        >
                            <Download size={18} />
                            {cloning ? 'Đang lưu...' : 'Lưu về bộ sưu tập của tôi'}
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <h3 className="font-bold mb-4">Xem trước từ vựng</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '0.75rem' }}>Loại</th>
                                <th style={{ padding: '0.75rem' }}>Nội dung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vocabularies.map((v) => (
                                <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem' }}>{v.content_type}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {v.content_type === 'image' ? (
                                            <img src={v.content} alt="vocab" style={{ maxHeight: '50px', borderRadius: '4px' }} />
                                        ) : v.content_type === 'audio' ? (
                                            'Âm thanh'
                                        ) : (
                                            v.content
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
