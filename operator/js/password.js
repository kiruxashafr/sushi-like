document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const operatorPanel = document.getElementById('operator-panel');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const logoutButton = document.getElementById('logout-button');
    const loginOverlay = document.createElement('div');
    loginOverlay.id = 'login-overlay';
    document.body.appendChild(loginOverlay);

    // Function to toggle login form and overlay visibility
    function toggleLogin(show) {
        loginForm.classList.toggle('active', show);
        loginOverlay.classList.toggle('active', show);
        loginOverlay.style.display = show ? 'block' : 'none';
        operatorPanel.style.display = show ? 'none' : 'block';
    }

    // Check if user is already logged in
    if (localStorage.getItem('operatorLoggedIn') === 'true') {
        toggleLogin(false);
    } else {
        toggleLogin(true);
        passwordInput.focus();
    }

    // Handle login button click
    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        // TODO: Move password check to server for security
        if (password === '1') {
            localStorage.setItem('operatorLoggedIn', 'true');
            toggleLogin(false);
        } else {
            errorMessage.style.display = 'block';
        }
    });

    // Login on Enter key press
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginButton.click();
        }
    });

    // Handle logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('operatorLoggedIn');
        toggleLogin(true);
        passwordInput.value = '';
        errorMessage.style.display = 'none';
        passwordInput.focus();
    });

    // Prevent overlay from closing form on click (optional)
    loginOverlay.addEventListener('click', () => {
        // Do nothing to prevent accidental closure
    });
});