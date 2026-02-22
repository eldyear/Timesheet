import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

interface WorkCode {
    id: number;
    code: string;
    label: string;
    hours_standard: number;
    hours_night: number;
    color_hex: string;
    rate_multiplier: number;
}

export default function WorkCodesAdmin() {
    const [codes, setCodes] = useState<WorkCode[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCode, setCurrentCode] = useState<Partial<WorkCode>>({});

    const loadData = () => {
        setLoading(true);
        apiFetch('/api/work-codes')
            .then(res => res.json())
            .then(data => {
                setCodes(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = currentCode.id ? 'PUT' : 'POST';
        const url = currentCode.id
            ? `/api/work-codes/${currentCode.id}`
            : '/api/work-codes';

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentCode)
            });
            if (res.ok) {
                setIsModalOpen(false);
                loadData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this work code?')) return;
        try {
            const res = await apiFetch(`/api/work-codes/${id}`, { method: 'DELETE' });
            if (res.ok) loadData();
            else {
                const errData = await res.json();
                alert(`Error deleting work code: ${errData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error. Could not delete work code.");
        }
    };

    const openModal = (code?: WorkCode) => {
        setCurrentCode(code || { code: '', label: '', hours_standard: 0, hours_night: 0, color_hex: '#FFFFFF', rate_multiplier: 1.0 });
        setIsModalOpen(true);
    };

    if (loading && codes.length === 0) return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Work Codes Dictionary</h2>
                <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors cursor-pointer">
                    + Add New Code
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Code</th>
                            <th className="px-6 py-4 font-semibold">Description</th>
                            <th className="px-6 py-4 font-semibold">Std Hrs</th>
                            <th className="px-6 py-4 font-semibold">Night Hrs</th>
                            <th className="px-6 py-4 font-semibold">Rate ×</th>
                            <th className="px-6 py-4 font-semibold">Color</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {codes.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{c.code}</td>
                                <td className="px-6 py-4 text-slate-700">{c.label}</td>
                                <td className="px-6 py-4 text-slate-600 font-medium">{c.hours_standard}</td>
                                <td className="px-6 py-4 text-slate-600 font-medium">{c.hours_night}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-amber-50 text-amber-800 font-mono text-xs font-bold px-2 py-0.5 rounded">{c.rate_multiplier ?? 1.0}×</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 rounded border border-slate-300 shadow-sm" style={{ backgroundColor: c.color_hex }}></div>
                                        <span className="text-slate-500 font-mono text-xs">{c.color_hex}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => openModal(c)} className="text-indigo-600 hover:text-indigo-900 font-medium cursor-pointer">Edit</button>
                                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Tailwind Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-slate-900">{currentCode.id ? 'Edit Work Code' : 'Add New Code'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 text-slate-700 text-sm">
                            <div>
                                <label className="block font-medium mb-1">Code Letter (e.g. 'Д')</label>
                                <input required type="text" maxLength={10} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentCode.code || ''} onChange={e => setCurrentCode({ ...currentCode, code: e.target.value })} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Label Description</label>
                                <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentCode.label || ''} onChange={e => setCurrentCode({ ...currentCode, label: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium mb-1">Std Hours</label>
                                    <input type="number" step="0.5" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={currentCode.hours_standard || 0} onChange={e => setCurrentCode({ ...currentCode, hours_standard: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block font-medium mb-1">Night Hours</label>
                                    <input type="number" step="0.5" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={currentCode.hours_night || 0} onChange={e => setCurrentCode({ ...currentCode, hours_night: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Color (Hex code)</label>
                                <div className="flex space-x-2">
                                    <input type="color" className="p-0 border-0 w-10 h-10 rounded cursor-pointer"
                                        value={currentCode.color_hex || '#FFFFFF'} onChange={e => setCurrentCode({ ...currentCode, color_hex: e.target.value })} />
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        value={currentCode.color_hex || '#FFFFFF'} onChange={e => setCurrentCode({ ...currentCode, color_hex: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Rate Multiplier <span className="text-slate-400 font-normal">(1.0 = standard, 1.5 = night, 2.0 = holiday)</span></label>
                                <input type="number" step="0.1" min="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                                    value={currentCode.rate_multiplier ?? 1.0} onChange={e => setCurrentCode({ ...currentCode, rate_multiplier: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm cursor-pointer">Save Code</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
