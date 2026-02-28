import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isAdmin: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', uid)
                .maybeSingle();

            if (error) throw error;
            setIsAdmin(data?.is_admin || false);
        } catch (err) {
            console.error('Lỗi fetch profile:', err);
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        // Lấy session hiện tại khi khởi động app
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            const currentUser = session?.user || null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfile(currentUser.id).finally(() => setIsLoading(false));
            } else {
                setIsAdmin(false);
                setIsLoading(false);
            }
        });

        // Lắng nghe sự kiện thay đổi trạng thái đăng nhập
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const currentUser = session?.user || null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ session, user, isAdmin, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
