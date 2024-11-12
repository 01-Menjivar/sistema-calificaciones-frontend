class TaskManager {
    constructor() {
        this.api = new ApiService();
        this.tasks = [];
        this.students = [];
        this.gradeManager = new GradeManager(this.api);

        document.addEventListener('gradesUpdated', () => {
            this.updateCounters();
        });

    }

    async init() {
        if (!this.checkAuth()) return;
        await this.loadInitialData();
        this.bindEvents();
        this.renderTasksTable();
    }

    checkAuth() {
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        if (!localStorage.getItem('token') || userInfo.rol !== 'profesor') {
            window.location.href = '/src/views/login.html';
            return false;
        }
        return true;
    }

    async loadInitialData() {
        try {
            [this.tasks, this.students] = await Promise.all([
                this.api.getTasks(),
                this.api.getStudents()
            ]);
            console.log('Datos cargados:', { tasks: this.tasks, students: this.students });
        } catch (error) {
            console.error('Error cargando datos:', error);
            UiManager.showNotification('Error cargando datos', 'error');
        }
    }

    bindEvents() {
        // Eventos globales
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Eventos de formulario
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleTaskSubmit.bind(this));
            
            // Eventos de validación
            const ponderacionInput = taskForm.querySelector('#ponderacion');
            if (ponderacionInput) {
                ponderacionInput.addEventListener('input', this.validatePonderacion.bind(this));
            }

            const fechaInput = taskForm.querySelector('#fecha_entrega');
            if (fechaInput) {
                fechaInput.addEventListener('focus', this.setMinDate.bind(this));
            }
        }

        // Eventos de modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        });

        // Botón agregar tarea
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.openEditTaskModal());
        }
    }

    handleGlobalClick(e) {
        const target = e.target;
        
        if (target.closest('.btn-view')) this.handleViewClick(e);
        if (target.closest('.btn-edit')) this.handleEditClick(e);
        if (target.closest('.btn-delete')) this.handleDeleteClick(e);
        if (target.closest('.task-title')) this.handleTaskTitleClick(e);
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        if (!form.checkValidity()) {
            UiManager.showNotification('Por favor complete todos los campos correctamente', 'error');
            return;
        }

        const taskData = this.getFormData(form);
        const taskId = form.dataset.taskId;

        try {
            let success;
            if (taskId) {
                success = await this.api.updateTask(taskId, taskData);
            } else {
                success = await this.api.createTask(taskData);
            }

            if (success) {
                UiManager.showNotification(
                    `Tarea ${taskId ? 'actualizada' : 'creada'} exitosamente`, 
                    'success'
                );
                await this.loadInitialData();
                this.renderTasksTable();
                this.closeModal('taskModal');
                form.reset();
            }
        } catch (error) {
            console.error('Error en submit:', error);
            UiManager.showNotification('Error al procesar la tarea', 'error');
        }
    }

    handleViewClick(e) {
        const taskId = parseInt(e.target.closest('.btn-view').dataset.id);
        const task = this.tasks.find(t => t.id === taskId);
        if (task) this.openTaskDetailsModal(task);
    }

    handleEditClick(e) {
        const taskId = parseInt(e.target.closest('.btn-edit').dataset.id);
        const task = this.tasks.find(t => t.id === taskId);
        if (task) this.openEditTaskModal(task);
    }

    async handleDeleteClick(e) {
        const taskId = parseInt(e.target.closest('.btn-delete').dataset.id);
        if (confirm('¿Está seguro de eliminar esta tarea?')) {
            try {
                const success = await this.api.deleteTask(taskId);
                if (success) {
                    UiManager.showNotification('Tarea eliminada exitosamente', 'success');
                    await this.loadInitialData();
                    this.renderTasksTable();
                }
            } catch (error) {
                console.error('Error eliminando tarea:', error);
                UiManager.showNotification('Error al eliminar la tarea', 'error');
            }
        }
    }

    handleTaskTitleClick(e) {
        console.log('Click en título de tarea');
        const taskId = parseInt(e.target.dataset.taskId);
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                console.log('Abriendo modal para tarea:', task);
                this.gradeManager.openGradesModal(task, this.students);
            }
        }
    }


    validatePonderacion(e) {
        let value = parseFloat(e.target.value);
        if (value < 0) e.target.value = 0;
        if (value > 100) e.target.value = 100;
    }

    setMinDate(e) {
        e.target.min = new Date().toISOString().split('T')[0];
    }

    getFormData(form) {
        return {
            titulo: form.titulo.value.trim(),
            descripcion: form.descripcion.value.trim(),
            fecha_asignacion: new Date().toISOString().split('T')[0],
            fecha_entrega: form.fecha_entrega.value,
            ponderacion: parseFloat(form.ponderacion.value),
            recursos: form.recursos.value.trim(),
            nivel_dificultad: UiManager.normalizeDificultad(form.nivel_dificultad.value)
        };
    }

    async renderTasksTable() {
        const tbody = document.querySelector('#tasksTable tbody');
        if (!tbody) return;
    
        try {
            // Procesar cada tarea para obtener su estado actual
            const processedTasks = await Promise.all(this.tasks.map(async (task) => {
                const currentStatus = await this.getTaskStatus(task);
                return { ...task, estado: currentStatus };
            }));
    
            tbody.innerHTML = processedTasks.map(task => this.createTaskRow(task)).join('');
            this.updateCounters();
        } catch (error) {
            console.error('Error al renderizar la tabla:', error);
            UiManager.showNotification('Error al actualizar la tabla de tareas', 'error');
        }
    }

    async getTaskStatus(task) {
        try {
            const submissions = await this.api.getTaskSubmissions(task.id);
            const students = await this.api.getStudents();
            
            if (!submissions || !students || students.length === 0) {
                return 'pendiente';
            }
    
            const allSubmitted = students.every(student => {
                const submission = submissions.find(s => s.estudiante_id === student.id);
                return submission && submission.calificacion !== null;
            });
    
            return allSubmitted ? 'entregado' : 'pendiente';
        } catch (error) {
            console.error('Error al obtener estado de la tarea:', error);
            return 'pendiente';
        }
    }
    
    getTaskStatusClass(task) {
        const status = task.estado || 'pendiente';
        return status === 'entregado' ? 'badge-success' : 'badge-warning';
    }
    
    getTaskStatusText(task) {
        const status = task.estado || 'pendiente';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    createTaskRow(task) {
        return `
            <tr>
                <td class="task-title" data-task-id="${task.id}">${task.titulo}</td>
                <td>${UiManager.formatDate(task.fecha_entrega)}</td>
                <td>${task.ponderacion}%</td>
                <td>
                    <span class="badge badge-${UiManager.getBadgeClass(task.nivel_dificultad)}">
                        ${task.nivel_dificultad}
                    </span>
                </td>
                <td>
                    <span class="badge ${this.getTaskStatusClass(task)}">
                        ${this.getTaskStatusText(task)}
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
            </tr>
        `;
    }

    async updateCounters() {
        try {
            let totalTasks = this.tasks.length;
            
            // Obtener submissions para todas las tareas
            let pendingTasks = 0;
            for (const task of this.tasks) {
                const submissions = await this.api.getTaskSubmissions(task.id);
                const students = await this.api.getStudents();
                
                // Una tarea está pendiente si tiene estudiantes sin calificar
                const hasUngradedSubmissions = students.some(student => {
                    const submission = submissions.find(s => s.estudiante_id === student.id);
                    return !submission || submission.calificacion === null;
                });
                
                if (hasUngradedSubmissions) {
                    pendingTasks++;
                }
            }
    
            const completedTasks = totalTasks - pendingTasks;
    
            // Actualizar contadores en el DOM
            const elements = {
                taskCount: document.getElementById('taskCount'),
                pendingCount: document.getElementById('pendingCount'),
                completedCount: document.getElementById('completedCount')
            };
    
            if (elements.taskCount) elements.taskCount.textContent = totalTasks;
            if (elements.pendingCount) elements.pendingCount.textContent = pendingTasks;
            if (elements.completedCount) elements.completedCount.textContent = completedTasks;
    
            console.log('Contadores actualizados:', { 
                total: totalTasks, 
                pendientes: pendingTasks, 
                completadas: completedTasks 
            });
        } catch (error) {
            console.error('Error al actualizar contadores:', error);
        }
    }

    openTaskDetailsModal(task) {
        const modal = document.getElementById('taskDetailsModal');
        if (!modal) return;

        const elements = {
            title: document.getElementById('detailsTitle'),
            dueDate: document.getElementById('detailsDueDate'),
            ponderacion: document.getElementById('detailsPonderacion'),
            dificultad: document.getElementById('detailsDificultad'),
            estado: document.getElementById('detailsEstado'),
            description: document.getElementById('detailsDescription'),
            resources: document.getElementById('detailsResources')
        };

        // Actualizar contenido
        elements.title.textContent = task.titulo;
        elements.dueDate.textContent = `Fecha de entrega: ${UiManager.formatDate(task.fecha_entrega)}`;
        elements.ponderacion.textContent = `Ponderación: ${task.ponderacion}%`;
        elements.dificultad.textContent = `Dificultad: ${task.nivel_dificultad}`;
        elements.estado.textContent = `Estado: ${task.estado || 'Pendiente'}`;
        elements.description.textContent = task.descripcion;

        // Manejar recursos
        if (task.recursos) {
            const recursos = task.recursos.split('\n')
                .map(url => url.trim())
                .filter(url => url);

            elements.resources.innerHTML = recursos.length > 0
                ? recursos.map(url => 
                    `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
                ).join('<br>')
                : '<p>No hay recursos disponibles</p>';
        } else {
            elements.resources.innerHTML = '<p>No hay recursos disponibles</p>';
        }

        modal.style.display = 'block';
    }

    openEditTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        if (!modal || !form) return;

        const isEdit = !!task;
        modal.querySelector('h2').textContent = isEdit ? 'Editar Tarea' : 'Nueva Tarea';

        if (isEdit) {
            form.titulo.value = task.titulo;
            form.descripcion.value = task.descripcion;
            form.fecha_entrega.value = task.fecha_entrega.split('T')[0];
            form.ponderacion.value = task.ponderacion;
            form.recursos.value = task.recursos || '';
            form.nivel_dificultad.value = UiManager.normalizeDificultad(task.nivel_dificultad);
            form.dataset.taskId = task.id;
        } else {
            form.reset();
            delete form.dataset.taskId;
            form.fecha_entrega.min = new Date().toISOString().split('T')[0];
        }

        modal.style.display = 'block';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}