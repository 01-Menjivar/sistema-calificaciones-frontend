document.addEventListener('DOMContentLoaded', () => {
    // Datos de ejemplo
    let tasks = [
        {
            id: 1,
            titulo: 'Tarea 1',
            descripcion: 'Descripción detallada de la tarea 1',
            fecha_asignacion: '2024-03-01',
            fecha_entrega: '2024-03-15',
            ponderacion: 25.00,
            estado: 'Pendiente',
            recursos: 'https://ejemplo.com/recursos\nhttps://ejemplo.com/material',
            nivel_dificultad: 'Media'
        }
    ];

    let students = [
        { id: 1, nombre: 'Ana López', email: 'ana@ejemplo.com' },
        { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@ejemplo.com' },
        { id: 3, nombre: 'María Pérez', email: 'maria@ejemplo.com' }
    ];

    let submissions = [
        { id: 1, tarea_id: 1, estudiante_id: 1, estado: 'entregado', calificacion: null },
        { id: 2, tarea_id: 1, estudiante_id: 2, estado: 'pendiente', calificacion: null },
        { id: 3, tarea_id: 1, estudiante_id: 3, estado: 'entregado', calificacion: 85 }
    ];

    // Elementos del DOM
    const taskModal = document.getElementById('taskModal');
    const taskDetailsModal = document.getElementById('taskDetailsModal');
    const gradesModal = document.getElementById('gradesModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskForm = document.getElementById('taskForm');

    // Variables de estado
    let isEditMode = false;
    let editingTaskId = null;
    let currentTask = null;

    // Funciones auxiliares
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    function updateCounters() {
        const totalTasks = tasks.length;
        const pendingTasks = tasks.filter(t => t.estado === 'Pendiente').length;
        
        document.getElementById('taskCount').textContent = totalTasks;
        document.getElementById('pendingCount').textContent = pendingTasks;
    }

    // Función para renderizar tabla de tareas
    function renderTasksTable() {
        const tbody = document.querySelector('#tasksTable tbody');
        tbody.innerHTML = '';

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="task-title" data-task-id="${task.id}">${task.titulo}</td>
                <td>${formatDate(task.fecha_entrega)}</td>
                <td>${task.ponderacion}%</td>
                <td>
                    <span class="badge badge-${task.nivel_dificultad.toLowerCase()}">
                        ${task.nivel_dificultad}
                    </span>
                </td>
                <td>
                    <span class="badge ${task.estado === 'Pendiente' ? 'badge-warning' : 'badge-success'}">
                        ${task.estado}
                    </span>
                </td>
                <td>
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
        updateCounters();
    }

    // Funciones para manejo de eventos de la tabla
    function addTaskListeners() {
        // Click en título de tarea para ver calificaciones
        document.querySelectorAll('.task-title').forEach(title => {
            title.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.dataset.taskId);
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    currentTask = task;
                    openGradesModal(task);
                }
            });
        });

        // Click en botón ver detalles
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('button').dataset.id);
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    openTaskDetailsModal(task);
                }
            });
        });

        // Click en botón editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('button').dataset.id);
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    openEditTaskModal(task);
                }
            });
        });

        // Click en botón eliminar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('button').dataset.id);
                if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                    deleteTask(taskId);
                }
            });
        });
    }

    // Funciones para manejar modales
    function openTaskDetailsModal(task) {
        document.getElementById('detailsTitle').textContent = task.titulo;
        document.getElementById('detailsDueDate').textContent = formatDate(task.fecha_entrega);
        document.getElementById('detailsPonderacion').textContent = `${task.ponderacion}%`;
        document.getElementById('detailsDificultad').textContent = task.nivel_dificultad;
        document.getElementById('detailsEstado').textContent = task.estado;
        document.getElementById('detailsDescription').textContent = task.descripcion;
        
        const resourcesContainer = document.getElementById('detailsResources');
        if (task.recursos) {
            const links = task.recursos.split('\n').map(url => 
                `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
            ).join('<br>');
            resourcesContainer.innerHTML = links;
        } else {
            resourcesContainer.innerHTML = '<p>No hay recursos disponibles</p>';
        }

        taskDetailsModal.style.display = 'block';
    }

    function openGradesModal(task) {
        document.getElementById('taskInfoTitle').textContent = task.titulo;
        document.getElementById('taskInfoDescription').textContent = task.descripcion;
        document.getElementById('taskInfoDueDate').textContent = `Entrega: ${formatDate(task.fecha_entrega)}`;
        document.getElementById('taskInfoPonderacion').textContent = `Ponderación: ${task.ponderacion}%`;
        document.getElementById('taskInfoDificultad').textContent = `Dificultad: ${task.nivel_dificultad}`;

        const tbody = document.querySelector('#studentsTable tbody');
        tbody.innerHTML = '';

        students.forEach(student => {
            const submission = submissions.find(s => 
                s.tarea_id === task.id && s.estudiante_id === student.id
            ) || {
                id: submissions.length + 1,
                tarea_id: task.id,
                estudiante_id: student.id,
                estado: 'pendiente',
                calificacion: null
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.nombre}</td>
                <td>
                    <span class="badge ${submission.estado === 'entregado' ? 'badge-success' : 'badge-warning'}">
                        ${submission.estado}
                    </span>
                </td>
                <td>
                    ${submission.calificacion !== null 
                        ? submission.calificacion 
                        : submission.estado === 'entregado'
                            ? `<input type="number" class="grade-input" 
                                data-submission-id="${submission.id}"
                                min="0" max="100" step="0.01"
                                placeholder="0-100">`
                            : '-'
                    }
                </td>
                <td>
                    ${submission.estado === 'entregado' && submission.calificacion === null
                        ? `<button class="btn-save-grade" data-submission-id="${submission.id}">
                            <i class="fas fa-save"></i> Guardar
                           </button>`
                        : ''
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Agregar listeners para guardar calificaciones
        document.querySelectorAll('.btn-save-grade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const submissionId = parseInt(e.target.closest('button').dataset.submissionId);
                const input = document.querySelector(`.grade-input[data-submission-id="${submissionId}"]`);
                if (input && input.value) {
                    saveGrade(submissionId, parseFloat(input.value));
                }
            });
        });

        gradesModal.style.display = 'block';
    }

    function openEditTaskModal(task) {
        isEditMode = true;
        editingTaskId = task.id;
        
        document.getElementById('taskTitle').value = task.titulo;
        document.getElementById('taskDescription').value = task.descripcion;
        document.getElementById('taskDueDate').value = task.fecha_entrega;
        document.getElementById('taskPonderacion').value = task.ponderacion;
        document.getElementById('taskRecursos').value = task.recursos || '';
        document.getElementById('taskDificultad').value = task.nivel_dificultad;
        
        document.querySelector('#taskModal h2').textContent = 'Editar Tarea';
        taskModal.style.display = 'block';
    }

    // Función para eliminar tarea
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        submissions = submissions.filter(sub => sub.tarea_id !== taskId);
        renderTasksTable();
    }

    // Función para guardar calificación
    function saveGrade(submissionId, grade) {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            submission.calificacion = grade;
            
            // Verificar si todas las entregas están calificadas
            const allGraded = submissions
                .filter(s => s.tarea_id === currentTask.id && s.estado === 'entregado')
                .every(s => s.calificacion !== null);
            
            if (allGraded) {
                const taskIndex = tasks.findIndex(t => t.id === currentTask.id);
                if (taskIndex !== -1) {
                    tasks[taskIndex].estado = 'Calificada';
                    currentTask = tasks[taskIndex];
                }
            }
            
            openGradesModal(currentTask);
            renderTasksTable();
        }
    }

    // Event Listeners
    addTaskBtn.addEventListener('click', () => {
        isEditMode = false;
        editingTaskId = null;
        taskForm.reset();
        document.querySelector('#taskModal h2').textContent = 'Nueva Tarea';
        document.getElementById('taskDueDate').min = new Date().toISOString().split('T')[0];
        taskModal.style.display = 'block';
    });

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            taskModal.style.display = 'none';
            taskDetailsModal.style.display = 'none';
            gradesModal.style.display = 'none';
        });
    });

    document.getElementById('cancelTaskBtn').addEventListener('click', () => {
        taskModal.style.display = 'none';
    });

    // Cerrar modales al hacer clic fuera
    window.onclick = function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    };

    // Manejar envío del formulario
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const taskData = {
            titulo: document.getElementById('taskTitle').value,
            descripcion: document.getElementById('taskDescription').value,
            fecha_asignacion: new Date().toISOString().split('T')[0],
            fecha_entrega: document.getElementById('taskDueDate').value,
            ponderacion: parseFloat(document.getElementById('taskPonderacion').value),
            estado: 'Pendiente',
            recursos: document.getElementById('taskRecursos').value,
            nivel_dificultad: document.getElementById('taskDificultad').value
        };

        if (isEditMode) {
            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = { 
                    ...tasks[taskIndex], 
                    ...taskData 
                };
            }
        } else {
            const newId = tasks.length > 0 
                ? Math.max(...tasks.map(t => t.id)) + 1 
                : 1;
            tasks.push({ id: newId, ...taskData });
        }

        renderTasksTable();
        taskModal.style.display = 'none';
    });

    // Inicializar la vista
    renderTasksTable();
});