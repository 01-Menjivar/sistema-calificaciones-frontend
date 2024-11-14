class Auth {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordButton = document.getElementById('togglePassword');
        this.errorMessage = document.getElementById('error-message');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Verificar que todos los elementos existan
        this.validateElements();

        // Agregar manejo de token
        this.token = localStorage.getItem('token');
        
        this.setupEventListeners();
    }

    validateElements() {
        const elements = {
            form: this.form,
            emailInput: this.emailInput,
            passwordInput: this.passwordInput,
            togglePasswordButton: this.togglePasswordButton,
            errorMessage: this.errorMessage,
            loadingSpinner: this.loadingSpinner
        };

        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`Elemento ${name} no encontrado en el DOM`);
            }
        }
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.togglePasswordButton) {
            this.togglePasswordButton.addEventListener('click', () => this.togglePasswordVisibility());
        }
        if (this.emailInput) {
            this.emailInput.addEventListener('input', () => this.validateEmail());
        }
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.validatePassword());
        }
    }

    validateEmail() {
        const emailError = document.getElementById('email-error');
        if (!emailError) {
            console.error('Elemento email-error no encontrado');
            return false;
        }

        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        console.log('Validando email:', email);

        if (!email) {
            this.showError(emailError, 'El correo electrónico es requerido');
            return false;
        }
        if (!emailRegex.test(email)) {
            this.showError(emailError, 'Ingrese un correo electrónico válido');
            return false;
        }

        this.hideError(emailError);
        return true;
    }

    validatePassword() {
        const passwordError = document.getElementById('password-error');
        if (!passwordError) {
            console.error('Elemento password-error no encontrado');
            return false;
        }

        const password = this.passwordInput.value;
        console.log('Validando contraseña, longitud:', password.length);

        if (!password) {
            this.showError(passwordError, 'La contraseña es requerida');
            return false;
        }
        if (password.length < 6) {
            this.showError(passwordError, 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }

        this.hideError(passwordError);
        return true;
    }

    showError(element, message) {
        console.error('Error mostrado:', message);
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        this.togglePasswordButton.textContent = type === 'password' ? '👁️' : '🔒';
        console.log('Visibilidad de contraseña cambiada a:', type);
    }

    showLoading() {
        console.log('Mostrando estado de carga...');
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
        }
        if (this.form) {
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
            } else {
                console.error('Botón submit no encontrado');
            }
        }
    }

    hideLoading() {
        console.log('Ocultando estado de carga...');
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
        if (this.form) {
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    redirectBasedOnRole(rol) {
        // Asumiendo que tienes estas páginas en tu proyecto
        const redirectMap = {
            'director': 'dashSadmin.html',
            'profesor': 'professorDash.html',
            'estudiante': 'studentDashboard.html'
        };
        
        const redirectUrl = redirectMap[rol] || 'landing.html';
        window.location.href = redirectUrl;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateEmail() || !this.validatePassword()) {
            return;
        }

        const formData = {
            email: this.emailInput.value.trim(),
            contraseña: this.passwordInput.value
        };

        try {
            this.showLoading();
            this.hideError(this.errorMessage);

            const response = await fetch(`http://${SERVER_IP}:3000/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Guardar el token
                localStorage.setItem('token', data.token);
                
                // Guardar información del usuario
                sessionStorage.setItem('userInfo', JSON.stringify({
                    id: data.user.id,
                    nombre: data.user.nombre,
                    rol: data.user.rol
                }));

                this.redirectBasedOnRole(data.user.rol);
            } else {
                this.showError(this.errorMessage, data.error || 'Error al iniciar sesión');
            }
        } catch (error) {
            this.showError(this.errorMessage, 'Error de conexión. Por favor, intente nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    // Método estático para hacer peticiones autenticadas
    static async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = '/views/login.html';
            return;
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                // Token expirado
                localStorage.removeItem('token');
                window.location.href = '/views/login.html';
                return;
            }

            return response;
        } catch (error) {
            console.error('Error en la petición:', error);
            throw error;
        }
    }

    // Método para cerrar sesión
    static logout() {
        localStorage.removeItem('token');
        sessionStorage.removeItem('userInfo');
        window.location.href = '/views/login.html';
    }

    

}



// Inicializar la clase Auth cuando se carga el documento
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando Auth...');
    new Auth();
});