class ApiService {
    
    constructor(baseUrl = "http://192.168.1.19:3000") {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('token');
    }

    async fetchWithAuth(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                this.handleUnauthorized();
                return null;
            }

            return response;
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    }

    handleUnauthorized() {
        localStorage.removeItem('token');
        sessionStorage.removeItem('userInfo');
        window.location.href = '/login.html';
    }

    async getTasks() {
        const response = await this.fetchWithAuth('/api/listtask');
        if (!response?.ok) return [];
        const data = await response.json();
        return data.tareas || [];
    }

    async getStudents() {
        const response = await this.fetchWithAuth('/api/students');
        if (!response?.ok) return [];
        const data = await response.json();
        return data || [];
    }


    async getTaskSubmissions(taskId) {
        try {
            const response = await this.fetchWithAuth(`/api/task-submissions/${taskId}`);
            if (!response.ok) throw new Error('Error al obtener entregas');
            return await response.json();
        } catch (error) {
            console.error('Error en getTaskSubmissions:', error);
            return [];
        }
    }

    async createTask(taskData) {
        const response = await this.fetchWithAuth('/api/assign-task', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        return response?.ok;
    }

    async updateTask(taskId, taskData) {
        const response = await this.fetchWithAuth(`/api/edit-task/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
        return response?.ok;
    }

    async deleteTask(taskId) {
        const response = await this.fetchWithAuth(`/api/delete-task/${taskId}`, {
            method: 'DELETE'
        });
        return response?.ok;
    }


    async saveGrade(gradeData) {
        try {
            console.log('Enviando calificación:', gradeData);

            const response = await this.fetchWithAuth('/api/professor/add-grade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gradeData)
            });

            if (!response) {
                throw new Error('No se recibió respuesta del servidor');
            }

            const data = await response.json();
            console.log('Respuesta del servidor:', data);

            return {
                ok: response.ok,
                data: data
            };
        } catch (error) {
            console.error('Error en saveGrade:', error);
            return {
                ok: false,
                error: error.message || 'Error al guardar la calificación'
            };
        }
    }

    async updateSubmissionStatus(data) {
        const response = await this.fetchWithAuth('/api/update-submission-status', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response?.ok || false;
    }

}

