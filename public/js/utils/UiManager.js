class UiManager {
    static notifications = [];

    static showNotification(message, type = 'info') {
        // Remover notificaciones anteriores
        this.notifications.forEach(notification => {
            notification.remove();
        });
        this.notifications = [];

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Calcular posición basada en notificaciones existentes
        const offset = this.notifications.length * 60;
        notification.style.top = `${20 + offset}px`;

        document.body.appendChild(notification);
        this.notifications.push(notification);

        setTimeout(() => {
            notification.remove();
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 3000);
    }

    static formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    static getBadgeClass(dificultad) {
        const classes = {
            'facil': 'success',
            'media': 'warning',
            'dificil': 'danger'
        };
        return classes[dificultad.toLowerCase()] || 'primary';
    }

    static capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static normalizeDificultad(nivel) {
        return nivel.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }
}