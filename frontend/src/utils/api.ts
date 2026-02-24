// Получаем адрес бэкенда из переменных окружения Vercel или используем локальный для разработки
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = 'https://timesheet-1gzd.onrender.com';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Склеиваем базу и эндпоинт. 
    // Если endpoint уже начинается с http, используем его как есть, иначе добавляем базу.
    const fullUrl = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    console.log("DEBUG: Отправляю запрос на:", fullUrl);

    const response = await fetch(fullUrl, { ...options, headers });

    if (response.status === 401 && !fullUrl.includes('/auth/login')) {
        localStorage.removeItem('token');
        window.location.reload();
    }

    return response;
};
