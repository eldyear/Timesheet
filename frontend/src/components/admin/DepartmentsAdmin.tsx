import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

// API Interface matching backend Pydantic Schema
interface Department {
    id: number;
    name: string;
    parent_id: number | null;
    category: number;
}

export default function DepartmentsAdmin() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState<Partial<Department>>({});

    const loadData = () => {
        setLoading(true);
        apiFetch('/api/departments')
            .then(res => res.json())
            .then(data => {
                setDepartments(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => { loadData(); }, []);

    const handleOpenModal = (dept?: Department) => {
        if (dept) {
            setCurrentDept(dept);
        } else {
            setCurrentDept({ name: '', parent_id: null, category: 99 });
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentDept.id
            ? `/api/departments/${currentDept.id}`
            : '/api/departments';
        const method = currentDept.id ? 'PUT' : 'POST';

        // Prepare payload - ensure parent_id is strictly null if empty
        const payload = { ...currentDept };
        if (!payload.parent_id || isNaN(Number(payload.parent_id))) {
            payload.parent_id = null;
        } else {
            payload.parent_id = Number(payload.parent_id);
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
                alert(`Error saving department: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error. Could not save department.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this department?\nNote: It must not have sub-departments or assigned employees.')) return;
        try {
            const res = await apiFetch(`/api/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadData();
            } else {
                const errData = await res.json();
                alert(`Error deleting department: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error. Could not delete department.");
        }
    };

    if (loading) return <div className="p-8">Loading Departments...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Departments Management</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors cursor-pointer">
                    + Add Department
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">ID</th>
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold">Sort Category</th>
                            <th className="px-6 py-4 font-semibold">Parent ID</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {departments.map((dept) => (
                            <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-medium">#{dept.id}</td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{dept.name}</td>
                                <td className="px-6 py-4 text-slate-500 font-medium">{dept.category ?? 99}</td>
                                <td className="px-6 py-4 text-slate-500">{dept.parent_id || <span className="text-slate-400 italic">Root</span>}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleOpenModal(dept)} className="text-indigo-600 hover:text-indigo-900 font-medium mr-4 cursor-pointer">Edit</button>
                                    <button onClick={() => handleDelete(dept.id)} className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {departments.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">No departments found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{currentDept.id ? 'Edit Department' : 'New Department'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
                                <input required type="text" value={currentDept.name || ''} onChange={e => setCurrentDept({ ...currentDept, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Department (Optional)</label>
                                <select value={currentDept.parent_id || ''} onChange={e => setCurrentDept({ ...currentDept, parent_id: Number(e.target.value) || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">-- None (Root Level) --</option>
                                    {departments.filter(d => d.id !== currentDept.id).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Select a parent department if this is a sub-division.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Category (1 = Top)</label>
                                <input required type="number" min="1" max="99" value={currentDept.category || 99} onChange={e => setCurrentDept({ ...currentDept, category: parseInt(e.target.value) || 99 })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition shadow-sm cursor-pointer">Save Department</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
