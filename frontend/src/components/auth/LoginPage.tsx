import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (!res.ok) {
                throw new Error(t('auth.error'));
            }

            const data = await res.json();
            // The AuthContext useEffect handles decoding the token and setting the actual user state
            login(data.access_token, { username: '', role: { id: 0, name: '', can_manage_settings: false, can_edit_all: false, can_view_all: false, can_view_only: true, can_view_finance: false, can_edit_finance: false, can_export: false, can_manage_employees: false, can_manage_users: false, can_manage_departments: false }, dept_id: null });
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 text-indigo-600 text-5xl text-center font-black">⌚</div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">{t('auth.title')}</h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg text-center font-medium">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('auth.username')}</label>
                            <div className="mt-1">
                                <input value={username} onChange={e => setUsername(e.target.value)} type="text" required className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('auth.password')}</label>
                            <div className="mt-1">
                                <input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <button type="submit" className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors cursor-pointer">
                                {t('auth.signIn')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
