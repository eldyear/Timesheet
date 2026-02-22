import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/api';

// Helper to determine text color (black or white) based on background hex
function getContrastYIQ(hexcolor: string) {
    if (!hexcolor) return '#1e293b'; // slate-800 default
    // Remove hash if exists
    hexcolor = hexcolor.replace('#', '');
    // Convert to RGB
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    // YIQ equation from W3C
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff'; // slate-800 or white
}

// Models matching Backend API
interface WorkCode {
    id: number;
    code: string;
    label: string;
    hours_standard: number;
    hours_night: number;
    color_hex: string;
}

interface Department {
    id: number;
    name: string;
    parent_id: number | null;
    category: number;
}

interface Employee {
    id: number;
    full_name: string;
    tab_number: string;
    category: number;
    position_id: number | null;
    position: { id: number; name: string } | null;
    dept_id: number;
}

interface TimesheetGridProps {
    departmentId: number;
    month: string; // YYYY-MM
}

export default function TimesheetGrid({ departmentId, month }: TimesheetGridProps) {
    const { t } = useTranslation();
    const [workCodes, setWorkCodes] = useState<WorkCode[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [timesheetData, setTimesheetData] = useState<Record<number, Record<number, number | null>>>({});
    const [daysInMonth, setDaysInMonth] = useState<number>(31);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [changes, setChanges] = useState<{ employee_id: number, date: string, work_code_id: number | null }[]>([]);
    const [activeCell, setActiveCell] = useState<{ empId: number, day: number } | null>(null);
    const [selectedCells, setSelectedCells] = useState<{ empId: number, day: number }[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ empId: number, day: number } | null>(null);
    const [history, setHistory] = useState<{ employee_id: number, date: string, work_code_id: number | null }[][]>([]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    // Close active cell dropdown if clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveCell(null);
            setSelectedCells([]);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global drag end
    useEffect(() => {
        const handleMouseUp = () => setIsDragging(false);
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);



    const loadData = useCallback(async () => {
        if (!departmentId || !month) return;

        setLoading(true);
        setChanges([]); // Reset tracking on load

        try {
            const [timesheetRes, workCodesRes, deptsRes] = await Promise.all([
                apiFetch(`/api/timesheet/${departmentId}/${month}`),
                apiFetch('/api/work-codes'),
                apiFetch('/api/departments')
            ]);

            if (!timesheetRes.ok || !workCodesRes.ok || !deptsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const timesheetDataRaw = await timesheetRes.json();
            const workCodesDataRaw = await workCodesRes.json();
            const deptsDataRaw = await deptsRes.json();

            const sortedEmployees = timesheetDataRaw.employees.sort((a: Employee, b: Employee) => (a.category ?? 99) - (b.category ?? 99));
            setEmployees(sortedEmployees);
            setDepartments(deptsDataRaw);
            setTimesheetData(timesheetDataRaw.timesheet);
            setDaysInMonth(timesheetDataRaw.days_in_month);
            setWorkCodes(workCodesDataRaw); // Set work codes here
        } catch (err: any) {
            console.error("Error loading timesheet or work codes:", err);
        } finally {
            setLoading(false);
        }
    }, [departmentId, month]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const DATES = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleCellChange = (employeeId: number, day: number, codeIdStr: string) => {
        const codeId = codeIdStr ? parseInt(codeIdStr, 10) : null;
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;

        // СОХРАНЯЕМ В ИСТОРИЮ перед изменением
        setHistory(prev => [...prev, [...changes]].slice(-20)); // Храним последние 20 шагов

        // Обновляем визуальное состояние (сетку)
        setTimesheetData(prev => ({
            ...prev,
            [employeeId]: { ...(prev[employeeId] || {}), [day]: codeId }
        }));

        // Записываем изменение
        setChanges(prev => {
            const existingIdx = prev.findIndex(c => c.employee_id === employeeId && c.date === dateStr);
            const updated = [...prev];
            if (existingIdx >= 0) {
                updated[existingIdx].work_code_id = codeId;
            } else {
                updated.push({ employee_id: employeeId, date: dateStr, work_code_id: codeId });
            }
            return updated;
        });
    };

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;

        // Берем последнее состояние из истории
        const lastHistoryItem = history[history.length - 1];

        // Откатываем визуальное состояние таблицы (TimesheetData)
        // Нам нужно вернуть старое значение для этой ячейки. 
        // Это сложнее, поэтому самый надежный способ — loadData(), 
        // но если вы хотите мгновенно, нужно хранить старые значения ячеек.

        setChanges(lastHistoryItem);
        setHistory(prev => prev.slice(0, -1));

        // Временное решение: перезагружаем данные, чтобы сетка синхронизировалась
        loadData();
    }, [history, loadData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    const handleSave = async () => {
        if (changes.length === 0) return;

        setSaving(true);
        try {
            const payload = { updates: changes };
            const res = await apiFetch('/api/timesheet/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setChanges([]);
            } else {
                console.error("Failed to save changes");
            }
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setSaving(false);
        }
    };

    const getTotals = (employeeId: number) => {
        let standard = 0;
        let night = 0;
        const employeeData = timesheetData[employeeId] || {};

        Object.values(employeeData).forEach(codeId => {
            if (codeId) {
                const codeInfo = workCodes.find(c => c.id === codeId);
                if (codeInfo) {
                    standard += codeInfo.hours_standard;
                    night += codeInfo.hours_night;
                }
            }
        });
        return { standard, night, total: standard + night };
    };

    const renderEmployeeRow = (emp: Employee) => {
        const totals = getTotals(emp.id);

        return (
            <tr key={emp.id} className="bg-white hover:bg-slate-50/80 group transition-colors border-b border-slate-300">
                {/* Sticky First Column */}
                <td className="px-4 py-2 border border-slate-300 sticky left-0 bg-white group-hover:bg-slate-50/80 z-30 shadow-[1px_0_0_0_#cbd5e1] max-w-[220px]">
                    <div className="flex flex-col">
                        {/* Добавляем truncate и title для всплывающей подсказки */}
                        <span
                            className="font-semibold text-slate-900 tracking-tight leading-snug truncate"
                            title={emp.full_name}
                        >
                            {emp.full_name}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-none truncate" title={emp.position?.name ?? ''}>
                            {emp.position?.name ?? '—'} • {emp.tab_number}
                        </span>
                    </div>
                </td>

                {/* Dynamic Date Cells */}
                {DATES.map(day => {
                    const currentCodeId = timesheetData[emp.id]?.[day] || null;
                    const workCode = workCodes.find(c => c.id === currentCodeId);

                    // Tailwind coloring mapping based on specific codes
                    let colorClass = 'hover:bg-slate-50/80';
                    if (workCode) {
                        switch (workCode.code) {
                            case 'Д': colorClass = 'bg-yellow-100 text-yellow-900 border-yellow-200'; break;
                            case 'Н': colorClass = 'bg-purple-100 text-purple-900 border-purple-200'; break;
                            case 'О': colorClass = 'bg-green-100 text-green-900 border-green-200'; break;
                            case 'К': colorClass = 'bg-blue-100 text-blue-900 border-blue-200'; break;
                            case '8': colorClass = 'bg-slate-50 text-slate-800 border-slate-200'; break;
                            default: colorClass = 'bg-slate-50 text-slate-800 border-slate-200'; break;
                        }
                    }

                    const isActive = activeCell?.empId === emp.id && activeCell?.day === day;
                    const isSelected = selectedCells.some(c => c.empId === emp.id && c.day === day);

                    const [yStr, mStr] = month.split('-');
                    const dateObj = new Date(parseInt(yStr), parseInt(mStr) - 1, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    // Базовые стили
                    let cellClass = 'border border-slate-300 p-0 relative min-w-[48px] h-[50px] transition-all duration-75';

                    // 1. ЛОГИКА ВЫДЕЛЕНИЯ (Selection + Active)
                    if (isSelected || isActive) {
                        // Общий фон для всего диапазона (включая ту, что под курсором)
                        cellClass += ' z-20 bg-indigo-50/40 ring-inset';

                        if (isActive) {
                            // Ячейка непосредственно под курсором — жирная рамка
                            cellClass += ' z-[60] ring-2 ring-indigo-600';
                        } else {
                            // Остальные ячейки в выделении — рамка потоньше
                            cellClass += ' ring-2 ring-indigo-300';
                        }
                    } else {
                        // 2. ЛОГИКА ОБЫЧНОГО СОСТОЯНИЯ И HOVER
                        cellClass += ' z-10 hover:z-30 hover:ring-2 hover:ring-amber-400/50 hover:ring-inset hover:bg-amber-50/40';
                    }

                    // 3. ПРИОРИТЕТ ЦВЕТА КОДА (Д, Н, 8 и т.д.)
                    if (workCode) {
                        cellClass += ` ${colorClass}`;
                    } else if (!isSelected && !isActive) {
                        // Белый фон только если ячейка "пустая" и не тронута выделением
                        cellClass += ' bg-white';
                    }

                    return (
                        <td
                            key={day}
                            className={cellClass}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (e.button !== 0) return; // Must be left click

                                if (e.ctrlKey || e.metaKey) {
                                    setSelectedCells(prev => {
                                        if (prev.length > 0 && prev[0].empId !== emp.id) {
                                            return [{ empId: emp.id, day }];
                                        }
                                        const exists = prev.some(c => c.day === day);
                                        if (exists) return prev.filter(c => c.day !== day);
                                        return [...prev, { empId: emp.id, day }];
                                    });
                                    setActiveCell({ empId: emp.id, day });
                                } else {
                                    const isAlreadySelected = selectedCells.some(c => c.empId === emp.id && c.day === day);

                                    if (isAlreadySelected && selectedCells.length > 1) {
                                        setActiveCell({ empId: emp.id, day });
                                    } else if (isAlreadySelected && selectedCells.length === 1 && isActive) {
                                        setActiveCell(null);
                                        setSelectedCells([]);
                                    } else {
                                        setIsDragging(true);
                                        setDragStart({ empId: emp.id, day });
                                        setSelectedCells([{ empId: emp.id, day }]);
                                        setActiveCell({ empId: emp.id, day });
                                    }
                                }
                            }}
                            onMouseEnter={() => {
                                if (isDragging && dragStart && dragStart.empId === emp.id) {
                                    const minDate = Math.min(dragStart.day, day);
                                    const maxDate = Math.max(dragStart.day, day);
                                    const newSelection = [];
                                    for (let d = minDate; d <= maxDate; d++) {
                                        newSelection.push({ empId: emp.id, day: d });
                                    }
                                    setSelectedCells(newSelection);
                                    setActiveCell({ empId: emp.id, day });
                                }
                            }}
                        >
                            {/* Glass weekend overlay */}
                            {isWeekend && <div className="absolute inset-0 bg-blue-400/10 pointer-events-none z-[5] border-x border-blue-200" />}
                            <div className="w-full h-full flex items-center justify-center cursor-pointer text-sm font-bold select-none outline-none focus:ring-2 focus:ring-indigo-500" tabIndex={0}>
                                {workCode ? workCode.code : ''}
                                {isSelected && !isActive && <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none"></div>}
                            </div>

                            {isActive && (
                                <div
                                    className="absolute top-[105%] left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-2xl rounded-lg py-1 flex flex-col min-w-[50px] max-h-[220px] overflow-y-auto z-[100] animate-in fade-in zoom-in-95 duration-100"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        className="px-3 py-2 hover:bg-slate-100 text-sm font-bold text-slate-400 border-b border-slate-100"
                                        onClick={() => {
                                            const cellsToUpdate = selectedCells.length > 0 && selectedCells[0].empId === emp.id ? selectedCells : [{ empId: emp.id, day }];
                                            cellsToUpdate.forEach(cell => handleCellChange(cell.empId, cell.day, ''));
                                            setActiveCell(null);
                                            setSelectedCells([]);
                                        }}
                                    >
                                        —
                                    </button>
                                    {workCodes.map(code => (
                                        <button
                                            key={code.id}
                                            className="px-3 py-2 transition-colors text-sm font-bold border-b border-white/20 last:border-0 hover:brightness-95"
                                            style={{
                                                backgroundColor: code.color_hex !== '#FFFFFF' ? code.color_hex : 'transparent',
                                                color: code.color_hex !== '#FFFFFF' ? getContrastYIQ(code.color_hex) : 'inherit'
                                            }}
                                            onClick={() => {
                                                const cellsToUpdate = selectedCells.length > 0 && selectedCells[0].empId === emp.id ? selectedCells : [{ empId: emp.id, day }];
                                                cellsToUpdate.forEach(cell => handleCellChange(cell.empId, cell.day, String(code.id)));
                                                setActiveCell(null);
                                                setSelectedCells([]);
                                            }}
                                        >
                                            {code.code}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </td>
                    );
                })}

                {/* Sticky Totals Footer Columns */}
                <td className="w-[70px] min-w-[70px] max-w-[70px] px-2 py-3 border border-slate-300 text-center font-semibold bg-blue-50/90 sticky right-[140px] z-30 text-blue-900 shadow-[-1px_0_0_0_#cbd5e1]">
                    {totals.standard > 0 ? totals.standard : '-'}
                </td>
                <td className="w-[70px] min-w-[70px] max-w-[70px] px-2 py-3 border border-slate-300 text-center font-semibold bg-indigo-50/90 sticky right-[70px] z-30 text-indigo-900 shadow-[-1px_0_0_0_#cbd5e1]">
                    {totals.night > 0 ? totals.night : '-'}
                </td>
                <td className="w-[70px] min-w-[70px] max-w-[70px] px-2 py-3 border border-slate-300 font-bold text-center bg-slate-100/90 sticky right-0 z-30 text-slate-800 text-base shadow-[-1px_0_0_0_#cbd5e1]">
                    {totals.total > 0 ? totals.total : '-'}
                </td>
            </tr>
        );
    };

    const handleExport = async () => {
        try {
            const res = await apiFetch(`/api/export/t13/${departmentId}/${month}`);
            if (!res.ok) {
                alert('Export failed. You may not have permission to export this department.');
                return;
            }
            const blob = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = `Timesheet_${departmentId}_${month}.xlsx`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert("Network error. Could not export Excel file.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-6 bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                    <div className="text-slate-500 font-medium">{t('grid.loading')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-white p-6 overflow-hidden rounded-xl shadow-sm border border-slate-200 font-sans text-slate-800">
            <div className="flex items-center justify-between mb-6">
                {/* ЛЕВАЯ ЧАСТЬ: Заголовок и подзаголовок */}
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('grid.gridTitle')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('grid.gridSubtitle')}</p>
                </div>

                {/* ПУСТОЕ ПРОСТРАНСТВО: flex-1 заставит правую часть уйти до упора вправо */}
                <div className="flex-1" />

                {/* ПРАВАЯ ЧАСТЬ: Все кнопки управления */}
                <div className="flex items-center space-x-3">
                    {/* Кнопки прокрутки */}
                    <div className="flex space-x-1 mr-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={scrollLeft} className="p-1.5 hover:bg-white text-slate-600 rounded-md transition-colors shadow-sm" title="Scroll Left">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button onClick={scrollRight} className="p-1.5 hover:bg-white text-slate-600 rounded-md transition-colors shadow-sm" title="Scroll Right">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>

                    {/* Счётчик изменений */}
                    {changes.length > 0 && (
                        <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-amber-500/30">
                            {t('grid.unsavedChanges')} ({changes.length})
                        </span>
                    )}

                    {/* КНОПКА ОТМЕНЫ (UNDO) */}
                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className={`flex items-center justify-center p-2.5 rounded-lg border transition-all shadow-sm ${history.length > 0
                            ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                            : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            }`}
                        title="Отменить (Ctrl+Z)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>

                    {/* КНОПКА СОХРАНИТЬ */}
                    <button
                        onClick={handleSave}
                        disabled={changes.length === 0 || saving}
                        className={`flex items-center justify-center px-5 py-2.5 font-semibold rounded-lg transition-all text-sm shadow-sm
                    ${changes.length > 0 && !saving
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200/50 outline-indigo-600'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                `}
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                {t('grid.saving')}
                            </>
                        ) : t('grid.saveChanges')}
                    </button>

                    {/* КНОПКА ЭКСПОРТ */}
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center px-4 py-2.5 font-semibold rounded-lg transition-colors text-sm shadow-sm ring-1 ring-inset ring-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    >
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                        {t('grid.downloadExcel')}
                    </button>
                </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-auto rounded-xl relative shadow-inner" ref={scrollContainerRef}>
                <table className="w-full text-sm text-left border-collapse border border-slate-300">
                    <thead className="text-xs text-slate-700 bg-slate-100 uppercase sticky top-0 z-40 shadow-sm border-b border-slate-300">
                        <tr>
                            <th className="px-4 py-3 border border-slate-300 sticky left-0 bg-slate-100 z-50 min-w-[200px] shadow-[1px_0_0_0_#cbd5e1]">
                                {t('grid.employeeDetails')}
                            </th>
                            {DATES.map(day => (
                                <th key={day} className="p-0 border border-slate-300 min-w-[48px] bg-slate-100 relative group">
                                    <div className="absolute inset-0 flex flex-col justify-between">
                                        <div className="flex-1 flex items-center justify-center font-bold text-slate-700">
                                            {day}
                                        </div>
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 border border-slate-300 bg-slate-100 text-center sticky right-[140px] z-50 shadow-[-1px_0_0_0_#cbd5e1]">
                                {t('grid.stdHours')}
                            </th>
                            <th className="px-4 py-3 border border-slate-300 bg-slate-100 text-center sticky right-[70px] z-50 shadow-[-1px_0_0_0_#cbd5e1]">
                                {t('grid.nightHours')}
                            </th>
                            <th className="px-4 py-3 border border-slate-300 bg-slate-100 text-center sticky right-0 z-50 shadow-[-1px_0_0_0_#cbd5e1]">
                                {t('grid.total')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={DATES.length + 4} className="p-12 text-center text-slate-500">
                                    <div className="mx-auto w-12 h-12 text-slate-300 mb-2">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                    <p className="font-medium text-slate-900">{t('grid.noEmployees')}</p>
                                    <p className="mt-1 text-sm">{t('grid.noEmployeesSub')}</p>
                                </td>
                            </tr>
                        ) : (
                            <>
                                {employees.filter(e => e.dept_id === departmentId).map(emp => renderEmployeeRow(emp))}

                                {departments
                                    .filter(d => employees.some(e => e.dept_id === d.id) && d.id !== departmentId)
                                    .sort((a, b) => (a.category ?? 99) - (b.category ?? 99))
                                    .map(dept => (
                                        <Fragment key={`dept-${dept.id}`}>
                                            <tr className="bg-slate-200">
                                                <td
                                                    colSpan={DATES.length + 4}
                                                    className="p-0 border-y border-slate-300 shadow-sm sticky left-0 z-30"
                                                >
                                                    {/* Здесь мы убираем отступы у td и переносим их во внутренний div.
                                                    Ширина div ограничивается шириной видимой области (viewport), 
                                                    чтобы текст не уезжал под правые колонки.
                                                    */}
                                                    <div className="px-4 py-2.5 sticky left-0 w-max max-w-[calc(100vw-450px)]">
                                                        <div className="flex items-center font-bold text-slate-800 whitespace-nowrap">
                                                            <svg className="w-4 h-4 mr-2 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                            <span className="truncate">
                                                                {departments.find(p => p.id === dept.parent_id)
                                                                    ? `${departments.find(p => p.id === dept.parent_id)?.name} » `
                                                                    : ''
                                                                }
                                                                {dept.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {employees.filter(e => e.dept_id === dept.id).map(emp => renderEmployeeRow(emp))}
                                        </Fragment>
                                    ))
                                }
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
