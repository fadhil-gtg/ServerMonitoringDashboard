/**
 * login.js - Login Page JavaScript
 * Server Monitoring Dashboard - PKWU SMK TKJ 2026
 */

// Credentials
const CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const loginBtn = document.getElementById('login-btn');
  const errorMsg = document.getElementById('login-error');

  // Redirect if already logged in
  if (sessionStorage.getItem('smd_auth') === 'true') {
    window.location.href = 'dashboard.html';
    return;
  }

  // Toggle password visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      const icon = togglePasswordBtn.querySelector('i');
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }

  // Input focus effects
  [usernameInput, passwordInput].forEach(input => {
    input.addEventListener('focus', () => {
      input.closest('.input-group').classList.add('focused');
    });
    input.addEventListener('blur', () => {
      input.closest('.input-group').classList.remove('focused');
    });
    input.addEventListener('input', () => {
      clearError();
    });
  });

  // Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLogin();
    });
  }

  async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validate empty fields
    if (!username) {
      showError('Username tidak boleh kosong');
      shakeInput(usernameInput);
      return;
    }

    if (!password) {
      showError('Password tidak boleh kosong');
      shakeInput(passwordInput);
      return;
    }

    // Simulate loading
    setLoading(true);
    await sleep(1200);

    // Check credentials
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      // Success
      sessionStorage.setItem('smd_auth', 'true');
      sessionStorage.setItem('smd_user', username);
      sessionStorage.setItem('smd_login_time', new Date().toISOString());
      showSuccess();
      await sleep(600);
      window.location.href = 'dashboard.html';
    } else {
      setLoading(false);
      if (username !== CREDENTIALS.username) {
        showError('Username tidak ditemukan');
        shakeInput(usernameInput);
      } else {
        showError('Password salah. Silakan coba lagi.');
        shakeInput(passwordInput);
        passwordInput.value = '';
      }
    }
  }

  function showError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.classList.add('visible');
    }
  }

  function clearError() {
    if (errorMsg) errorMsg.classList.remove('visible');
  }

  function showSuccess() {
    loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Berhasil!';
    loginBtn.classList.add('success');
    loginBtn.disabled = true;
  }

  function setLoading(state) {
    if (state) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span> Memverifikasi...';
    } else {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login ke Dashboard';
    }
  }

  function shakeInput(input) {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 600);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Particle effect for login
  initLoginParticles();
});

function initLoginParticles() {
  const canvas = document.getElementById('login-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    o: Math.random() * 0.3 + 0.05
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${p.o})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}
