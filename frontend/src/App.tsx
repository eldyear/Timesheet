import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TimesheetGrid from './components/TimesheetGrid';
import EmployeesAdmin from './components/admin/EmployeesAdmin';
import DepartmentsAdmin from './components/admin/DepartmentsAdmin';
import WorkCodesAdmin from './components/admin/WorkCodesAdmin';
import UsersAdmin from './components/admin/UsersAdmin';
import RolesAdmin from './components/admin/RolesAdmin';
import PositionsAdmin from './components/admin/PositionsAdmin';
import FinanceDashboard from './components/finance/FinanceDashboard';
import LoginPage from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';

const LANGS = [
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'kg', flag: '🇰🇬', label: 'KG' },
];

function LangSwitcher() {
  const { i18n: i18nHook } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => i18nHook.changeLanguage(l.code)}
          title={l.label}
          className={`text-sm font-semibold px-2 py-1 rounded-md transition-colors ${i18nHook.language.startsWith(l.code)
            ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
            : 'text-slate-500 hover:bg-slate-100'
            }`}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}

interface Department {
  id: number;
  name: string;
  parent_id: number | null;
}

function AppContent() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Чтобы не срабатывал выбор отдела при клике на стрелочку
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };
  const { token, user, logout } = useAuth();
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const dynamicMonths = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let i = -1; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      result.push({ value: `${yyyy}-${mm}`, label });
    }
    return result;
  }, []);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  // View state for Navigation (Timesheet vs Admin Panels)
  type ViewState = 'timesheet' | 'employees' | 'departments' | 'workcodes' | 'users' | 'roles' | 'positions' | 'finance';
  const [view, setView] = useState<ViewState>('timesheet');

  useEffect(() => {
    if (!token || !user) return; // Добавили проверку user

    apiFetch('/api/departments')
      .then(res => res.json())
      .then((data: Department[]) => { // Указываем тип данных здесь
        let filteredData = data;

        // СТРОГАЯ ПРОВЕРКА: Если не админ и есть привязка к отделу
        const isAdmin = user?.role?.can_manage_settings || user?.role?.can_view_all;

        if (!isAdmin && user?.dept_id) {
          // Превращаем в числа для надежности сравнения
          const userDeptId = Number(user.dept_id);
          const allowedIds = new Set<number>([userDeptId]);
          let added = true;

          // Рекурсивно собираем всех детей и внуков
          while (added) {
            added = false;
            data.forEach((d: Department) => { // Явно типизируем d
              const pId = d.parent_id ? Number(d.parent_id) : null;
              const selfId = Number(d.id);

              if (pId !== null && allowedIds.has(pId) && !allowedIds.has(selfId)) {
                allowedIds.add(selfId);
                added = true;
              }
            });
          }
          filteredData = data.filter((d: Department) => allowedIds.has(Number(d.id)));
        }

        setDepartments(filteredData);

        // Если текущий выбранный отдел не входит в список разрешенных - выбираем первый из доступных
        if (filteredData.length > 0) {
          const isSelectedValid = filteredData.some(d => d.id === selectedDeptId);
          if (!selectedDeptId || !isSelectedValid) {
            setSelectedDeptId(filteredData[0].id);
          }
        }
      })
      .catch(err => console.error("Error fetching departments:", err));
  }, [user, token]); // Убрали selectedDeptId из зависимостей, чтобы избежать бесконечного цикла

  const deptIds = new Set(departments.map(d => d.id));
  const rootNodes = departments.filter(d => d.parent_id === null || !deptIds.has(d.parent_id));

  const buildTreeFromRoots = (roots: Department[], allDepts: Department[]): any[] => {
    return roots.map(root => ({
      ...root,
      children: buildTreeFromRoots(allDepts.filter(d => d.parent_id === root.id), allDepts)
    }));
  };

  const deptTree = buildTreeFromRoots(rootNodes, departments);

  const renderTree = (nodes: any[], level = 0) => {
    return (
      <ul className={`space-y-1 ${level > 0 ? 'pl-4 mt-1 border-l border-slate-200/50' : ''}`}>
        {nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedIds.has(node.id);

          return (
            <li key={node.id}>
              <div className="flex items-center group">
                {/* Кнопка развертывания */}
                {hasChildren && (
                  <button
                    onClick={(e) => toggleExpand(node.id, e)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-transform"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {!hasChildren && level > 0 && <span className="w-5" />} {/* Отступ для листов без детей */}

                <button
                  className={`text-left flex-1 px-2 py-1.5 rounded-md text-sm transition-colors
                            ${selectedDeptId === node.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  onClick={() => setSelectedDeptId(node.id)}
                >
                  {node.name}
                </button>
              </div>

              {/* Рендерим детей только если узел развернут */}
              {hasChildren && isExpanded && renderTree(node.children, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  // If not logged in, show login page
  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 shrink-0">
        <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              T
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Timesheet</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">

          {/* Main Navigation Area */}
          <div className="px-4 space-y-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Главная</h2>
            <button
              onClick={() => setView('timesheet')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'timesheet' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t('nav.timesheet')}
            </button>
            <button
              onClick={() => setView('employees')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'employees' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t('nav.employees')}
            </button>
            {(user?.role?.can_view_finance || user?.role?.can_manage_settings) && (
              <button
                onClick={() => setView('finance')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'finance' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.finance')}
              </button>
            )}
          </div>

          {/* Department Tree Area */}
          <div className="px-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Структура</h2>
            {departments.length === 0 ? (
              <div className="text-sm text-slate-500 px-2 animate-pulse">Loading departments...</div>
            ) : (
              renderTree(deptTree)
            )}
          </div>

          {/* Administration Area */}
          {user?.role?.can_manage_settings && (
            <div className="px-4 space-y-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Администрирование</h2>
              <button
                onClick={() => setView('departments')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'departments' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.departments')}
              </button>
              <button
                onClick={() => setView('workcodes')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'workcodes' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.workCodes')}
              </button>
              <button
                onClick={() => setView('roles')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'roles' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.roleManager')}
              </button>
              <button
                onClick={() => setView('positions')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'positions' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.positions')}
              </button>
              <button
                onClick={() => setView('users')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'users' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t('nav.users')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 relative">

        {/* Minimal Header (Profile & Lang) */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0 h-[73px]">
          <div>
            {/* View Title */}
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {view === 'timesheet' ? t('nav.timesheet') :
                view === 'finance' ? t('nav.finance') :
                  view === 'employees' ? t('nav.employees') :
                    t('nav.admin')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {view === 'timesheet' && (
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hidden md:flex">
                <span className="text-sm font-medium text-slate-500">{t('grid.period')}:</span>
                <select
                  className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {dynamicMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            <LangSwitcher />

            <div className="flex items-center space-x-3 ml-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm font-medium text-slate-700 hidden sm:block">
                <span>{user?.username}</span>
              </div>
              <button onClick={logout} className="ml-2 hover:bg-red-50 text-red-500 p-2 rounded-lg transition-colors cursor-pointer" title={t('nav.logout')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area with OVERFLOW-Y-AUTO for smooth scrolling */}
        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
          {view === 'timesheet' ? (
            selectedDeptId ? (
              <TimesheetGrid departmentId={selectedDeptId} month={month} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm border-dashed min-h-[400px]">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-600">{t('grid.noDeptSelected')}</p>
                <p className="text-sm mt-1">{t('grid.selectDeptSub')}</p>
              </div>
            )
          ) : view === 'employees' ? (
            <EmployeesAdmin selectedDeptId={selectedDeptId} />
          ) : view === 'departments' && user?.role?.can_manage_settings ? (
            <DepartmentsAdmin />
          ) : view === 'workcodes' && user?.role?.can_manage_settings ? (
            <WorkCodesAdmin />
          ) : view === 'users' && user?.role?.can_manage_settings ? (
            <UsersAdmin />
          ) : view === 'roles' && user?.role?.can_manage_settings ? (
            <RolesAdmin />
          ) : view === 'positions' && user?.role?.can_manage_settings ? (
            <PositionsAdmin />
          ) : view === 'finance' && (user?.role?.can_view_finance || user?.role?.can_manage_settings) ? (
            <FinanceDashboard />
          ) : (
            <div className="p-12 text-center text-slate-500 font-medium">{t('grid.accessDenied')}</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
