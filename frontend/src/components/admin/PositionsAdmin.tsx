import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

interface Position {
    id: number;
    name: string;
}

export default function PositionsAdmin() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [current, setCurrent] = useState<Partial<Position>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/positions');
            if (res.ok) setPositions(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const openModal = (pos?: Position) => {
        setCurrent(pos ?? { name: '' });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = current.id
            ? `/api/positions/${current.id}`
            : '/api/positions';
        const method = current.id ? 'PUT' : 'POST';
        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: current.name })
            });
            if (res.ok) {
                setModalOpen(false);
                loadData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this position? It must have no assigned employees.')) return;
        try {
            const res = await apiFetch(`/api/positions/${id}`, { method: 'DELETE' });
            if (res.ok) loadData();
            else {
                const err = await res.json();
                alert(`Error: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Network error');
        }
    };

    if (loading) return <div className="p-6 text-slate-500">Loading positions...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">Position Management</h2>
                <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                    + Add Position
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200">ID</th>
                            <th className="px-6 py-3 border-b border-slate-200">Position Name</th>
                            <th className="px-6 py-3 border-b border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {positions.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-slate-400">#{p.id}</td>
                                <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                                <td className="px-6 py-3">
                                    <button onClick={() => openModal(p)} className="text-indigo-600 hover:text-indigo-900 font-medium mr-4">Edit</button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {positions.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No positions yet. Add one to get started.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{current.id ? 'Edit Position' : 'New Position'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Position Name</label>
                                <input
                                    required
                                    type="text"
                                    value={current.name || ''}
                                    onChange={e => setCurrent({ ...current, name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Senior Engineer"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition shadow-sm">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
