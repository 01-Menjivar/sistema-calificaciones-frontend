import { SERVER_IP } from "../utils/Config.js"


class Register {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.togglePasswordButtons = document.querySelectorAll('.toggle-password');
        this.errorMessage = document.getElementById('error-message');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.togglePasswordButtons.forEach(button => {
            button.addEventListener('click', (e) => this.togglePasswordVisibility(e.target));
        });
        
        // Validación en tiempo real
        this.nameInput.addEventListener('input', () => this.validateName());
        this.emailInput.addEventListener('input', () => this.validateEmail());
        this.passwordInput.addEventListener('input', () => this.validatePassword());
        this.confirmPasswordInput.addEventListener('input', () => this.validateConfirmPassword());
    }

    validateName() {
        const nameError = document.getElementById('name-error');
        const name = this.nameInput.value.trim();

        if (!name) {
            this.showError(nameError, 'El nombre es requerido');
            return false;
        }
        if (name.length < 3) {
            this.showError(nameError, 'El nombre debe tener al menos 3 caracteres');
            return false;
        }

        this.hideError(nameError);
        return true;
    }

    validateEmail() {
        const emailError = document.getElementById('email-error');
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        const password = this.passwordInput.value;

        if (!password) {
            this.showError(passwordError, 'La contraseña es requerida');
            return false;
        }
        if (password.length < 6) {
            this.showError(passwordError, 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }

        // Validación adicional de seguridad
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
            this.showError(passwordError, 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales');
            return false;
        }

        this.hideError(passwordError);
        return true;
    }

    validateConfirmPassword() {
        const confirmPasswordError = document.getElementById('confirmPassword-error');
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (!confirmPassword) {
            this.showError(confirmPasswordError, 'Confirma tu contraseña');
            return false;
        }
        if (password !== confirmPassword) {
            this.showError(confirmPasswordError, 'Las contraseñas no coinciden');
            return false;
        }

        this.hideError(confirmPasswordError);
        return true;
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
        }
        if (this.form) {
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
        }
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
        if (this.form) {
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = false;
        }
    }

    togglePasswordVisibility(button) {
        const input = button.closest('.password-container').querySelector('input');
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.textContent = type === 'password' ? '👁️' : '🔒';
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateName() || 
            !this.validateEmail() || 
            !this.validatePassword() || 
            !this.validateConfirmPassword()) {
            return;
        }

        const formData = {
            nombre: this.nameInput.value.trim(),
            email: this.emailInput.value.trim(),
            contraseña: this.passwordInput.value
        };

        try {
            this.showLoading();
            this.hideError(this.errorMessage);

            const response = await fetch(`http://${SERVER_IP}:3000/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Mostrar mensaje de éxito
                this.showSuccessMessage('Registro exitoso! Redirigiendo al login...');
                
                // Esperar 2 segundos antes de redirigir
                setTimeout(() => {
                    window.location.href = '/src/views/login.html';
                }, 2000);
            } else {
                this.showError(this.errorMessage, data.error || 'Error al registrarse');
            }
        } catch (error) {
            console.error('Error en el registro:', error);
            this.showError(this.errorMessage, 'Error de conexión. Por favor, intente nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            text-align: center;
        `;
        this.form.insertBefore(successDiv, this.form.firstChild);
    }
}

// Inicializar la clase Register cuando se carga el documento
document.addEventListener('DOMContentLoaded', () => {
    new Register();
});