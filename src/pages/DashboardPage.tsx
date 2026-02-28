import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Plus, Folder, Share2, Globe, Lock, Trash2 } from 'lucide-react';

interface List {
    id: string;
    name: string;
    type: 'base' | 'review';
    linked_review_list_id?: string;
    is_public: boolean;
    color: string;
}

const VIBRANT_COLORS = [
    '#4f46e5', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f97316', // Orange
];

export default function DashboardPage() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [lists, setLists] = useState<List[]>([]);
    const [loading, setLoading] = useState(true);

    // Form tạo list mới
    const [showCreate, setShowCreate] = useState(false);
    const [newListName, setNewListName] = useState('');

    // Chia sẻ
    const [shareList, setShareList] = useState<List | null>(null);

    const togglePublic = async (list: List) => {
        const newStatus = !list.is_public;
        const { error } = await supabase
            .from('lists')
            .update({ is_public: newStatus })
            .eq('id', list.id);

        if (error) {
            alert('Lỗi khi cập nhật trạng thái chia sẻ!');
        } else {
            setLists(lists.map(l => l.id === list.id ? { ...l, is_public: newStatus } : l));
            if (shareList?.id === list.id) {
                setShareList({ ...list, is_public: newStatus });
            }
        }
    };

    useEffect(() => {
        if (!session) {
            navigate('/login');
            return;
        }
        fetchLists();
    }, [session, navigate]);

    const fetchLists = async () => {
        if (!session?.user.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('type', 'base')
            .order('sort_order', { ascending: false });

        if (error) {
            console.error('Lỗi khi tải danh sách:', error);
        } else {
            setLists(data || []);
        }
        setLoading(false);
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || !session?.user.id) return;

        const randomColor = VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];

        try {
            // 1. Tạo danh sách Review trước
            const { data: reviewData, error: reviewError } = await supabase
                .from('lists')
                .insert({
                    user_id: session.user.id,
                    name: `${newListName.trim()} - Chưa nhớ`,
                    type: 'review',
                    color: randomColor
                })
                .select()
                .single();

            if (reviewError) throw reviewError;

            // 2. Tạo danh sách Base liên kết với danh sách Review vừa tạo
            const { error: baseError } = await supabase
                .from('lists')
                .insert({
                    user_id: session.user.id,
                    name: newListName.trim(),
                    type: 'base',
                    linked_review_list_id: reviewData.id,
                    color: randomColor
                });

            if (baseError) throw baseError;

            // Reset form & Refresh
            setNewListName('');
            setShowCreate(false);
            fetchLists();

        } catch (error) {
            console.error('Lỗi khi tạo danh sách mới:', error);
            alert('Không thể tạo danh sách. Vui lòng thử lại!');
        }
    };

    const handleDeleteList = async (id: string, name: string, reviewId?: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa danh sách "${name}"? Toàn bộ từ vựng và lịch sử luyện tập của danh sách này sẽ bị mất.`)) return;

        try {
            // Xóa vocabularies (Cascade manual)
            await supabase.from('vocabularies').delete().eq('list_id', id);
            if (reviewId) {
                await supabase.from('vocabularies').delete().eq('list_id', reviewId);
            }

            // Xóa list gốc
            await supabase.from('lists').delete().eq('id', id);

            // Xóa list review nếu có
            if (reviewId) {
                await supabase.from('lists').delete().eq('id', reviewId);
            }

            setLists(lists.filter(l => l.id !== id));
            alert('Đã xóa danh sách thành công!');
        } catch (error) {
            console.error('Lỗi khi xóa:', error);
            alert('Không thể xóa danh sách.');
        }
    };

    if (!session) return null;

    return (
        <div className="container" style={{ padding: 0 }}>
            <div className="flex justify-between items-center mb-4 mt-4">
                <h2 style={{ marginBottom: 0 }}>Danh Sách Từ Vựng</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {showCreate ? 'Hủy' : <><Plus size={18} /> Tạo Danh Sách Mới</>}
                </button>
            </div>

            {showCreate && (
                <div className="card mb-4" style={{ backgroundColor: 'var(--secondary)' }}>
                    <form onSubmit={handleCreateList} className="flex gap-2 items-center">
                        <input
                            type="text"
                            className="input"
                            placeholder="Nhập tên Danh sách gốc (VD: Tiếng Anh giao tiếp)"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            autoFocus
                            required
                        />
                        <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Tạo</button>
                    </form>
                    <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
                        Hệ thống sẽ tự động tạo một danh sách Ôn tập đính kèm.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="text-center mt-4">Đang tải danh sách...</div>
            ) : (
                <div className="grid-cards">
                    {lists.length === 0 ? (
                        <div className="text-muted text-center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>
                            <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>Bạn chưa có danh sách từ vựng nào.</p>
                        </div>
                    ) : (
                        lists.map(list => (
                            <div
                                key={list.id}
                                className="card"
                                style={{
                                    borderLeft: `6px solid ${list.color || 'var(--primary)'}`,
                                    position: 'relative'
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.2rem', color: list.color, marginBottom: '0.25rem' }}>{list.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#475569',
                                                textTransform: 'uppercase',
                                                fontWeight: 'bold'
                                            }}>
                                                Gốc
                                            </span>
                                            {list.is_public && (
                                                <span className="text-primary" style={{ fontSize: '0.7rem' }}>● Public</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="btn-ghost p-1 text-muted hover-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareList(list);
                                            }}
                                            title="Chia sẻ"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                        <button
                                            className="btn-ghost p-1 text-muted hover-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteList(list.id, list.name, list.linked_review_list_id);
                                            }}
                                            title="Xóa danh sách"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                    <div className="flex gap-2">
                                        <button className="btn btn-primary w-full" onClick={() => navigate(`/practice/setup/${list.id}`)}>
                                            Luyện Tập
                                        </button>
                                        <button className="btn w-full" style={{ border: '1px solid var(--border-color)' }} onClick={() => navigate(`/list/${list.id}`)}>
                                            Quản Lý
                                        </button>
                                    </div>
                                    {list.linked_review_list_id && (
                                        <button
                                            className="btn btn-sm w-full"
                                            style={{ backgroundColor: '#fff5f5', color: 'var(--danger)', border: '1px solid #feb2b2' }}
                                            onClick={() => navigate(`/practice/setup/${list.linked_review_list_id}`)}
                                        >
                                            Luyện tập Ôn tập (Từ khó)
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Chia sẻ */}
            {shareList && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Chia sẻ danh sách</h3>
                            <button className="btn-ghost" onClick={() => setShareList(null)}>✕</button>
                        </div>

                        <div className="flex items-center gap-3 p-4 mb-4" style={{ backgroundColor: 'var(--secondary)', borderRadius: '8px' }}>
                            {shareList.is_public ? <Globe className="text-primary" /> : <Lock className="text-muted" />}
                            <div className="flex-1">
                                <p className="font-bold">{shareList.is_public ? 'Đang công khai' : 'Đang riêng tư'}</p>
                                <p className="text-xs text-muted">
                                    {shareList.is_public ? 'Bất kỳ ai có liên kết đều có thể xem và clone.' : 'Chỉ bạn mới có thể thấy danh sách này.'}
                                </p>
                            </div>
                            <button
                                className={`btn btn-sm ${shareList.is_public ? '' : 'btn-primary'}`}
                                onClick={() => togglePublic(shareList)}
                            >
                                {shareList.is_public ? 'Tắt' : 'Bật'}
                            </button>
                        </div>

                        {shareList.is_public && (
                            <div>
                                <p className="text-sm font-bold mb-2">Liên kết chia sẻ:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input text-xs"
                                        readOnly
                                        value={`${window.location.origin}/share/${shareList.id}`}
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/share/${shareList.id}`);
                                            alert('Đã copy liên kết!');
                                        }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
