document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const operatorPanel = document.getElementById('operator-panel');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const logoutButton = document.getElementById('logout-button');

    // Проверяем, был ли пользователь уже авторизован
    if (localStorage.getItem('operatorLoggedIn') === 'true') {
        loginForm.style.display = 'none';
        operatorPanel.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        operatorPanel.style.display = 'none';
    }

    // Обработка клика по кнопке "Войти"
    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        // TODO: Для безопасности переместить проверку пароля на сервер
        if (password === '1') {
            localStorage.setItem('operatorLoggedIn', 'true');
            loginForm.style.display = 'none';
            operatorPanel.style.display = 'block';
        } else {
            errorMessage.style.display = 'block';
        }
    });

    // Вход по нажатию Enter
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginButton.click();
        }
    });

    // Обработка выхода
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('operatorLoggedIn');
        operatorPanel.style.display = 'none';
        loginForm.style.display = 'block';
        passwordInput.value = '';
        errorMessage.style.display = 'none';
        passwordInput.focus();
    });
});