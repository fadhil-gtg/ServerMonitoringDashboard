/**
 * dashboard.js - Monitoring Dashboard Logic
 * Server Monitoring Dashboard - PKWU SMK TKJ 2026
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ── AUTH CHECK ────────────────────────────────────────────
  if (sessionStorage.getItem('smd_auth') !== 'true') {
    window.location.href = 'login.html';
    return;
  }

  const username = sessionStorage.getItem('smd_user') || 'admin';
  const loadingEl = document.getElementById('loading-overlay');

  // ── INSTANCES ─────────────────────────────────────────────
  let prometheus = new PrometheusAPI('http://localhost:9090');
  let simulator = new SimulatedMetrics();
  let useSimulator = true;
  let refreshInterval = null;
  let refreshRate = 5000;
  let chartData = { cpu: [], ram: [], disk: [], labels: [] };
  const MAX_POINTS = 24; // 2 minutes at 5s interval

  // ── CHARTS ───────────────────────────────────────────────
  let cpuChart, ramChart, diskChart;

  function getChartDefaults(color, fillColor) {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: color,
          backgroundColor: fillColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(6,11,23,0.95)',
            borderColor: color,
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            padding: 10,
            callbacks: {
              label: ctx => `${ctx.parsed.y.toFixed(1)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: { color: '#4a5568', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 6 }
          },
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: { color: '#4a5568', font: { size: 10, family: 'JetBrains Mono' }, callback: v => v + '%' }
          }
        }
      }
    };
  }

  function initCharts() {
    const cpuCtx = document.getElementById('cpu-chart')?.getContext('2d');
    const ramCtx = document.getElementById('ram-chart')?.getContext('2d');
    const diskCtx = document.getElementById('disk-chart')?.getContext('2d');

    if (cpuCtx) {
      cpuChart = new Chart(cpuCtx, getChartDefaults(
        '#00d4ff',
        'rgba(0,212,255,0.08)'
      ));
    }

    if (ramCtx) {
      ramChart = new Chart(ramCtx, getChartDefaults(
        '#00ff9d',
        'rgba(0,255,157,0.08)'
      ));
    }

    if (diskCtx) {
      diskChart = new Chart(diskCtx, getChartDefaults(
        '#a78bfa',
        'rgba(167,139,250,0.08)'
      ));
    }
  }

  function addChartPoint(chart, label, value) {
    if (!chart) return;
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update('none');
  }

  // ── UI UPDATE ─────────────────────────────────────────────
  function updateMetricCard(id, value, extraFn) {
    const el = document.getElementById(id);
    if (el) el.textContent = value !== null ? value.toFixed(1) + '%' : '--';
    if (extraFn) extraFn(value);
  }

  function updateBar(id, value) {
    const el = document.getElementById(id);
    if (el) el.style.width = (value !== null ? Math.min(value, 100) : 0) + '%';
  }

  function setMetricColor(cardClass, value) {
    const card = document.querySelector(`.metric-card.${cardClass}`);
    if (!card) return;
    if (value > 90) card.classList.add('critical');
    else if (value > 70) card.classList.add('warning');
    else { card.classList.remove('critical', 'warning'); }
  }

  function updateServerStatus(online) {
    const led = document.getElementById('server-led');
    const statusText = document.getElementById('server-status-text');
    const sidebarLed = document.querySelector('.status-led-large');
    const sidebarStatus = document.querySelector('.server-status-value');

    if (led) {
      led.className = online ? 'status-led-large' : 'status-led-large offline';
    }
    if (statusText) {
      statusText.textContent = online ? 'ONLINE' : 'OFFLINE';
      statusText.className = online ? 'server-status-value' : 'server-status-value offline';
    }
    if (sidebarLed) sidebarLed.className = online ? 'status-led-large' : 'status-led-large offline';
    if (sidebarStatus) {
      sidebarStatus.textContent = online ? 'ONLINE' : 'OFFLINE';
      sidebarStatus.className = online ? 'server-status-value' : 'server-status-value offline';
    }
  }

  function formatUptime(seconds) {
    if (!seconds) return '--';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  function formatBytes(bytes) {
    if (!bytes) return '--';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  function getTimestamp() {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function updateClock() {
    const el = document.getElementById('topbar-time');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID');
  }

  // ── LOGS ─────────────────────────────────────────────────
  const logMessages = [
    ['OK', 'Prometheus scrape successful'],
    ['OK', 'node_exporter metrics collected'],
    ['INFO', 'CPU metrics updated'],
    ['INFO', 'Memory stats refreshed'],
    ['OK', 'Disk I/O monitored'],
    ['INFO', 'Network interfaces scanned'],
    ['WARN', 'CPU usage above 80%'],
    ['OK', 'All services healthy'],
    ['INFO', 'Dashboard data refreshed'],
    ['OK', 'Connection to Prometheus stable'],
    ['INFO', 'Collecting system metrics...'],
    ['WARN', 'Memory usage high'],
    ['OK', 'Disk space within limits'],
  ];

  function addLog(level, msg) {
    const container = document.getElementById('log-body');
    if (!container) return;

    const levelClass = {
      'OK': 'log-level-ok',
      'INFO': 'log-level-info',
      'WARN': 'log-level-warn',
      'ERR': 'log-level-err'
    }[level] || 'log-level-info';

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-time">${getTimestamp()}</span>
      <span class="${levelClass}">[${level}]</span>
      <span class="log-msg">${msg}</span>
    `;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;

    // Keep only last 50 entries
    while (container.children.length > 50) {
      container.removeChild(container.firstChild);
    }
  }

  function addRandomLog() {
    const [level, msg] = logMessages[Math.floor(Math.random() * logMessages.length)];
    addLog(level, msg);
  }

  // ── FETCH & UPDATE ────────────────────────────────────────
  async function fetchAndUpdate() {
    try {
      let metrics;

      if (!useSimulator) {
        // Try real Prometheus
        const realMetrics = await prometheus.fetchAllMetrics();
        if (prometheus.isConnected) {
          metrics = realMetrics;
        } else {
          useSimulator = true;
          metrics = await simulator.fetchAllMetrics();
          showToast('info', 'Beralih ke mode simulasi');
        }
      } else {
        metrics = await simulator.fetchAllMetrics();
      }

      const { cpu, ram, disk, netRx, netTx, uptime } = metrics;
      const timeLabel = getTimestamp();
      const isOnline = cpu !== null;

      updateServerStatus(isOnline || useSimulator);

      // Update metric cards
      const cpuVal = cpu ?? 0;
      const ramVal = ram ?? 0;
      const diskVal = disk ?? 0;
      const netVal = (netRx ?? 0);

      updateMetricCard('metric-cpu', cpuVal);
      updateMetricCard('metric-ram', ramVal);
      updateMetricCard('metric-disk', diskVal);

      const netEl = document.getElementById('metric-net');
      if (netEl) netEl.textContent = netRx !== null ? netRx.toFixed(0) + ' KB/s' : '--';

      updateBar('bar-cpu', cpuVal);
      updateBar('bar-ram', ramVal);
      updateBar('bar-disk', diskVal);
      updateBar('bar-net', Math.min((netRx / 1024) * 100, 100));

      // Uptime
      const uptimeEl = document.getElementById('info-uptime');
      if (uptimeEl) uptimeEl.textContent = formatUptime(uptime);

      // Charts
      addChartPoint(cpuChart, timeLabel, cpuVal);
      addChartPoint(ramChart, timeLabel, ramVal);
      addChartPoint(diskChart, timeLabel, diskVal);

      // Status indicator
      const modeEl = document.getElementById('data-mode');
      if (modeEl) modeEl.textContent = useSimulator ? 'SIMULASI' : 'LIVE';

      // Network detail
      const rxEl = document.getElementById('net-rx');
      const txEl = document.getElementById('net-tx');
      if (rxEl) rxEl.textContent = (netRx ?? 0).toFixed(1) + ' KB/s';
      if (txEl) txEl.textContent = (netTx ?? 0).toFixed(1) + ' KB/s';

      // Last update
      const lastEl = document.getElementById('last-update');
      if (lastEl) lastEl.textContent = timeLabel;

      // Random log
      if (Math.random() > 0.4) addRandomLog();

    } catch (err) {
      console.error('[Dashboard] Error fetching metrics:', err);
      addLog('ERR', 'Failed to fetch metrics: ' + err.message);
    }
  }

  // ── CONNECT BUTTON ────────────────────────────────────────
  const connectBtn = document.getElementById('connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const urlInput = document.getElementById('prometheus-url');
      const url = urlInput?.value?.trim();

      if (!url) {
        showToast('warning', 'Masukkan Prometheus URL');
        return;
      }

      connectBtn.textContent = 'Menghubungkan...';
      connectBtn.disabled = true;

      prometheus.setBaseUrl(url);
      const connected = await prometheus.testConnection();

      connectBtn.disabled = false;
      connectBtn.innerHTML = '<i class="fas fa-plug"></i> Hubungkan';

      if (connected) {
        useSimulator = false;
        showToast('success', `✓ Terhubung ke ${url}`);
        addLog('OK', `Connected to Prometheus: ${url}`);
      } else {
        useSimulator = true;
        showToast('error', 'Gagal terhubung. Menggunakan data simulasi.');
        addLog('WARN', `Cannot connect to ${url}, using simulation`);
      }

      // Immediate update
      await fetchAndUpdate();
    });
  }

  // ── REFRESH INTERVAL SELECTOR ─────────────────────────────
  const intervalSelect = document.getElementById('refresh-interval');
  if (intervalSelect) {
    intervalSelect.addEventListener('change', () => {
      refreshRate = parseInt(intervalSelect.value) * 1000;
      clearInterval(refreshInterval);
      refreshInterval = setInterval(fetchAndUpdate, refreshRate);
      showToast('info', `Interval diperbarui: ${intervalSelect.value}s`);
    });
  }

  // ── LOGOUT ────────────────────────────────────────────────
  document.querySelectorAll('.btn-logout, #logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.removeItem('smd_auth');
      sessionStorage.removeItem('smd_user');
      window.location.href = 'login.html';
    });
  });

  // ── SIDEBAR TOGGLE (mobile) ────────────────────────────────
  const hamburgerDb = document.getElementById('hamburger-db');
  const sidebar = document.querySelector('.db-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (hamburgerDb && sidebar) {
    hamburgerDb.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    });
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
      });
    }
  }

  // ── TOAST ─────────────────────────────────────────────────
  function showToast(type, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'check-circle', error: 'times-circle', info: 'info-circle', warning: 'exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}" style="color:var(--accent-${type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'cyan'})"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ── INIT ──────────────────────────────────────────────────
  async function init() {
    // Hide loading
    await new Promise(r => setTimeout(r, 1200));
    if (loadingEl) loadingEl.classList.add('hidden');

    // Set username display
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = username);

    // Init charts
    initCharts();

    // Load initial system info
    const cores = await simulator.getCPUCores();
    const totalRam = await simulator.getTotalRAM();
    const totalDisk = await simulator.getTotalDisk();

    const coresEl = document.getElementById('info-cores');
    const ramEl = document.getElementById('info-total-ram');
    const diskEl = document.getElementById('info-total-disk');
    const osEl = document.getElementById('info-os');

    if (coresEl) coresEl.textContent = cores + ' Core';
    if (ramEl) ramEl.textContent = formatBytes(totalRam);
    if (diskEl) diskEl.textContent = formatBytes(totalDisk);
    if (osEl) osEl.textContent = 'Ubuntu 22.04 LTS';

    // Add initial logs
    addLog('OK', 'Dashboard initialized successfully');
    addLog('INFO', 'Loading system metrics...');
    addLog('OK', 'Chart.js loaded');
    addLog('INFO', 'Using simulated data mode');
    addLog('OK', 'Monitoring service started');

    // First fetch
    await fetchAndUpdate();

    // Start interval
    refreshInterval = setInterval(fetchAndUpdate, refreshRate);

    // Clock
    setInterval(updateClock, 1000);
    updateClock();

    showToast('info', 'Dashboard aktif — Mode Simulasi');
  }

  init();
});
