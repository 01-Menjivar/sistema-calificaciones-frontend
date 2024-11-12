class GradeManager {
    constructor(apiService) {
        this.api = apiService;
        this.currentTask = null;
        this.submissions = [];
        this.students = [];
    }

    async openGradesModal(task, students) {
        this.currentTask = task;
        this.students = students;
        const modal = document.getElementById('gradesModal');
        if (!modal || !task) return;

        try {
            // Cargar entregas
            const submissions = await this.api.getTaskSubmissions(task.id);
            this.submissions = submissions;

            // Actualizar información de la tarea
            this.updateTaskInfo(task);
            
            // Renderizar tabla de calificaciones
            await this.renderGradesTable();

            // Mostrar modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error al abrir modal de calificaciones:', error);
            UiManager.showNotification('Error al cargar calificaciones', 'error');
        }
    }

    updateTaskInfo(task) {
        const elements = {
            title: document.getElementById('taskInfoTitle'),
            description: document.getElementById('taskInfoDescription'),
            dueDate: document.getElementById('taskInfoDueDate'),
            ponderacion: document.getElementById('taskInfoPonderacion')
        };

        if (elements.title) elements.title.textContent = task.titulo;
        if (elements.description) elements.description.textContent = task.descripcion;
        if (elements.dueDate) {
            elements.dueDate.textContent = `Fecha de entrega: ${UiManager.formatDate(task.fecha_entrega)}`;
        }
        if (elements.ponderacion) {
            elements.ponderacion.textContent = `Ponderación: ${task.ponderacion}%`;
        }
    }

    async renderGradesTable() {
        const tbody = document.querySelector('#studentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.students.forEach(student => {
            const submission = this.submissions.find(s => s.estudiante_id === student.id) || {
                estudiante_id: student.id,
                calificacion: null,
                estado: 'pendiente'
            };

            const tr = this.createGradeRow(student, submission);
            tbody.appendChild(tr);
        });

        this.addGradeEventListeners();
    }

    createGradeRow(student, submission) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.nombre}</td>
            <td>${student.email}</td>
            <td>
                <select class="estado-select" data-student-id="${student.id}" data-task-id="${this.currentTask.id}">
                    <option value="pendiente" ${submission.estado === 'pendiente' ? 'selected' : ''}>
                        Pendiente
                    </option>
                    <option value="entregado" ${submission.estado === 'entregado' ? 'selected' : ''}>
                        Entregado
                    </option>
                </select>
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
                    ? `<button class="btn-save-grade" 
                        data-student-id="${student.id}" 
                        data-task-id="${this.currentTask.id}">
                        <i class="fas fa-save"></i>
                       </button>`
                    : ''
                }
            </td>
        `;

        // Agregar event listener para el cambio de estado
        const estadoSelect = tr.querySelector('.estado-select');
        estadoSelect.addEventListener('change', (e) => this.handleEstadoChange(e));

        return tr;
    }

    async handleEstadoChange(e) {
        const select = e.target;
        const studentId = select.dataset.studentId;
        const taskId = select.dataset.taskId;
        const newEstado = select.value;
        const originalValue = select.value; // Guardar el valor original
    
        try {
            const success = await this.api.updateSubmissionStatus({
                taskId: parseInt(taskId),
                studentId: parseInt(studentId),
                estado: newEstado
            });
    
            if (success) {
                UiManager.showNotification('Estado actualizado exitosamente', 'success');
                
                // Actualizar el submission local
                const submissionIndex = this.submissions.findIndex(
                    s => s.estudiante_id === parseInt(studentId)
                );
    
                if (submissionIndex !== -1) {
                    this.submissions[submissionIndex].estado = newEstado;
                } else {
                    this.submissions.push({
                        estudiante_id: parseInt(studentId),
                        tarea_id: parseInt(taskId),
                        estado: newEstado,
                        calificacion: null
                    });
                }
    
                // Actualizar solo la fila específica en lugar de toda la tabla
                const row = select.closest('tr');
                const calificacionCell = row.querySelector('td:nth-child(4)');
                const accionesCell = row.querySelector('td:nth-child(5)');
    
                if (newEstado === 'entregado') {
                    calificacionCell.innerHTML = `
                        <input type="number" class="grade-input" 
                            min="0" max="100" step="0.1" 
                            placeholder="0-100">
                    `;
                    accionesCell.innerHTML = `
                        <button class="btn-save-grade" 
                            data-student-id="${studentId}" 
                            data-task-id="${taskId}">
                            <i class="fas fa-save"></i>
                        </button>
                    `;
    
                    // Agregar event listeners a los nuevos elementos
                    const newInput = calificacionCell.querySelector('.grade-input');
                    const newButton = accionesCell.querySelector('.btn-save-grade');
                    
                    if (newInput) {
                        newInput.addEventListener('input', this.validateGradeInput);
                    }
                    if (newButton) {
                        newButton.addEventListener('click', async (e) => {
                            const input = newInput;
                            if (!input?.value) {
                                UiManager.showNotification('Por favor ingrese una calificación', 'error');
                                return;
                            }
    
                            const grade = parseFloat(input.value);
                            if (!this.isValidGrade(grade)) {
                                UiManager.showNotification('La calificación debe estar entre 0 y 100', 'error');
                                return;
                            }
    
                            await this.saveGrade(taskId, studentId, grade);
                        });
                    }
                } else {
                    calificacionCell.innerHTML = '-';
                    accionesCell.innerHTML = '';
                }
    
            } else {
                UiManager.showNotification('Error al actualizar el estado', 'error');
                select.value = originalValue; // Revertir al valor original
            }
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            UiManager.showNotification('Error al actualizar el estado', 'error');
            select.value = originalValue; // Revertir al valor original
        }
    }

    addGradeEventListeners() {
        // Event listeners para inputs de calificación
        document.querySelectorAll('.grade-input').forEach(input => {
            input.addEventListener('input', this.validateGradeInput);
        });

        // Event listeners para botones de guardar
        document.querySelectorAll('.btn-save-grade').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const input = button.closest('tr').querySelector('.grade-input');

                if (!input?.value) {
                    UiManager.showNotification('Por favor ingrese una calificación', 'error');
                    return;
                }

                const grade = parseFloat(input.value);
                if (!this.isValidGrade(grade)) {
                    UiManager.showNotification('La calificación debe estar entre 0 y 100', 'error');
                    return;
                }

                await this.saveGrade(
                    button.dataset.taskId,
                    button.dataset.studentId,
                    grade
                );
            });
        });
    }

    validateGradeInput(e) {
        let value = parseFloat(e.target.value);
        if (value < 0) e.target.value = 0;
        if (value > 100) e.target.value = 100;
    }

    async saveGrade(taskId, studentId, grade) {
        const button = document.querySelector(`.btn-save-grade[data-student-id="${studentId}"]`);
        const row = button.closest('tr');
        const input = row.querySelector('.grade-input');
        
        try {
            console.log('Guardando calificación:', { taskId, studentId, grade });
            
            button.disabled = true;
            if (input) input.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const result = await this.api.saveGrade({
                taskId: parseInt(taskId),
                studentId: parseInt(studentId),
                grade: parseFloat(grade)
            });
    
            console.log('Resultado al guardar calificación:', result);
    
            if (result.ok) {
                UiManager.showNotification('Calificación guardada exitosamente', 'success');
                
                // Actualizar el submission local
                const submissionIndex = this.submissions.findIndex(
                    s => s.estudiante_id === parseInt(studentId)
                );
    
                const updatedSubmission = {
                    estudiante_id: parseInt(studentId),
                    tarea_id: parseInt(taskId),
                    calificacion: grade,
                    estado: 'entregado'
                };
    
                if (submissionIndex !== -1) {
                    this.submissions[submissionIndex] = {
                        ...this.submissions[submissionIndex],
                        ...updatedSubmission
                    };
                } else {
                    this.submissions.push(updatedSubmission);
                }
    
                // Actualizar la vista
                const estadoSelect = row.querySelector('.estado-select');
                const calificacionCell = row.querySelector('td:nth-child(4)');
                
                if (estadoSelect) estadoSelect.value = 'entregado';
                if (calificacionCell) calificacionCell.innerHTML = `<span class="grade">${grade}</span>`;
                
                // Remover el botón de guardar
                const accionesCell = row.querySelector('td:last-child');
                if (accionesCell) accionesCell.innerHTML = '';
    
                // Notificar la actualización
                document.dispatchEvent(new CustomEvent('gradesUpdated'));
                
                return true;
            } else {
                throw new Error(result.error || 'Error al guardar la calificación');
            }
        } catch (error) {
            console.error('Error al guardar calificación:', error);
            UiManager.showNotification(error.message || 'Error al guardar la calificación', 'error');
            return false;
        } finally {
            if (button && button.isConnected) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-save"></i>';
            }
            if (input && input.isConnected) {
                input.disabled = false;
            }

        }
    }

    isValidGrade(grade) {
        return !isNaN(grade) && grade >= 0 && grade <= 100;
    }
}