import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

interface Role {
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
}

export default function RolesAdmin() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState<Partial<Role>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/roles');
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (role?: Role) => {
        if (role) {
            setCurrentRole(role);
        } else {
            setCurrentRole({ name: '', can_manage_settings: false, can_edit_all: false, can_view_all: false, can_view_only: true, can_view_finance: false, can_edit_finance: false, can_export: false, can_manage_employees: false, can_manage_users: false, can_manage_departments: false });
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentRole.id
            ? `/api/roles/${currentRole.id}`
            : '/api/roles';
        const method = currentRole.id ? 'PUT' : 'POST';

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentRole)
            });
            if (res.ok) {
                setModalOpen(false);
                loadData();
            } else {
                const errData = await res.json();
                alert(`Error saving role: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error. Could not save role.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this role? Generating orphans on Users is prohibited by the database schema.')) return;
        try {
            const res = await apiFetch(`/api/roles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadData();
            } else {
                const errData = await res.json();
                alert(`Error deleting role: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error. Could not delete role.");
        }
    };

    if (loading) return <div className="p-6">Loading roles...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">Role Management</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                    + Add Role
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200">ID</th>
                            <th className="px-6 py-3 border-b border-slate-200">Role Name</th>
                            <th className="px-6 py-3 border-b border-slate-200">Manage Settings</th>
                            <th className="px-6 py-3 border-b border-slate-200">Edit All</th>
                            <th className="px-6 py-3 border-b border-slate-200">View All</th>
                            <th className="px-6 py-3 border-b border-slate-200">View Only</th>
                            <th className="px-6 py-3 border-b border-slate-200">View Finance</th>
                            <th className="px-6 py-3 border-b border-slate-200">Edit Finance</th>
                            <th className="px-6 py-3 border-b border-slate-200">Export</th>
                            <th className="px-6 py-3 border-b border-slate-200">Employees</th>
                            <th className="px-6 py-3 border-b border-slate-200">Users</th>
                            <th className="px-6 py-3 border-b border-slate-200">Depts</th>
                            <th className="px-6 py-3 border-b border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {roles.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-slate-500">#{r.id}</td>
                                <td className="px-6 py-3 font-medium text-slate-800">{r.name}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_manage_settings ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_edit_all ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_view_all ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_view_only ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_view_finance ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_edit_finance ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_export ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_manage_employees ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_manage_users ? '✅' : '❌'}</td>
                                <td className="px-6 py-3 text-slate-600">{r.can_manage_departments ? '✅' : '❌'}</td>
                                <td className="px-6 py-3">
                                    <button onClick={() => handleOpenModal(r)} className="text-indigo-600 hover:text-indigo-900 font-medium mr-3">Edit</button>
                                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-slate-500">No roles found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{currentRole.id ? 'Edit Role' : 'New Role'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                                <input required type="text" value={currentRole.name || ''} onChange={e => setCurrentRole({ ...currentRole, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Lead Accountant" />
                            </div>

                            <div className="space-y-3 pt-2">
                                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Permissions</h4>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={currentRole.can_manage_settings || false} onChange={e => setCurrentRole({ ...currentRole, can_manage_settings: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-700">Can Manage Settings & Admin Data</span>
                                </label>

                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={currentRole.can_edit_all || false} onChange={e => setCurrentRole({ ...currentRole, can_edit_all: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-700">Can Edit All Employees/Timesheets</span>
                                </label>

                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={currentRole.can_view_all || false} onChange={e => setCurrentRole({ ...currentRole, can_view_all: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-700">Can View All Departments (Read-Only)</span>
                                </label>

                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={currentRole.can_view_only || false} onChange={e => setCurrentRole({ ...currentRole, can_view_only: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-700">View Only Mode</span>
                                </label>

                                <div className="pt-2 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Management & Export</h5>
                                    <div className="grid grid-cols-1 gap-2">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" checked={currentRole.can_export || false}
                                                onChange={e => setCurrentRole({ ...currentRole, can_export: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                            <span className="text-sm text-slate-700">Can Export to Excel</span>
                                        </label>
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" checked={currentRole.can_manage_employees || false}
                                                onChange={e => setCurrentRole({ ...currentRole, can_manage_employees: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                            <span className="text-sm text-slate-700">Manage Employees</span>
                                        </label>
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" checked={currentRole.can_manage_users || false}
                                                onChange={e => setCurrentRole({ ...currentRole, can_manage_users: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                            <span className="text-sm text-slate-700">Manage Users</span>
                                        </label>
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" checked={currentRole.can_manage_departments || false}
                                                onChange={e => setCurrentRole({ ...currentRole, can_manage_departments: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                            <span className="text-sm text-slate-700">Manage Departments</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Finance Permissions</h5>
                                    <label className="flex items-center space-x-3 cursor-pointer mb-2">
                                        <input type="checkbox" checked={currentRole.can_view_finance || false} onChange={e => setCurrentRole({ ...currentRole, can_view_finance: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                        <span className="text-sm text-slate-700">View Finance Page & Reports</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input type="checkbox" checked={currentRole.can_edit_finance || false} onChange={e => setCurrentRole({ ...currentRole, can_edit_finance: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                        <span className="text-sm text-slate-700">Edit Rates, Multipliers & View Audit Log</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition shadow-sm">Save Role</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
