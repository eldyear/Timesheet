import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../utils/api';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#BE185D'];

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(n);

interface Department { id: number; name: string; }
interface Position { id: number; name: string; }
interface SalaryRate { id: number; dept_id: number; dept_name: string; position_id: number; position_name: string; hourly_rate: number; }
interface AuditLog { id: number; username: string; action: string; target: string; old_value: string | null; new_value: string | null; timestamp: string; }

interface EmployeePayroll {
    employee_id: number; full_name: string; tab_number: string; position: string; category: number;
    dept_id: number; dept_name: string; hourly_rate: number;
    std_hours: number; night_hours: number; total_hours: number; gross_pay: number;
}

interface PayrollData {
    year_month: string;
    employees: EmployeePayroll[];
    dept_summary: { dept_id: number; dept_name: string; total_pay: number; employees: number }[];
    grand_total: number;
    avg_salary: number;
    top_dept: string | null;
    top_dept_pay: number;
}

export default function FinanceDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [tab, setTab] = useState<'overview' | 'rates' | 'journal'>('overview');

    // Month selector — same rolling window as App.tsx
    const dynamicMonths = useMemo(() => {
        const now = new Date();
        return [-1, 0, 1].map(i => {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return { value: `${yyyy}-${mm}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
        });
    }, []);
    const [month, setMonth] = useState(dynamicMonths[1].value);

    // Payroll state
    const [payroll, setPayroll] = useState<PayrollData | null>(null);
    const [payrollLoading, setPayrollLoading] = useState(false);

    // Rate settings state
    const [rates, setRates] = useState<SalaryRate[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [rateForm, setRateForm] = useState({ dept_id: '', position_id: '', hourly_rate: '' });
    const [rateSaving, setRateSaving] = useState(false);

    // Audit log state
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    const canEditFinance = user?.role?.can_edit_finance || user?.role?.can_manage_settings;

    const loadPayroll = async () => {
        setPayrollLoading(true);
        try {
            const res = await apiFetch(`/api/finance/payroll/${month}`);
            if (res.ok) setPayroll(await res.json());
        } catch (e) { console.error(e); }
        finally { setPayrollLoading(false); }
    };

    const loadRates = async () => {
        const [rRes, dRes, pRes] = await Promise.all([
            apiFetch('/api/salary-rates'),
            apiFetch('/api/departments'),
            apiFetch('/api/positions'),
        ]);
        if (rRes.ok) setRates(await rRes.json());
        if (dRes.ok) setDepartments(await dRes.json());
        if (pRes.ok) setPositions(await pRes.json());
    };

    const loadAuditLog = async () => {
        setAuditLoading(true);
        try {
            const res = await apiFetch('/api/finance/audit-log');
            if (res.ok) setAuditLog(await res.json());
        } catch (e) { console.error(e); }
        finally { setAuditLoading(false); }
    };

    useEffect(() => { loadPayroll(); }, [month]);
    useEffect(() => { loadRates(); }, []);
    useEffect(() => {
        if (tab === 'journal' && canEditFinance) loadAuditLog();
    }, [tab]);

    const handleSaveRate = async (e: React.FormEvent) => {
        e.preventDefault();
        setRateSaving(true);
        try {
            const res = await apiFetch('/api/salary-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dept_id: Number(rateForm.dept_id),
                    position_id: Number(rateForm.position_id),
                    hourly_rate: parseFloat(rateForm.hourly_rate),
                })
            });
            if (res.ok) { loadRates(); setRateForm({ dept_id: '', position_id: '', hourly_rate: '' }); }
        } catch (e) { alert('Error saving rate'); }
        finally { setRateSaving(false); }
    };

    const handleDeleteRate = async (id: number) => {
        if (!confirm('Delete this rate?')) return;
        const res = await apiFetch(`/api/salary-rates/${id}`, { method: 'DELETE' });
        if (res.ok) loadRates();
    };

    const handleExport = () => {
        window.open(`/api/finance/payroll/${month}/export`, '_blank');
    };

    const navTabs: { key: 'overview' | 'rates' | 'journal'; label: string }[] = [
        { key: 'overview', label: t('finance.overview') },
        { key: 'rates', label: t('finance.rateSettings') },
        ...(canEditFinance ? [{ key: 'journal' as const, label: t('finance.journal') }] : []),
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('finance.title')}</h1>
                    <p className="text-sm text-slate-500 mt-1">{t('finance.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={month} onChange={e => setMonth(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
                    >
                        {dynamicMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        {t('finance.exportExcel')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {navTabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t.key
                            ? 'border-indigo-600 text-indigo-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ---- OVERVIEW TAB ---- */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {payrollLoading ? (
                        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" /></div>
                    ) : payroll ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: t('finance.totalPayroll'), value: fmt(payroll.grand_total), sub: `${payroll.employees.length} ${t('finance.employees')}`, color: 'bg-indigo-600' },
                                    { label: t('finance.avgSalary'), value: fmt(payroll.avg_salary), sub: t('finance.perEmployee'), color: 'bg-violet-600' },
                                    { label: t('finance.topDept'), value: payroll.top_dept ?? '—', sub: payroll.top_dept_pay ? `${fmt(payroll.top_dept_pay)} ${t('finance.grandTotal').toLowerCase()}` : t('finance.noData'), color: 'bg-blue-600' },
                                ].map(card => (
                                    <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
                                        <div className={`${card.color} rounded-lg p-2.5 flex-shrink-0`}>
                                            <div className="w-5 h-5 bg-white/30 rounded" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{card.label}</p>
                                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-tight">{card.value}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pie Chart */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">{t('finance.spendByDept')}</h3>
                                    {payroll.dept_summary.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie data={payroll.dept_summary.map(d => ({ name: d.dept_name, value: d.total_pay }))}
                                                    cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(((percent as number) || 0) * 100).toFixed(0)}%`}>
                                                    {payroll.dept_summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v: unknown) => fmt(Number(v ?? 0))} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-sm text-center py-12">{t('finance.noData')}</p>}
                                </div>

                                {/* Bar Chart */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">{t('finance.payByDept')}</h3>
                                    {payroll.dept_summary.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={payroll.dept_summary.map(d => ({ name: d.dept_name, pay: d.total_pay, headcount: d.employees }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip formatter={(v: unknown) => fmt(Number(v ?? 0))} />
                                                <Bar dataKey="pay" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Gross Pay" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-sm text-center py-12">{t('finance.noData')}</p>}
                                </div>
                            </div>

                            {/* Payroll Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">{t('finance.employeePayroll')}</h3>
                                    <span className="text-xs text-slate-400">{t('finance.grandTotal')}: <span className="font-bold text-slate-700">{fmt(payroll.grand_total)}</span></span>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                {[t('finance.employee'), t('employees.position'), t('finance.hourlyRate'), t('finance.stdHours'), t('finance.nightHours'), t('finance.totalHours'), t('finance.grossPay')].map(h => (
                                                    <th key={h} className="px-4 py-3 bg-slate-50">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        {(() => {
                                            const grouped = payroll.employees.reduce((acc, emp) => {
                                                const key = emp.dept_name || 'Unknown';
                                                if (!acc[key]) acc[key] = [];
                                                acc[key].push(emp);
                                                return acc;
                                            }, {} as Record<string, EmployeePayroll[]>);

                                            return Object.entries(grouped).map(([deptName, emps]) => (
                                                <tbody key={deptName} className="divide-y divide-slate-100">
                                                    {/* Department Header Row */}
                                                    <tr className="bg-slate-100/80 border-t-2 border-slate-200">
                                                        <td colSpan={7} className="px-4 py-2 text-sm font-bold text-slate-800 uppercase tracking-wide">
                                                            {deptName}
                                                        </td>
                                                    </tr>
                                                    {/* Employees in Department sorted by category */}
                                                    {emps
                                                        .sort((a, b) => (a.category ?? 99) - (b.category ?? 99))
                                                        .map(emp => (
                                                            <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-slate-900">{emp.full_name}</div>
                                                                    <div className="text-xs text-slate-400">{emp.tab_number}</div>
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {emp.position}
                                                                    {emp.category < 99 && <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wide font-bold">Tier {emp.category}</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 font-mono">{emp.hourly_rate > 0 ? fmt(emp.hourly_rate) : <span className="text-slate-300">—</span>}</td>
                                                                <td className="px-4 py-3 text-slate-600">{emp.std_hours}</td>
                                                                <td className="px-4 py-3 text-slate-600">{emp.night_hours > 0 ? <span className="text-indigo-600 font-medium">{emp.night_hours}</span> : emp.night_hours}</td>
                                                                <td className="px-4 py-3 font-semibold text-slate-700">{emp.total_hours}</td>
                                                                <td className="px-4 py-3 font-bold text-emerald-700">{emp.gross_pay > 0 ? fmt(emp.gross_pay) : <span className="text-slate-300 font-normal">—</span>}</td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            ));
                                        })()}
                                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                            <tr>
                                                <td colSpan={6} className="px-4 py-3 font-bold text-slate-700 text-right" >{t('finance.grandTotal')}</td>
                                                <td className="px-4 py-3 font-bold text-slate-900">{payroll.employees.reduce((s, e) => s + e.total_hours, 0).toFixed(1)}</td>
                                                <td className="px-4 py-3 font-extrabold text-emerald-700 text-base">{fmt(payroll.grand_total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 text-slate-400">{t('finance.failedLoad')}</div>
                    )}
                </div>
            )}

            {/* ---- RATE SETTINGS TAB ---- */}
            {tab === 'rates' && (
                <div className="space-y-6">
                    {canEditFinance && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-800 mb-4">{t('finance.setRate')}</h3>
                            <form onSubmit={handleSaveRate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">{t('admin.department')}</label>
                                    <select required value={rateForm.dept_id} onChange={e => setRateForm(f => ({ ...f, dept_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">Select dept…</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">{t('admin.position')}</label>
                                    <select required value={rateForm.position_id} onChange={e => setRateForm(f => ({ ...f, position_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">Select position…</option>
                                        {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">{t('finance.hourlyRate')}</label>
                                    <input required type="number" step="0.01" min="0" value={rateForm.hourly_rate}
                                        onChange={e => setRateForm(f => ({ ...f, hourly_rate: e.target.value }))}
                                        placeholder="e.g. 500.00"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <button type="submit" disabled={rateSaving}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50">
                                    {rateSaving ? t('finance.saving') : t('finance.saveRate')}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">{t('finance.rateTable')}</h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">{t('admin.department')}</th>
                                    <th className="px-6 py-3">{t('admin.position')}</th>
                                    <th className="px-6 py-3">{t('finance.hourlyRate')}</th>
                                    {canEditFinance && <th className="px-6 py-3">{t('admin.actions')}</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rates.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-800">{r.dept_name}</td>
                                        <td className="px-6 py-3 text-slate-600">{r.position_name}</td>
                                        <td className="px-6 py-3 font-bold text-emerald-700">{fmt(r.hourly_rate)}</td>
                                        {canEditFinance && (
                                            <td className="px-6 py-3">
                                                <button onClick={() => handleDeleteRate(r.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">{t('admin.delete')}</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {rates.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">{t('finance.noRates')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ---- JOURNAL TAB ---- */}
            {tab === 'journal' && canEditFinance && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-800">{t('finance.auditJournal')}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{t('finance.auditJournalSub')}</p>
                    </div>
                    {auditLoading ? (
                        <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-b-2 border-indigo-600 rounded-full" /></div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">{t('finance.timestamp')}</th>
                                    <th className="px-6 py-3">{t('finance.user')}</th>
                                    <th className="px-6 py-3">{t('finance.action')}</th>
                                    <th className="px-6 py-3">{t('finance.target')}</th>
                                    <th className="px-6 py-3">{t('finance.oldValue')}</th>
                                    <th className="px-6 py-3">{t('finance.newValue')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {auditLog.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{log.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                                        <td className="px-6 py-3 font-semibold text-indigo-700">{log.username}</td>
                                        <td className="px-6 py-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.action === 'UPDATE_RATE' ? 'bg-yellow-100 text-yellow-800' : log.action === 'CREATE_RATE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-700">{log.target}</td>
                                        <td className="px-6 py-3 text-slate-400 font-mono">{log.old_value ?? '—'}</td>
                                        <td className="px-6 py-3 font-semibold text-emerald-700 font-mono">{log.new_value ?? '—'}</td>
                                    </tr>
                                ))}
                                {auditLog.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">{t('finance.noAuditEvents')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
