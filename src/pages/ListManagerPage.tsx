import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Image as ImageIcon, Music, Type, Trash2, Share2, Globe, Lock, Edit2, Check, X } from 'lucide-react';

interface Vocabulary {
    id: string;
    content_type: 'text' | 'image' | 'audio';
    content: string;
}

export default function ListManagerPage() {
    const { listId } = useParams();
    const { session } = useAuth();
    const navigate = useNavigate();

    const [listName, setListName] = useState('');
    const [listType, setListType] = useState<string>('');
    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);

    // States for adding new item
    const [type, setType] = useState<'text' | 'image' | 'audio'>('text');
    const [textContent, setTextContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');

    useEffect(() => {
        if (listId) {
            fetchListDetails();
            fetchVocabularies();
        }
    }, [listId]);

    const fetchListDetails = async () => {
        if (!session?.user.id) return;
        const { data, error } = await supabase
            .from('lists')
            .select('name, type, is_public, user_id, linked_review_list_id')
            .eq('id', listId)
            .single();

        if (error || !data) {
            alert('Không tìm thấy danh sách!');
            navigate('/lists-manager');
            return;
        }

        if (data.user_id !== session.user.id) {
            alert('Bạn không có quyền quản lý danh sách này!');
            navigate('/lists-manager');
            return;
        }

        setListName(data.name);
        setEditedName(data.name);
        setListType(data.type);
        setIsPublic(data.is_public);
    };

    const handleRename = async () => {
        if (!editedName.trim() || editedName === listName) {
            setIsEditingName(false);
            setEditedName(listName);
            return;
        }

        try {
            const { error: renameError } = await supabase
                .from('lists')
                .update({ name: editedName.trim() })
                .eq('id', listId);

            if (renameError) throw renameError;

            const { data: currentList } = await supabase.from('lists').select('type, linked_review_list_id').eq('id', listId).single();
            if (currentList?.type === 'base' && currentList.linked_review_list_id) {
                await supabase
                    .from('lists')
                    .update({ name: `${editedName.trim()} - Chưa nhớ` })
                    .eq('id', currentList.linked_review_list_id);
            }

            setListName(editedName.trim());
            setIsEditingName(false);
        } catch (error) {
            console.error('Lỗi khi đổi tên:', error);
            alert('Không thể đổi tên danh sách.');
        }
    };

    const togglePublic = async () => {
        const newStatus = !isPublic;
        const { error } = await supabase
            .from('lists')
            .update({ is_public: newStatus })
            .eq('id', listId);

        if (error) {
            alert('Lỗi khi cập nhật trạng thái chia sẻ!');
        } else {
            setIsPublic(newStatus);
        }
    };

    const fetchVocabularies = async () => {
        const { data } = await supabase
            .from('vocabularies')
            .select('*')
            .eq('list_id', listId)
            .order('sort_order', { ascending: true });
        if (data) setVocabularies(data);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !listId) return;
        setUploading(true);

        try {
            // Xử lý Text (hỗ trợ nhập nhiều dòng bulk insert)
            if (type === 'text') {
                if (!textContent.trim()) throw new Error('Vui lòng nhập nội dung');

                // Tách các dòng và lưu thành mảng bulk payload
                const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                const insertItems = lines.map(line => ({
                    list_id: listId,
                    content_type: 'text',
                    content: line
                }));

                const { error } = await supabase.from('vocabularies').insert(insertItems);
                if (error) throw error;

                setTextContent('');

            } else {
                // Xử lý File Upload (Ảnh/Âm thanh)
                if (!file) throw new Error('Vui lòng chọn file');

                const fileExt = file.name.split('.').pop();
                const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

                const { error } = await supabase.from('vocabularies').insert({
                    list_id: listId,
                    content_type: type,
                    content: publicUrl
                });

                if (error) throw error;
                setFile(null);
            }

            fetchVocabularies();

        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Có lỗi khi thêm từ vựng.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
        await supabase.from('vocabularies').delete().eq('id', id);
        fetchVocabularies();
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <div className="flex items-center gap-4 mb-4 mt-4">
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/lists-manager')}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    {isEditingName ? (
                        <div className="flex gap-2 items-center">
                            <input
                                className="input"
                                style={{ fontSize: '1.25rem', fontWeight: 'bold', padding: '0.25rem 0.5rem' }}
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename();
                                    if (e.key === 'Escape') {
                                        setIsEditingName(false);
                                        setEditedName(listName);
                                    }
                                }}
                            />
                            <button className="btn btn-primary" style={{ padding: '0.4rem' }} onClick={handleRename}>
                                <Check size={18} />
                            </button>
                            <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={() => {
                                setIsEditingName(false);
                                setEditedName(listName);
                            }}>
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 style={{ marginBottom: 0 }}>{listName}</h2>
                            <button className="btn-ghost p-1" onClick={() => setIsEditingName(true)} title="Đổi tên">
                                <Edit2 size={16} className="text-muted" />
                            </button>
                        </div>
                    )}
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Quản lý từ vựng trong danh sách</span>
                </div>
                {listType === 'base' && (
                    <button className="btn btn-ghost" onClick={() => setShowShareModal(true)} title="Chia sẻ danh sách">
                        <Share2 size={20} color={isPublic ? 'var(--primary)' : 'var(--text-muted)'} />
                    </button>
                )}
                <button className="btn btn-primary" onClick={() => navigate(`/practice/setup/${listId}`)}>
                    Luyện tập ngay
                </button>
            </div>

            {listType === 'base' && (
                <div className="card mb-4">
                    <h3 className="mb-4">Thêm Từ Vựng Mới</h3>
                    <form onSubmit={handleAddSubmit}>
                        <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="radio" checked={type === 'text'} onChange={() => setType('text')} />
                                <Type size={16} /> Văn bản
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="radio" checked={type === 'image'} onChange={() => setType('image')} />
                                <ImageIcon size={16} /> Hình ảnh
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="radio" checked={type === 'audio'} onChange={() => setType('audio')} />
                                <Music size={16} /> Âm thanh
                            </label>
                        </div>

                        <div className="flex-col gap-2">
                            {type === 'text' ? (
                                <>
                                    <textarea
                                        className="textarea"
                                        value={textContent}
                                        onChange={(e) => setTextContent(e.target.value)}
                                        placeholder="Nhập từ vựng... Bạn có thể paste nhiều từ, mỗi từ một dòng."
                                        required
                                        rows={4}
                                    />
                                </>
                            ) : (
                                <input
                                    type="file"
                                    className="input"
                                    accept={type === 'image' ? "image/*" : "audio/*"}
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    required
                                />
                            )}
                            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                                {uploading ? 'Đang tải lên...' : 'Thêm vào danh sách'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 style={{ margin: 0 }}>Danh Sách Từ Vựng ({vocabularies.length})</h3>
                </div>

                {vocabularies.length === 0 ? (
                    <p className="text-center text-muted py-4">Chưa có từ vựng nào.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>STT</th>
                                    <th style={{ padding: '0.75rem' }}>Nội dung</th>
                                    <th style={{ padding: '0.75rem' }}>Loại</th>
                                    <th style={{ padding: '0.75rem' }}>5 lần gần nhất</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vocabularies.map((v, index) => (
                                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            {v.content_type === 'text' && <span style={{ fontWeight: 500 }}>{v.content}</span>}
                                            {v.content_type === 'image' && <img src={v.content} alt="vocab" style={{ height: '40px', borderRadius: '4px' }} />}
                                            {v.content_type === 'audio' && <audio src={v.content} controls style={{ height: '30px', maxWidth: '150px' }} />}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>
                                                {v.content_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {(() => {
                                                    const results = (v as any).last_5_results || [];
                                                    // Luôn hiển thị 5 dấu chấm
                                                    return Array.from({ length: 5 }).map((_, i) => {
                                                        const res = results[i];
                                                        return (
                                                            <div
                                                                key={i}
                                                                title={res === undefined ? 'Chưa tập' : (res ? 'Đúng' : 'Sai')}
                                                                style={{
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: res === undefined ? '#e5e7eb' : (res ? 'var(--success)' : 'var(--danger)')
                                                                }}
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDelete(v.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Chia sẻ */}
            {showShareModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Chia sẻ danh sách</h3>
                            <button className="btn-ghost" onClick={() => setShowShareModal(false)}>✕</button>
                        </div>

                        <div className="flex items-center gap-3 p-4 mb-4" style={{ backgroundColor: 'var(--secondary)', borderRadius: '8px' }}>
                            {isPublic ? <Globe className="text-primary" /> : <Lock className="text-muted" />}
                            <div className="flex-1">
                                <p className="font-bold">{isPublic ? 'Đang công khai' : 'Đang riêng tư'}</p>
                                <p className="text-xs text-muted">
                                    {isPublic ? 'Bất kỳ ai có liên kết đều có thể xem và clone.' : 'Chỉ bạn mới có thể thấy danh sách này.'}
                                </p>
                            </div>
                            <button
                                className={`btn btn-sm ${isPublic ? '' : 'btn-primary'}`}
                                onClick={togglePublic}
                            >
                                {isPublic ? 'Tắt' : 'Bật'}
                            </button>
                        </div>

                        {isPublic && (
                            <div>
                                <p className="text-sm font-bold mb-2">Liên kết chia sẻ:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input text-xs"
                                        readOnly
                                        value={`${window.location.origin}/share/${listId}`}
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/share/${listId}`);
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
        </div>
    );
}
