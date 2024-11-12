// student-dashboard.js
class StudentDashboard {
    constructor() {
        this.api = new ApiService();
        this.userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        this.grades = [];
        this.average = 0;
    }

    async init() {
        if (!this.checkAuth()) return;
        await this.loadGrades();
    }

    checkAuth() {
        if (!localStorage.getItem('token') || this.userInfo.rol !== 'estudiante') {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    async loadGrades() {
        try {
            const response = await this.api.fetchWithAuth(`/api/grades/student/${this.userInfo.id}`);
            
            if (!response || !response.ok) {
                throw new Error('Error al cargar calificaciones');
            }

            const data = await response.json();
            console.log('Datos de calificaciones:', data);

            this.grades = Array.isArray(data.calificaciones) ? data.calificaciones : [];
            this.average = typeof data.promedio_final === 'number' ? data.promedio_final : null;

            this.renderGrades();
            this.updateAverage();
        } catch (error) {
            console.error('Error:', error);
            UiManager.showNotification('Error al cargar calificaciones', 'error');
        }
    }

    formatGrade(grade) {
        if (grade === null || grade === undefined) return '-';
        const numGrade = parseFloat(grade);
        return isNaN(numGrade) ? '-' : numGrade.toFixed(1);
    }

    getStatusClass(grade) {
        if (grade === null || grade === undefined) return 'status-pending';
        return parseFloat(grade) >= 0 ? 'status-graded' : 'status-pending';
    }

    getStatusText(grade) {
        if (grade === null || grade === undefined) return 'Pendiente';
        return parseFloat(grade) >= 0 ? 'Calificado' : 'Pendiente';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date) 
                ? date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : '-';
        } catch {
            return '-';
        }
    }

    calculateCurrentAverage() {
        if (!this.grades.length) return '-';
        
        let totalWeight = 0;
        let weightedSum = 0;
        let totalGrades = 0;

        this.grades.forEach(grade => {
            if (grade.calificacion !== null && grade.calificacion !== undefined) {
                const calificacion = parseFloat(grade.calificacion);
                const ponderacion = parseFloat(grade.ponderacion);
                
                if (!isNaN(calificacion) && !isNaN(ponderacion)) {
                    weightedSum += calificacion * (ponderacion / 100);
                    totalWeight += ponderacion;
                    totalGrades++;
                }
            }
        });

        if (totalGrades === 0) return '-';
        return (weightedSum * (100 / totalWeight)).toFixed(1);
    }

    renderGrades() {
        const tbody = document.querySelector('#gradesTable tbody');
        if (!tbody) {
            console.error('Tabla de calificaciones no encontrada');
            return;
        }

        tbody.innerHTML = '';

        if (!Array.isArray(this.grades) || this.grades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay calificaciones disponibles</td>
                </tr>
            `;
            return;
        }

        // Renderizar las filas de calificaciones
        this.grades.forEach(grade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${grade.tarea || 'Sin título'}</td>
                <td>${grade.ponderacion || '0'}%</td>
                <td class="grade">${this.formatGrade(grade.calificacion)}</td>
                <td>${this.formatDate(grade.fecha_calificacion)}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(grade.calificacion)}">
                        ${this.getStatusText(grade.calificacion)}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Añadir fila de promedio
        const averageRow = document.createElement('tr');
        averageRow.classList.add('average-row');
        averageRow.innerHTML = `
            <td><strong>Promedio</strong></td>
            <td>100%</td>
            <td class="grade"><strong>${this.calculateCurrentAverage()}</strong></td>
            <td>-</td>
            <td>
                <span class="status-badge status-info">
                    Promedio Actual
                </span>
            </td>
        `;
        tbody.appendChild(averageRow);
    }

    updateAverage() {
        const averageElement = document.getElementById('average');
        if (!averageElement) {
            console.error('Elemento de promedio no encontrado');
            return;
        }

        const currentAverage = this.calculateCurrentAverage();
        if (currentAverage === '-') {
            averageElement.textContent = '--';
            averageElement.title = 'No hay calificaciones suficientes para calcular el promedio';
        } else {
            averageElement.textContent = currentAverage;
            averageElement.title = 'Promedio ponderado de todas las calificaciones';
        }
    }
}

// Inicializar el dashboard
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new StudentDashboard();
    dashboard.init().catch(error => {
        console.error('Error inicializando dashboard:', error);
        UiManager.showNotification('Error al inicializar el dashboard', 'error');
    });
});