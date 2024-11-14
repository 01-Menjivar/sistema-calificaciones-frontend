


document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

    if (!token || userInfo.rol !== 'director') {
        window.location.href = '/src/views/login.html';
        return;
    }

    // Elementos del menú
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const header = document.querySelector('.main-header');
    let isOpen = false;
    
    let users = [];
    let currentView = 'all';

    // Funciones de API
    async function fetchWithAuth(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('userInfo');
                window.location.href = '/login.html';
                return null;
            }

            return response;
        } catch (error) {
            console.error('Error en la petición:', error);
            return null;
        }
    }

    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
    
        if (!token) {
            console.log('No hay token disponible');
            window.location.href = '/login.html';
            return null;
        }
    
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
    
            if (response.status === 401) {
                console.log('Token no válido o expirado');
                localStorage.removeItem('token');
                sessionStorage.removeItem('userInfo');
                window.location.href = '/login.html';
                return null;
            }
    
            return response;
        } catch (error) {
            console.error('Error en fetchWithAuth:', error);
            return null;
        }
    }
    
    // Función de carga de usuarios actualizada
    async function loadUsers() {
        try {
            console.log('Iniciando carga de usuarios');
            const response = await fetchWithAuth(`http://${SERVER_IP}:3000/api/listusers`);
            
            if (!response) {
                console.log('No se recibió respuesta');
                return;
            }
    
            const data = await response.json();
            console.log('Datos recibidos:', data);
    
            if (response.ok) {
                users = Array.isArray(data) ? data : [];
                renderUsersTable();
            } else {
                showNotification(data.error || 'Error al cargar usuarios', 'error');
            }
        } catch (error) {
            console.error('Error en loadUsers:', error);
            showNotification('Error al cargar usuarios', 'error');
        }
    }

    async function addUser(userData) {
        try {
            const response = await fetchWithAuth(`http://${SERVER_IP}:3000/api/registerallkindausers`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response) {
                const data = await response.json();
                if (response.ok) {
                    showNotification('Usuario agregado exitosamente', 'success');
                    await loadUsers();
                } else {
                    showNotification(data.error || 'Error al agregar usuario', 'error');
                }
            }
        } catch (error) {
            showNotification('Error al agregar usuario', 'error');
        }
    }

    async function updateUser(userId, userData, userType) {
        const endpoint = userType === 'profesor' ? 
            `http://${SERVER_IP}:3000/api/professors/edit/${userId}` : 
            `http://${SERVER_IP}:3000/api/students/edit/${userId}`;

        try {
            const response = await fetchWithAuth(endpoint, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });

            if (response) {
                const data = await response.json();
                if (response.ok) {
                    showNotification(`${userType} actualizado exitosamente`, 'success');
                    await loadUsers();
                } else {
                    showNotification(data.error || 'Error al actualizar usuario', 'error');
                }
            }
        } catch (error) {
            showNotification('Error al actualizar usuario', 'error');
        }
    }

    async function deleteUser(userId, userType) {
        const endpoint = userType === 'profesor' ? 
            `http://${SERVER_IP}:3000/api/professors/delete/${userId}` : 
            `http://${SERVER_IP}:3000/api/students/delete/${userId}`;

        try {
            const response = await fetchWithAuth(endpoint, {
                method: 'DELETE'
            });

            if (response) {
                const data = await response.json();
                if (response.ok) {
                    showNotification(`${userType} eliminado exitosamente`, 'success');
                    await loadUsers();
                } else {
                    showNotification(data.error || 'Error al eliminar usuario', 'error');
                }
            }
        } catch (error) {
            showNotification('Error al eliminar usuario', 'error');
        }
    }

    async function loadTotalUsers() {
        try {
            const response = await fetchWithAuth(`http://${SERVER_IP}:3000/api/total-users`);
            if (response && response.ok) {
                const data = await response.json();
                console.log('Totales:', data); // Para debuggear
                updateCounters(data);
            }
        } catch (error) {
            console.error('Error al cargar totales:', error);
        }
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        // Remover notificaciones anteriores
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
    
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Control del menú
    menuToggle.addEventListener('click', () => {
        isOpen = !isOpen;
        toggleSidebar();
    });

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        content.classList.toggle('shifted');
        header.classList.toggle('shifted');
        menuToggle.children[0].style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0)';
    }

    // Elementos del modal
    const modal = document.getElementById('userModal');
    const addUserBtn = document.getElementById('addUserBtn');
    const closeModal = document.querySelector('.close-modal');
    const userForm = document.getElementById('userForm');
    const cancelBtn = document.getElementById('cancelBtn');
    let isEditMode = false;
    let editingUserId = null;

    // Renderizar tabla de usuarios
    function renderUsersTable() {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
    
        tbody.innerHTML = '';
    
        let filteredUsers = users;
        if (currentView !== 'all') {
            filteredUsers = users.filter(user => user.rol === currentView);
        }
    
        filteredUsers.forEach(user => {
            // Función para obtener el texto del rol
            const getRolText = (rol) => {
                switch(rol) {
                    case 'profesor':
                        return 'Profesor';
                    case 'estudiante':
                        return 'Estudiante';
                    case 'director':
                        return 'Director';
                    default:
                        return rol;
                }
            };
    
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nombre}</td>
                <td>${user.email}</td>
                <td>${getRolText(user.rol)}</td>
                <td>
                    ${user.rol !== 'director' ? `
                        <button class="btn-edit" data-id="${user.id}" data-role="${user.rol}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-id="${user.id}" data-role="${user.rol}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    
        addTableButtonListeners();
        loadTotalUsers();
    }

    // Event listeners para los botones de la tabla
    function addTableButtonListeners() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.id);
                const userRole = e.currentTarget.dataset.role;
                const user = users.find(u => u.id === userId);
                if (user) {
                    openEditModal(user, userRole);
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = parseInt(e.currentTarget.dataset.id);
                const userRole = e.currentTarget.dataset.role;
                if (confirm(`¿Estás seguro de que deseas eliminar este ${userRole}?`)) {
                    await deleteUser(userId, userRole);
                }
            });
        });
    }

    // Modal handlers
    function openEditModal(user, userRole) {
        isEditMode = true;
        editingUserId = user.id;
        
        document.getElementById('userName').value = user.nombre;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user.rol;
        document.getElementById('userRole').disabled = true;
        
        document.querySelector('#userModal h2').textContent = `Editar ${userRole}`;
        modal.style.display = 'block';
    }

    addUserBtn.addEventListener('click', () => {
        isEditMode = false;
        editingUserId = null;
        document.getElementById('userRole').disabled = false;
        document.querySelector('#userModal h2').textContent = 'Agregar Usuario';
        userForm.reset();
        modal.style.display = 'block';
    });

    // Manejar envío del formulario
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            nombre: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            contraseña: document.getElementById('userPassword').value,
            rol: document.getElementById('userRole').value
        };

        if (isEditMode) {
            await updateUser(editingUserId, userData, userData.rol);
        } else {
            await addUser(userData);
        }

        modal.style.display = 'none';
    });

    // Event listeners para el modal
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Cambiar entre vistas
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentView = e.target.closest('a').dataset.view;
            updateViewAndTitle();
            renderUsersTable();

            if (window.innerWidth <= 767) {
                isOpen = false;
                toggleSidebar();
            }
        });
    });

    function updateViewAndTitle() {
        const titles = {
            'all': 'Todos los Usuarios',
            'profesor': 'Gestión de Profesores',
            'estudiante': 'Gestión de Estudiantes'
        };
        document.querySelector('.section-header h2').textContent = titles[currentView];
    }

    function updateCounters(data) {
        if (!data) return;
        
        const profesoresCounter = document.querySelectorAll('.count')[0];
        const estudiantesCounter = document.querySelectorAll('.count')[1];
        
        if (profesoresCounter) profesoresCounter.textContent = data.totalProfesores || 0;
        if (estudiantesCounter) estudiantesCounter.textContent = data.totalEstudiantes || 0;
    }

    // Inicialización
    loadUsers();
    loadTotalUsers();
});