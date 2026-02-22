import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

interface Position {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    full_name: string;
    tab_number: string;
    category: number;
    position_id: number | null;
    position: Position | null;
    dept_id: number;
}

interface Department {
    id: number;
    name: string;
}

export default function EmployeesAdmin({ selectedDeptId }: { selectedDeptId?: number | null }) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmp, setCurrentEmp] = useState<Partial<Employee>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const empUrl = selectedDeptId ? `/api/employees?dept_id=${selectedDeptId}` : '/api/employees';
            const [empRes, deptRes, posRes] = await Promise.all([
                apiFetch(empUrl),
                apiFetch('/api/departments'),
                apiFetch('/api/positions'),
            ]);
            setEmployees(await empRes.json());
            setDepartments(await deptRes.json());
            setPositions(await posRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [selectedDeptId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = currentEmp.id ? 'PUT' : 'POST';
        const url = currentEmp.id
            ? `/api/employees/${currentEmp.id}`
            : '/api/employees';

        // Only send the fields the API expects
        const payload = {
            full_name: currentEmp.full_name,
            tab_number: currentEmp.tab_number,
            category: currentEmp.category || 99,
            position_id: currentEmp.position_id || null,
            dept_id: currentEmp.dept_id,
        };

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                loadData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            const res = await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
            if (res.ok) loadData();
            else {
                const err = await res.json();
                alert(`Error deleting employee: ${err.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Could not delete employee.');
        }
    };

    const openModal = async (emp?: Employee) => {
        if (emp) {
            setCurrentEmp(emp);
        } else {
            // Auto-increment tab number for new employees
            let nextTab = '';
            try {
                const res = await apiFetch('/api/employees/next-tab-number');
                if (res.ok) {
                    const data = await res.json();
                    nextTab = data.next_tab_number || '';
                }
            } catch (e) {
                console.error('Could not fetch next tab number', e);
            }
            setCurrentEmp({ full_name: '', tab_number: nextTab, category: 99, position_id: null, dept_id: departments[0]?.id || 1 });
        }
        setIsModalOpen(true);
    };

    const getDeptName = (deptId: number) => {
        const d = departments.find(d => d.id === deptId);
        return d ? d.name : `Unknown (${deptId})`;
    };

    if (loading && employees.length === 0) return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Personnel Roster</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage all employees ({employees.length} total) across standard departments.</p>
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors cursor-pointer">
                    + Add Employee
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Tab Number</th>
                            <th className="px-6 py-4 font-semibold">Full Name</th>
                            <th className="px-6 py-4 font-semibold">Tier</th>
                            <th className="px-6 py-4 font-semibold">Position</th>
                            <th className="px-6 py-4 font-semibold">Department</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {employees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-mono font-medium">{emp.tab_number}</td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{emp.full_name}</td>
                                <td className="px-6 py-4 font-medium text-slate-800">{emp.category}</td>
                                <td className="px-6 py-4 text-slate-700">{emp.position?.name ?? <span className="text-slate-400 italic">—</span>}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                        {getDeptName(emp.dept_id)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => openModal(emp)} className="text-indigo-600 hover:text-indigo-900 font-medium cursor-pointer">Edit</button>
                                    <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-slate-900">{currentEmp.id ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 text-slate-700 text-sm">
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Full Name</label>
                                <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentEmp.full_name || ''} onChange={e => setCurrentEmp({ ...currentEmp, full_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Tab Number</label>
                                <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentEmp.tab_number || ''} onChange={e => setCurrentEmp({ ...currentEmp, tab_number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Category (1 = Highest Tier)</label>
                                <input required type="number" min="1" max="99" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentEmp.category || 99} onChange={e => setCurrentEmp({ ...currentEmp, category: parseInt(e.target.value) || 99 })} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Position</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    value={currentEmp.position_id ?? ''}
                                    onChange={e => setCurrentEmp({ ...currentEmp, position_id: e.target.value ? Number(e.target.value) : null })}
                                >
                                    <option value="">— No Position —</option>
                                    {positions.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block font-medium mb-1 text-slate-700">Department</label>
                                <select required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={currentEmp.dept_id || ''} onChange={e => setCurrentEmp({ ...currentEmp, dept_id: Number(e.target.value) })}>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm cursor-pointer">Save Employee</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
