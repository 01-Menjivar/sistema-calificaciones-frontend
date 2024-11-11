document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');

    if (!token || userInfo.rol !== 'profesor') {
        window.location.href = '/src/views/login.html';
        return;
    }

    let tasks = [];
    let students = [];
   

    await loadStudents();
    await loadTasks();

    document.querySelectorAll('.task-title').forEach(title => {
        title.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            if (taskId) {
                openGradesModal(parseInt(taskId));
            }
        });
    });

    // Función para hacer peticiones autenticadas
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
            showNotification('Error de conexión', 'error');
            return null;
        }
    }

    // Funciones de API
    async function loadTasks() {
        try {
            const response = await fetchWithAuth('http://localhost:3000/api/listtask');
            if (!response) return;
    
            const data = await response.json();
            console.log('Datos recibidos:', data); // Para debug
    
            // Verificar que data.tareas existe y es un array
            if (data.tareas && Array.isArray(data.tareas)) {
                tasks = data.tareas;
                renderTasksTable();
                updateCounters();
                console.log('Tareas actualizadas:', tasks); // Para debug
            } else {
                console.error('Formato de datos incorrecto:', data);
                showNotification('Error al cargar las tareas', 'error');
            }
        } catch (error) {
            console.error('Error al cargar tareas:', error);
            showNotification('Error al cargar las tareas', 'error');
        }
    }

    async function loadStudents() {
        try {
            const response = await fetchWithAuth('http://localhost:3000/api/students');
            if (response && response.ok) {
                const data = await response.json();
                students = data || [];
                console.log('Estudiantes cargados:', students);
            }
        } catch (error) {
            console.error('Error al cargar estudiantes:', error);
            showNotification('Error al cargar lista de estudiantes', 'error');
        }
    }

    async function loadTaskSubmissions(taskId) {
        try {
            const response = await fetchWithAuth(`http://localhost:3000/api/task-submissions/${taskId}`);
            if (response && response.ok) {
                const data = await response.json();
                console.log('Entregas cargadas:', data);
                return data || [];
            }
        } catch (error) {
            console.error('Error al cargar entregas:', error);
            showNotification('Error al cargar entregas', 'error');
        }
        return [];
    }

    async function saveGrade(gradeData) {
        try {
            const response = await fetchWithAuth('http://localhost:3000/api/professor/add-grade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gradeData)
            });
    
            if (response && response.ok) {
                showNotification('Calificación guardada exitosamente', 'success');
                return true;
            } else {
                const data = await response.json();
                showNotification(data.error || 'Error al guardar calificación', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error al guardar calificación:', error);
            showNotification('Error al guardar calificación', 'error');
            return false;
        }
    }

    async function createTask(taskData) {
        try {
            console.log('Enviando tarea:', taskData); // Debug
    
            const response = await fetchWithAuth('http://localhost:3000/api/assign-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
    
            if (!response) {
                showNotification('Error de conexión', 'error');
                return false;
            }
    
            const data = await response.json();
            console.log('Respuesta del servidor:', data); // Debug
    
            if (response.ok) {
                showNotification('Tarea creada exitosamente', 'success');
                await loadTasks(); // Recargar la lista de tareas
                return true;
            } else {
                showNotification(data.error || 'Error al crear la tarea', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error al crear tarea:', error);
            showNotification('Error al crear la tarea', 'error');
            return false;
        }
    }

    async function updateTask(taskId, taskData) {
        try {
            console.log('Enviando datos de edición:', {
                taskId,
                taskData
            });
    
            // Asegurarse de que los datos están en el formato correcto
            const formattedData = {
                titulo: taskData.titulo,
                descripcion: taskData.descripcion,
                fecha_entrega: taskData.fecha_entrega,
                ponderacion: parseFloat(taskData.ponderacion),
                recursos: taskData.recursos || null,
                nivel_dificultad: taskData.nivel_dificultad.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
            };
    
            console.log('Datos normalizados a enviar:', formattedData);
    
            const response = await fetchWithAuth(`http://localhost:3000/api/edit-task/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formattedData)
            });
    
            if (!response) {
                showNotification('Error de conexión', 'error');
                return false;
            }
    
            const data = await response.json();
            console.log('Respuesta del servidor para edición:', data);
    
            if (response.ok) {
                showNotification('Tarea actualizada exitosamente', 'success');
                await loadTasks();
                return true;
            } else {
                showNotification(data.error || 'Error al actualizar la tarea', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error al actualizar tarea:', error);
            showNotification('Error al actualizar la tarea', 'error');
            return false;
        }
    }

    function updateTaskInfo(task) {
        document.getElementById('taskInfoTitle').textContent = task.titulo;
        document.getElementById('taskInfoDescription').textContent = task.descripcion;
        document.getElementById('taskInfoDueDate').textContent = `Fecha de entrega: ${formatDate(task.fecha_entrega)}`;
        document.getElementById('taskInfoPonderacion').textContent = `Ponderación: ${task.ponderacion}%`;
    }

    async function deleteTask(taskId) {
        try {
            const response = await fetchWithAuth(`http://localhost:3000/api/delete-task/${taskId}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                showNotification('Tarea eliminada exitosamente', 'success');
                await loadTasks();
            }
        } catch (error) {
            showNotification('Error al eliminar la tarea', 'error');
        }
    }

    // Funciones de UI
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
    
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

   // Función para actualizar contadores
   function updateCounters() {
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => 
        !t.estado || t.estado.toLowerCase() === 'pendiente'
    ).length;
    const completedTasks = tasks.filter(t => 
        t.estado && t.estado.toLowerCase() === 'completada'
    ).length;

    const counters = {
        taskCount: document.getElementById('taskCount'),
        pendingCount: document.getElementById('pendingCount'),
        completedCount: document.getElementById('completedCount')
    };

    // Actualizar contadores si existen
    if (counters.taskCount) counters.taskCount.textContent = totalTasks;
    if (counters.pendingCount) counters.pendingCount.textContent = pendingTasks;
    if (counters.completedCount) counters.completedCount.textContent = completedTasks;

    console.log('Contadores actualizados:', { 
        total: totalTasks, 
        pendientes: pendingTasks, 
        completadas: completedTasks 
    });
}



// Función para renderizar tabla de tareas
function renderTasksTable() {
    const tbody = document.querySelector('#tasksTable tbody');
    if (!tbody) {
        console.error('No se encontró el tbody de la tabla');
        return;
    }

    tbody.innerHTML = '';

    console.log('Renderizando tareas:', tasks); // Para debug

    tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="task-title" data-task-id="${task.id}">${task.titulo}</td>
            <td>${formatDate(task.fecha_entrega)}</td>
            <td>${task.ponderacion}%</td>
            <td>
                <span class="badge badge-${getBadgeClass(task.nivel_dificultad)}">
                    ${task.nivel_dificultad}
                </span>
            </td>
            <td>
                <span class="badge ${task.estado ? 
                    task.estado.toLowerCase() === 'pendiente' ? 'badge-warning' : 'badge-success'
                    : 'badge-warning'}">
                    ${task.estado || 'Pendiente'}
                </span>
            </td>
            <td class="actions">
                <button class="btn-view" data-id="${task.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-edit" data-id="${task.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" data-id="${task.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    addTaskListeners();
}

// Función para abrir modal de detalles
function openEditTaskModal(task) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');

    // Normalizar el nivel de dificultad para el select
    const normalizeDificultad = (nivel) => {
        const normalizado = nivel.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        return normalizado === 'facil' ? 'facil' : 
               normalizado === 'dificil' ? 'dificil' : 
               'media';
    };

    form.titulo.value = task.titulo;
    form.descripcion.value = task.descripcion;
    form.fecha_entrega.value = task.fecha_entrega.split('T')[0];
    form.ponderacion.value = task.ponderacion;
    form.recursos.value = task.recursos || '';
    form.nivel_dificultad.value = normalizeDificultad(task.nivel_dificultad);

    form.dataset.taskId = task.id;
    modal.style.display = 'block';
}

// Función para abrir modal de calificaciones
function openGradesModal(taskId) {
    console.log('Abriendo modal de calificaciones para tarea:', taskId);
    
    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task) {
        console.error('Tarea no encontrada:', taskId);
        return;
    }

    const modal = document.getElementById('gradesModal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }

    // Actualizar información de la tarea
    updateTaskInfo(task);

    // Cargar y mostrar calificaciones
    loadAndDisplayGrades(task);

    modal.style.display = 'block';
}

function createGradeRow(student, submission, taskId) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${student.nombre}</td>
        <td>${student.email}</td>
        <td>
            <span class="badge ${submission.estado === 'entregado' ? 'badge-success' : 'badge-warning'}">
                ${capitalizeFirst(submission.estado || 'pendiente')}
            </span>
        </td>
        <td>
            ${submission.estado === 'entregado' 
                ? submission.calificacion !== null
                    ? `<span class="grade">${submission.calificacion}</span>`
                    : `<input type="number" class="grade-input" 
                        min="0" max="100" step="0.1" 
                        placeholder="0-100">`
                : '-'
            }
        </td>
        <td>
            ${submission.estado === 'entregado' && submission.calificacion === null
                ? `<button class="btn-save-grade" data-student-id="${student.id}" data-task-id="${taskId}">
                    <i class="fas fa-save"></i>
                   </button>`
                : ''
            }
        </td>
    `;
    return tr;
}


async function loadAndDisplayGrades(task) {
    const submissions = await loadTaskSubmissions(task.id);
    const tbody = document.querySelector('#studentsTable tbody');
    tbody.innerHTML = '';

    if (!students || students.length === 0) {
        await loadStudents();
    }

    students.forEach(student => {
        const submission = submissions.find(s => s.estudiante_id === student.id) || {
            estudiante_id: student.id,
            calificacion: null,
            estado: 'pendiente'
        };

        const tr = createGradeRow(student, submission, task.id);
        tbody.appendChild(tr);
    });

    addGradeEventListeners(task.id);
}

function addGradeEventListeners(taskId) {
    document.querySelectorAll('.btn-save-grade').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const studentId = e.currentTarget.dataset.studentId;
            const input = e.currentTarget.closest('tr').querySelector('.grade-input');

            if (input && input.value) {
                const grade = parseFloat(input.value);
                if (grade >= 0 && grade <= 100) {
                    const success = await saveGrade({
                        taskId,
                        studentId,
                        grade
                    });

                    if (success) {
                        await loadAndDisplayGrades({ id: taskId });
                    }
                } else {
                    showNotification('La calificación debe estar entre 0 y 100', 'error');
                }
            }
        });
    });
}

function openTaskDetailsModal(task) {
    console.log('Abriendo detalles de tarea:', task); // Debug
    
    const modal = document.getElementById('taskDetailsModal');
    if (!modal) {
        console.error('Modal de detalles no encontrado');
        return;
    }

    // Llenar datos del modal
    const elements = {
        title: document.getElementById('detailsTitle'),
        dueDate: document.getElementById('detailsDueDate'),
        ponderacion: document.getElementById('detailsPonderacion'),
        dificultad: document.getElementById('detailsDificultad'),
        estado: document.getElementById('detailsEstado'),
        description: document.getElementById('detailsDescription'),
        resources: document.getElementById('detailsResources')
    };

    // Verificar que existen todos los elementos necesarios
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Elemento ${key} no encontrado`);
            return;
        }
    }

    // Actualizar contenido
    elements.title.textContent = task.titulo;
    elements.dueDate.textContent = `Fecha de entrega: ${formatDate(task.fecha_entrega)}`;
    elements.ponderacion.textContent = `Ponderación: ${task.ponderacion}%`;
    elements.dificultad.textContent = `Dificultad: ${task.nivel_dificultad}`;
    elements.estado.textContent = `Estado: ${task.estado || 'Pendiente'}`;
    elements.description.textContent = task.descripcion;

    // Manejar recursos
    if (task.recursos) {
        const recursos = task.recursos.split('\n').map(url => 
            url.trim()
        ).filter(url => url !== '');

        if (recursos.length > 0) {
            elements.resources.innerHTML = recursos.map(url => 
                `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
            ).join('<br>');
        } else {
            elements.resources.innerHTML = '<p>No hay recursos disponibles</p>';
        }
    } else {
        elements.resources.innerHTML = '<p>No hay recursos disponibles</p>';
    }

    // Mostrar modal
    modal.style.display = 'block';
}

// Función para abrir modal de edición/creación
function openEditTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const isEdit = !!task;

    document.querySelector('#taskModal h2').textContent = 
        isEdit ? 'Editar Tarea' : 'Nueva Tarea';

    if (isEdit) {
        form.elements.titulo.value = task.titulo;
        form.elements.descripcion.value = task.descripcion;
        form.elements.fecha_entrega.value = task.fecha_entrega;
        form.elements.ponderacion.value = task.ponderacion;
        form.elements.recursos.value = task.recursos || '';
        form.elements.nivel_dificultad.value = task.nivel_dificultad;
        form.dataset.taskId = task.id;
    } else {
        form.reset();
        form.elements.fecha_entrega.min = new Date().toISOString().split('T')[0];
        delete form.dataset.taskId;
    }

    modal.style.display = 'block';
}

// Función para agregar listeners
function addTaskListeners() {
    // Ver detalles
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const taskId = parseInt(e.currentTarget.dataset.id);
            const task = tasks.find(t => t.id === taskId);
            
            if (task) {
                openTaskDetailsModal(task);
            } else {
                console.error('Tarea no encontrada:', taskId);
            }
        });
    });

    // Ver calificaciones
    document.querySelectorAll('.btn-grades').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = parseInt(btn.dataset.id);
            openGradesModal(taskId);
        });
    });

    // Editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = parseInt(btn.dataset.id);
            const task = tasks.find(t => t.id === taskId);
            if (task) openEditTaskModal(task);
        });
    });

    // Eliminar
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const taskId = parseInt(btn.dataset.id);
            if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                await deleteTask(taskId);
            }
        });
    });
}

// Funciones auxiliares
function getBadgeClass(dificultad) {
    const classes = {
        'fácil': 'success',
        'facil': 'success',
        'media': 'warning',
        'difícil': 'danger',
        'dificil': 'danger'
    };
    return classes[dificultad.toLowerCase()] || 'primary';
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Event Listeners para modales
document.getElementById('addTaskBtn').addEventListener('click', () => {
    openEditTaskModal();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Manejar envío del formulario de tarea
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulario enviado'); // Debug

    // Validación del formulario
    if (!e.target.checkValidity()) {
        showNotification('Por favor, complete todos los campos requeridos', 'error');
        return;
    }

    const formData = {
        titulo: e.target.titulo.value.trim(),
        descripcion: e.target.descripcion.value.trim(),
        fecha_asignacion: new Date().toISOString().split('T')[0],
        fecha_entrega: e.target.fecha_entrega.value,
        ponderacion: parseFloat(e.target.ponderacion.value),
        recursos: e.target.recursos.value.trim(),
        nivel_dificultad: e.target.nivel_dificultad.value
    };

    console.log('Datos del formulario:', formData); // Debug

    const taskId = e.target.dataset.taskId;
    let success = false;

    if (taskId) {
        // Modo edición
        success = await updateTask(taskId, formData);
    } else {
        // Modo creación
        success = await createTask(formData);
    }

    if (success) {
        // Cerrar modal y limpiar formulario
        const modal = document.getElementById('taskModal');
        modal.style.display = 'none';
        e.target.reset();
        delete e.target.dataset.taskId;
    }
});

    document.getElementById('ponderacion').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    if (value < 0) e.target.value = 0;
    if (value > 100) e.target.value = 100;
});

// Configurar fecha mínima para la fecha de entrega
    document.getElementById('fecha_entrega').addEventListener('focus', function() {
    const today = new Date().toISOString().split('T')[0];
    this.min = today;
});

    // Inicialización
    await loadStudents();
    await loadTasks();
});