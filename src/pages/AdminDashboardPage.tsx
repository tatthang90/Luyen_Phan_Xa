import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Search, RefreshCw, ShieldCheck, ShieldAlert, UserMinus, List as ListIcon, Users, AlertCircle } from 'lucide-react';

interface ListWithUser {
    id: string;
    name: string;
    type: string;
    is_public: boolean;
    user_id: string;
    created_at: string;
    profiles: {
        email: string;
    } | null;
}

interface Profile {
    id: string;
    email: string;
    is_admin: boolean;
    created_at: string;
}

type TabType = 'lists' | 'users';

export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [lists, setLists] = useState<ListWithUser[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        if (activeTab === 'lists') {
            fetchAllLists();
        } else {
            fetchAllProfiles();
        }
    }, [activeTab]);

    const fetchAllLists = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lists')
                .select(`
                    id, name, type, is_public, user_id, created_at,
                    profiles (
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fix: Supabase might return join as an array
            const formattedData = (data || []).map((item: any) => ({
                ...item,
                profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
            }));

            setLists(formattedData);
        } catch (err: any) {
            console.error('Lỗi fetch lists:', err);
            setError(err.message || 'Không thể tải danh sách từ vựng.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            console.error('Lỗi fetch profiles:', err);
            setError(err.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteList = async (listId: string, name: string) => {
        if (!confirm(`XÓA DANH SÁCH "${name}"? Thao tác này KHÔNG THỂ HOÀN TÁC.`)) return;
        try {
            await supabase.from('vocabularies').delete().eq('list_id', listId);
            const { error } = await supabase.from('lists').delete().eq('id', listId);
            if (error) throw error;
            setLists(lists.filter(l => l.id !== listId));
        } catch (error: any) {
            alert('Lỗi khi xóa danh sách: ' + error.message);
        }
    };

    const toggleAdminStatus = async (profileId: string, currentStatus: boolean, email: string) => {
        if (!confirm(`Bạn có chắc muốn ${currentStatus ? 'GỠ' : 'GÁN'} quyền Admin cho ${email}?`)) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: !currentStatus })
                .eq('id', profileId);
            if (error) throw error;
            setProfiles(profiles.map(p => p.id === profileId ? { ...p, is_admin: !currentStatus } : p));
        } catch (error: any) {
            alert('Lỗi khi cập nhật quyền: ' + error.message);
        }
    };

    const handleDeleteUser = async (profileId: string, email: string) => {
        if (!confirm(`XÓA NGƯỜI DÙNG ${email}? Toàn bộ dữ liệu của họ sẽ bị ảnh hưởng. Hãy cẩn trọng!`)) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', profileId);
            if (error) throw error;
            setProfiles(profiles.filter(p => p.id !== profileId));
        } catch (error: any) {
            alert('Lỗi khi xóa người dùng: ' + error.message);
        }
    };

    const filteredLists = lists.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProfiles = profiles.filter(p =>
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container py-8" style={{ maxWidth: '1000px' }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Hệ thống Quản trị</h1>
                </div>
                <button
                    className="btn btn-secondary flex items-center gap-2"
                    onClick={() => activeTab === 'lists' ? fetchAllLists() : fetchAllProfiles()}
                    disabled={loading}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Sub-tabs Navigation - Balanced & Consistent */}
            <div className="flex gap-4 border-b mb-6">
                <button
                    className={`pb-3 px-2 flex items-center gap-2 trans font-bold ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-primary'}`}
                    onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
                >
                    <Users size={18} />
                    Quản lý Người dùng
                </button>
                <button
                    className={`pb-3 px-2 flex items-center gap-2 trans font-bold ${activeTab === 'lists' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-primary'}`}
                    onClick={() => { setActiveTab('lists'); setSearchTerm(''); }}
                >
                    <ListIcon size={18} />
                    Quản lý Danh sách
                </button>
            </div>

            <div style={{ margin: '2.5rem 0' }}>
                <div className="flex gap-2 items-center bg-white border border-gray-200 rounded-lg px-4 py-1 shadow-sm">
                    <Search size={18} className="text-muted" />
                    <input
                        type="text"
                        className="input"
                        style={{ border: 'none', padding: '0.4rem 0', width: '100%', fontSize: '1rem' }}
                        placeholder={activeTab === 'lists' ? "Tìm kiếm..." : "Tìm kiếm người dùng..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="alert alert-danger mb-6 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="desktop-only" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-20 text-muted">
                            <RefreshCw size={32} className="animate-spin mx-auto mb-4 opacity-20" />
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
                                {activeTab === 'lists' ? (
                                    <tr>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Tên Danh Sách</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Chủ Sở Hữu</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Loại</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Ngày Tạo</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Thao Tác</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Vai Trò</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Ngày Tham Gia</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Thao Tác</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'lists' ? (
                                    filteredLists.map((list) => (
                                        <tr key={list.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-gray-50 trans">
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{list.name}</td>
                                            <td style={{ padding: '1rem' }}>{list.profiles?.email || 'Hệ thống'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px',
                                                    backgroundColor: list.type === 'base' ? '#eef2ff' : '#fff1f2',
                                                    color: list.type === 'base' ? 'var(--primary)' : 'var(--danger)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {list.type === 'base' ? 'BASE' : 'REVIEW'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                {new Date(list.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'left' }}>
                                                <button
                                                    className="btn btn-danger p-2"
                                                    onClick={() => handleDeleteList(list.id, list.name)}
                                                    title="Xóa danh sách"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    filteredProfiles.map((profile) => (
                                        <tr key={profile.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-gray-50 trans">
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{profile.email}</td>
                                            <td style={{ padding: '1rem' }}>
                                                {profile.is_admin ? (
                                                    <span className="flex items-center gap-1 text-primary font-bold text-xs">
                                                        <ShieldCheck size={14} /> ADMIN
                                                    </span>
                                                ) : (
                                                    <span className="text-muted text-xs">USER</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'left' }}>
                                                <div className="flex justify-start gap-2">
                                                    <button
                                                        className={`btn p-2 ${profile.is_admin ? 'btn-secondary' : 'btn-primary'}`}
                                                        title={profile.is_admin ? "Gỡ quyền Admin" : "Gán quyền Admin"}
                                                        onClick={() => toggleAdminStatus(profile.id, profile.is_admin, profile.email)}
                                                    >
                                                        {profile.is_admin ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                                    </button>
                                                    <button
                                                        className="btn btn-danger p-2"
                                                        title="Xóa người dùng"
                                                        onClick={() => handleDeleteUser(profile.id, profile.email)}
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Mobile view - Cards */}
                <div className="mobile-only" style={{ padding: '1rem' }}>
                    {loading ? (
                        <div className="text-center py-10 text-muted">Đang tải...</div>
                    ) : activeTab === 'lists' ? (
                        filteredLists.map((list) => (
                            <div key={list.id} className="mobile-card">
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Danh sách</span>
                                    <span className="mobile-card-value">{list.name}</span>
                                </div>
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Chủ sở hữu</span>
                                    <span className="mobile-card-value text-xs">{list.profiles?.email || 'Hệ thống'}</span>
                                </div>
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Loại / Ngày tạo</span>
                                    <span className="mobile-card-value text-xs">
                                        {list.type.toUpperCase()} - {new Date(list.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div className="mobile-card-row" style={{ borderBottom: 'none', paddingTop: '1rem' }}>
                                    <span className="mobile-card-label">Hành động</span>
                                    <button className="btn btn-danger py-1 px-3" onClick={() => handleDeleteList(list.id, list.name)}>
                                        <Trash2 size={16} /> Xóa
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        filteredProfiles.map((profile) => (
                            <div key={profile.id} className="mobile-card">
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Email</span>
                                    <span className="mobile-card-value">{profile.email}</span>
                                </div>
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Vai trò</span>
                                    <span className="mobile-card-value">
                                        {profile.is_admin ? (
                                            <span className="text-primary font-bold">ADMIN</span>
                                        ) : (
                                            <span className="text-muted">USER</span>
                                        )}
                                    </span>
                                </div>
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Tham gia</span>
                                    <span className="mobile-card-value text-xs">
                                        {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div className="mobile-card-row" style={{ borderBottom: 'none', paddingTop: '1rem' }}>
                                    <span className="mobile-card-label">Hành động</span>
                                    <div className="flex gap-2">
                                        <button
                                            className={`btn py-1 px-3 ${profile.is_admin ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={() => toggleAdminStatus(profile.id, profile.is_admin, profile.email)}
                                        >
                                            {profile.is_admin ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                            {profile.is_admin ? 'Gỡ Admin' : 'Hạ Admin'}
                                        </button>
                                        <button className="btn btn-danger py-1 px-3" onClick={() => handleDeleteUser(profile.id, profile.email)}>
                                            <UserMinus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                </div>
                {!loading && (activeTab === 'lists' ? filteredLists : filteredProfiles).length === 0 && (
                    <div className="p-12 text-center text-muted">Không tìm thấy dữ liệu phù hợp.</div>
                )}
            </div>
        </div>
    );
}
