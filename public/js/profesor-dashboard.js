document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    taskManager.init().catch(console.error);
});