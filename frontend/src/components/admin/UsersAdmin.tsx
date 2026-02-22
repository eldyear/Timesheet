import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

interface User {
    id: number;
    username: string;
    role_id: number;
    dept_id: number | null;
    employee_id: number | null;
}

interface Role {
    id: number;
    name: string;
    can_manage_settings: boolean;
}

interface Department {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    full_name: string;
}

export default function UsersAdmin() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User> & { password?: string }>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, deptsRes, rolesRes, empsRes] = await Promise.all([
                apiFetch('/api/users'),
                apiFetch('/api/departments'),
                apiFetch('/api/roles'),
                apiFetch('/api/employees')
            ]);
            const usersData = await usersRes.json();
            const deptsData = await deptsRes.json();
            const rolesData = await rolesRes.json();
            const empsData = await empsRes.json();
            setUsers(usersData);
            setDepartments(deptsData);
            setRoles(rolesData);
            setEmployees(empsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setCurrentUser({ ...user, password: '' }); // Don't show existing password
        } else {
            setCurrentUser({ username: '', role_id: roles.length > 0 ? roles[0].id : 1, dept_id: null, employee_id: null, password: '' });
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentUser.id
            ? `/api/users/${currentUser.id}`
            : '/api/users';
        const method = currentUser.id ? 'PUT' : 'POST';

        // Prepare payload
        const payload = { ...currentUser };
        if (!payload.password) {
            delete payload.password; // Don't send empty passwords on update
        }
        if (!payload.dept_id || isNaN(Number(payload.dept_id))) {
            payload.dept_id = null;
        } else {
            payload.dept_id = Number(payload.dept_id);
        }

        if (!payload.employee_id || isNaN(Number(payload.employee_id))) {
            payload.employee_id = null;
        } else {
            payload.employee_id = Number(payload.employee_id);
        }

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setModalOpen(false);
                loadData();
            } else {
                const errData = await res.json();
                alert(`Error saving user: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error. Could not save user.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadData();
            } else {
                const errData = await res.json();
                alert(`Error deleting user: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error. Could not delete user.");
        }
    };

    if (loading) return <div className="p-6">Loading users...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">User Management</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                    + Add User
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200">ID</th>
                            <th className="px-6 py-3 border-b border-slate-200">Username</th>
                            <th className="px-6 py-3 border-b border-slate-200">Role</th>
                            <th className="px-6 py-3 border-b border-slate-200">Department</th>
                            <th className="px-6 py-3 border-b border-slate-200">Employee</th>
                            <th className="px-6 py-3 border-b border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => {
                            const dept = departments.find(d => d.id === u.dept_id);
                            const userRole = roles.find(r => r.id === u.role_id);
                            const emp = employees.find(e => e.id === u.employee_id);
                            return (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-slate-500">#{u.id}</td>
                                    <td className="px-6 py-3 font-medium text-slate-800">{u.username}</td>
                                    <td className="px-6 py-3 text-slate-600 capitalize">{userRole ? userRole.name : '-'}</td>
                                    <td className="px-6 py-3 text-slate-600">{dept ? dept.name : '-'}</td>
                                    <td className="px-6 py-3 text-slate-600">{emp ? emp.full_name : '-'}</td>
                                    <td className="px-6 py-3">
                                        <button onClick={() => handleOpenModal(u)} className="text-indigo-600 hover:text-indigo-900 font-medium mr-3">Edit</button>
                                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                        {users.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-slate-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{currentUser.id ? 'Edit User' : 'New User'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input required type="text" value={currentUser.username || ''} onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password {currentUser.id && <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>}
                                </label>
                                <input type="password" required={!currentUser.id} value={currentUser.password || ''} onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select required value={currentUser.role_id || ''} onChange={e => setCurrentUser({ ...currentUser, role_id: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            {(!roles.find(r => r.id === currentUser.role_id)?.can_manage_settings) && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Linked Employee</label>
                                        <select value={currentUser.employee_id || ''} onChange={e => setCurrentUser({ ...currentUser, employee_id: Number(e.target.value) || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                            <option value="">-- None --</option>
                                            {employees.map(e => (
                                                <option key={e.id} value={e.id}>{e.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fallback Department</label>
                                        <select value={currentUser.dept_id || ''} onChange={e => setCurrentUser({ ...currentUser, dept_id: Number(e.target.value) || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                            <option value="">-- None --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition shadow-sm">Save User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
