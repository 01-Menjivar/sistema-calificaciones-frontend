document.addEventListener('DOMContentLoaded', () => {
    // Elementos del menú
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const header = document.querySelector('.main-header');
    let isOpen = false;
    
    // Datos de ejemplo basados en tu estructura de BD
    let users = [
        { id: 1, nombre: 'Admin Principal', email: 'admin@sistema.com', rol: 'super-admin' },
        { id: 2, nombre: 'Juan Pérez', email: 'juan@ejemplo.com', rol: 'profesor' },
        { id: 3, nombre: 'María García', email: 'maria@ejemplo.com', rol: 'estudiante' },
        { id: 4, nombre: 'Mario Guti', email: 'mario@ejemplo.com', rol: 'estudiante' }
    ];

    let currentView = 'all'; // Por defecto muestra todos los usuarios

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
    const rolGroup = document.getElementById('rolGroup');

    // Variables para el modo de edición
    let isEditMode = false;
    let editingUserId = null;

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
        let title = 'Gestión de Usuarios';
        switch(currentView) {
            case 'profesor':
                title = 'Gestión de Profesores';
                break;
            case 'estudiante':
                title = 'Gestión de Estudiantes';
                break;
            case 'all':
                title = 'Todos los Usuarios';
                break;
        }
        document.querySelector('.section-header h2').textContent = title;
    }

    // Función para actualizar los contadores
    function updateCounters() {
        const professorCount = users.filter(u => u.rol === 'profesor').length;
        const studentCount = users.filter(u => u.rol === 'estudiante').length;
        
        document.querySelectorAll('.count')[0].textContent = professorCount;
        document.querySelectorAll('.count')[1].textContent = studentCount;
    }

    // Función para renderizar la tabla de usuarios
    function renderUsersTable() {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        let filteredUsers = users.filter(user => user.rol !== 'super-admin');
        
        if (currentView !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.rol === currentView);
        }

        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nombre}</td>
                <td>${user.email}</td>
                <td>${user.rol === 'profesor' ? 'Profesor' : 'Estudiante'}</td>
                <td>
                    <button class="btn-edit" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        addTableButtonListeners();
        updateCounters();
    }

    // Event listeners para los botones de la tabla
    function addTableButtonListeners() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.id);
                const user = users.find(u => u.id === userId);
                if (user) {
                    openEditModal(user);
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.id);
                if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                    deleteUser(userId);
                }
            });
        });
    }

    // Función para abrir el modal en modo edición
    function openEditModal(user) {
        isEditMode = true;
        editingUserId = user.id;
        
        document.getElementById('userName').value = user.nombre;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user.rol;
        
        rolGroup.style.display = 'none';
        
        document.querySelector('#userModal h2').textContent = 'Editar Usuario';
        modal.style.display = 'block';
    }

    // Función para eliminar usuario
    function deleteUser(userId) {
        users = users.filter(user => user.id !== userId);
        renderUsersTable();
    }

    // Event Listeners para el modal
    addUserBtn.addEventListener('click', () => {
        isEditMode = false;
        editingUserId = null;
        
        rolGroup.style.display = 'block';
        
        document.querySelector('#userModal h2').textContent = 'Agregar Usuario';
        document.getElementById('userRole').value = currentView === 'all' ? 'estudiante' : currentView;
        
        modal.style.display = 'block';
        userForm.reset();
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Manejar envío del formulario
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            nombre: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            rol: isEditMode ? users.find(u => u.id === editingUserId).rol : document.getElementById('userRole').value
        };

        if (isEditMode) {
            const userIndex = users.findIndex(u => u.id === editingUserId);
            if (userIndex !== -1) {
                users[userIndex] = { 
                    ...users[userIndex], 
                    nombre: userData.nombre,
                    email: userData.email
                };
            }
        } else {
            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            users.push({ 
                id: newId, 
                ...userData,
                contrasena: document.getElementById('userPassword').value
            });
        }

        renderUsersTable();
        modal.style.display = 'none';
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (isOpen && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            isOpen = false;
            toggleSidebar();
        }
    });

    // Cerrar menú al redimensionar si la pantalla es pequeña
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 767 && isOpen) {
            isOpen = false;
            toggleSidebar();
        }
    });

    // Inicializar mostrando todos los usuarios
    renderUsersTable();
});