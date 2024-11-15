document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

    console.log('Estado inicial:', {
        tieneToken: !!token,
        userInfo: userInfo
    });

    if (!token || userInfo.rol !== 'profesor') {
        window.location.href = '/src/views/login.html';
        return;
    }

    const taskManager = new TaskManager();
    taskManager.init().catch(console.error);

    async function handleLogout() {
        console.log('Iniciando proceso de logout...');
        try {
            console.log('Token antes del logout:', localStorage.getItem('token'));
            console.log('UserInfo antes del logout:', sessionStorage.getItem('userInfo'));

            // Intentar logout en el servidor
            const response = await fetchWithAuth(`http://${SERVER_IP}:3000/api/logout`, {
                method: 'POST',
            });

            console.log('Respuesta del servidor:', {
                status: response?.status,
                ok: response?.ok
            });

            // Limpiar almacenamiento local
            console.log('Limpiando almacenamiento local...');
            localStorage.removeItem('token');
            sessionStorage.removeItem('userInfo');

            console.log('Estado después de limpiar:', {
                tokenDespués: localStorage.getItem('token'),
                userInfoDespués: sessionStorage.getItem('userInfo')
            });

            // Redirigir al login
            window.location.href = '/src/views/login.html';
        } catch (error) {
            console.error('Error durante el logout:', error);

            // En caso de error, limpiar de todos modos
            localStorage.removeItem('token');
            sessionStorage.removeItem('userInfo');
            window.location.href = '/src/views/login.html';
        }
    }

    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        console.log('Configurando botón de logout');
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en logout detectado');
            handleLogout();
        });
    } else {
        console.warn('No se encontró el botón de logout en el DOM');
    }
});

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    console.log('fetchWithAuth iniciado:', { url, método: options.method });

    if (!token) {
        console.warn('No hay token disponible para la petición');
        return null;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${ token }`,
            'Content-Type': 'application/json',
            ...options.headers
            }
        });

console.log('Respuesta de fetchWithAuth:', {
    status: response.status,
    ok: response.ok
});

if (response.status === 401) {
    console.warn('Token no válido o expirado');
    localStorage.removeItem('token');
    sessionStorage.removeItem('userInfo');
    window.location.href = '/src/views/login.html';
    return null;
}

return response;
    } catch (error) {
    console.error('Error en fetchWithAuth:', error);
    return null;
}
}
