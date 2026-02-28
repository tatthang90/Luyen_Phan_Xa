import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, List as ListIcon, History, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';

export default function MainLayout() {
    const { session, signOut, isAdmin } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { name: 'Tổng quan', path: '/dashboard', icon: <Home size={20} /> },
        { name: 'Tất cả Danh sách', path: '/lists-manager', icon: <ListIcon size={20} /> },
        { name: 'Lịch sử', path: '/history', icon: <History size={20} /> },
    ];

    if (isAdmin) {
        navItems.push({ name: 'Quản trị', path: '/admin', icon: <Shield size={20} /> });
    }

    return (
        <div className="app-container">
            {/* Mobile Topbar - ONLY on Mobile */}
            {isMobile && (
                <div className="mobile-topbar" style={{ display: 'flex' }}>
                    <div className="flex items-center gap-2">
                        {pathname !== '/dashboard' && (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="btn"
                                style={{ padding: '0.4rem', background: 'none', border: 'none', color: 'inherit' }}
                            >
                                <Home size={24} />
                            </button>
                        )}
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 0 }}>Luyện Phản Xạ</h2>
                    </div>
                    <button onClick={signOut} className="btn text-muted" style={{ padding: '0.5rem' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            )}

            {/* Desktop Sidebar - ONLY on Desktop */}
            {!isMobile && (
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Luyện Phản Xạ</h1>
                        <span className="text-muted" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {session?.user?.email}
                        </span>
                    </div>

                    <nav className="sidebar-nav">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${pathname.includes(item.path) && item.path !== '/' ? 'active' : ''}`}
                                style={{ textDecoration: 'none' }}
                            >
                                {item.icon}
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <button
                            onClick={signOut}
                            className="nav-item w-full"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
                        >
                            <LogOut size={20} />
                            Đăng xuất
                        </button>
                    </div>
                </aside>
            )}

            {/* Mobile Bottom Navigation - ONLY on Mobile */}
            {isMobile && (
                <nav className="mobile-bottom-nav" style={{ display: 'flex' }}>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`mobile-nav-item ${pathname.includes(item.path) && item.path !== '/' ? 'active' : ''}`}
                            style={{ textDecoration: 'none' }}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            )}

            {/* Main Content Area */}
            <main className="main-content" style={{ marginLeft: isMobile ? 0 : 'var(--sidebar-width)' }}>
                <Outlet />
            </main>
        </div>
    );
}
