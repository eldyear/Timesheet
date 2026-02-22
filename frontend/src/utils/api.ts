export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && !url.includes('/auth/login')) {
        // Token expired or invalid, force logout
        localStorage.removeItem('token');
        window.location.reload();
    }

    return response;
};
