import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserData {
    username: string;
    role: {
        id: number;
        name: string;
        can_manage_settings: boolean;
        can_edit_all: boolean;
        can_view_all: boolean;
        can_view_only: boolean;
        can_view_finance: boolean;
        can_edit_finance: boolean;
        can_export: boolean;
        can_manage_employees: boolean;
        can_manage_users: boolean;
        can_manage_departments: boolean;
    };
    dept_id: number | null;
}

interface AuthContextType {
    token: string | null;
    user: UserData | null;
    login: (token: string, user: UserData) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        if (token) {
            try {
                // Decode JWT to get user data
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const decoded = JSON.parse(jsonPayload);
                setUser({
                    username: decoded.sub,
                    role: decoded.role,
                    dept_id: decoded.dept_id
                });
            } catch (e) {
                console.error("Failed to decode token", e);
                logout();
            }
        }
    }, [token]);

    const login = (newToken: string, newUser: UserData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
