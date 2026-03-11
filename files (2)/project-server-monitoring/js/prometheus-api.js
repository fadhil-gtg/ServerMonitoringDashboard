/**
 * prometheus-api.js - Prometheus API Integration
 * Server Monitoring Dashboard - PKWU SMK TKJ 2026
 *
 * Handles all communication with Prometheus HTTP API.
 * Falls back to simulated data when Prometheus is unreachable.
 */

class PrometheusAPI {
  constructor(baseUrl = 'http://localhost:9090') {
    this.baseUrl = baseUrl;
    this.isConnected = false;
    this.lastFetch = null;
  }

  setBaseUrl(url) {
    // Normalize URL - remove trailing slash
    this.baseUrl = url.replace(/\/$/, '');
    this.isConnected = false;
    console.info(`[Prometheus] Base URL updated to: ${this.baseUrl}`);
  }

  /**
   * Execute a PromQL instant query
   * @param {string} query - PromQL expression
   * @returns {Promise<number|null>}
   */
  async query(promqlQuery) {
    const endpoint = `${this.baseUrl}/api/v1/query`;
    const params = new URLSearchParams({ query: promqlQuery });

    try {
      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(`Prometheus error: ${data.error || 'Unknown'}`);
      }

      this.isConnected = true;
      this.lastFetch = new Date();

      const result = data.data.result;
      if (result && result.length > 0) {
        return parseFloat(result[0].value[1]);
      }
      return 0;

    } catch (err) {
      this.isConnected = false;
      console.warn(`[Prometheus] Query failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Test connection to Prometheus
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/-/ready`, {
        signal: AbortSignal.timeout(3000)
      });
      this.isConnected = response.ok;
      return response.ok;
    } catch {
      try {
        // fallback: try /api/v1/query with simple query
        const result = await this.query('1');
        this.isConnected = result !== null;
        return this.isConnected;
      } catch {
        this.isConnected = false;
        return false;
      }
    }
  }

  // ─── METRIC QUERIES ───────────────────────────────────────

  /**
   * CPU Usage (%)
   * 100 - avg idle percentage across all cores
   */
  async getCPUUsage() {
    return await this.query(
      '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
    );
  }

  /**
   * RAM Usage (%)
   */
  async getRAMUsage() {
    return await this.query(
      '(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100'
    );
  }

  /**
   * Disk Usage (%)
   * Main filesystem only (exclude tmpfs, rootfs duplicates)
   */
  async getDiskUsage() {
    return await this.query(
      'max((node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"} - node_filesystem_free_bytes{mountpoint="/",fstype!="rootfs"}) / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"} * 100)'
    );
  }

  /**
   * Network Receive (KB/s)
   */
  async getNetworkRx() {
    const bytes = await this.query(
      'sum(irate(node_network_receive_bytes_total{device!="lo"}[1m]))'
    );
    return bytes !== null ? bytes / 1024 : null;
  }

  /**
   * Network Transmit (KB/s)
   */
  async getNetworkTx() {
    const bytes = await this.query(
      'sum(irate(node_network_transmit_bytes_total{device!="lo"}[1m]))'
    );
    return bytes !== null ? bytes / 1024 : null;
  }

  /**
   * System Uptime (seconds)
   */
  async getUptime() {
    return await this.query('node_time_seconds - node_boot_time_seconds');
  }

  /**
   * Total RAM (bytes)
   */
  async getTotalRAM() {
    return await this.query('node_memory_MemTotal_bytes');
  }

  /**
   * Total Disk (bytes)
   */
  async getTotalDisk() {
    return await this.query(
      'node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}'
    );
  }

  /**
   * CPU Core Count
   */
  async getCPUCores() {
    return await this.query('count(node_cpu_seconds_total{mode="idle"})');
  }

  /**
   * Load Average 1m
   */
  async getLoadAvg1m() {
    return await this.query('node_load1');
  }

  /**
   * Fetch all metrics in one batch
   */
  async fetchAllMetrics() {
    const [cpu, ram, disk, netRx, netTx, uptime] = await Promise.all([
      this.getCPUUsage(),
      this.getRAMUsage(),
      this.getDiskUsage(),
      this.getNetworkRx(),
      this.getNetworkTx(),
      this.getUptime()
    ]);

    return { cpu, ram, disk, netRx, netTx, uptime };
  }
}

// ─── SIMULATED DATA FALLBACK ──────────────────────────────────
class SimulatedMetrics {
  constructor() {
    this._cpu = 35;
    this._ram = 58;
    this._disk = 42;
    this._netRx = 120;
    this._netTx = 85;
    this._uptime = 86400 * 3 + 7200; // 3 days 2 hours
  }

  _drift(value, range, min = 0, max = 100) {
    const delta = (Math.random() - 0.5) * range;
    return Math.min(max, Math.max(min, value + delta));
  }

  async fetchAllMetrics() {
    // Simulate realistic metric fluctuations
    this._cpu = this._drift(this._cpu, 8, 2, 95);
    this._ram = this._drift(this._ram, 3, 20, 95);
    this._disk = this._drift(this._disk, 0.5, 10, 98);
    this._netRx = this._drift(this._netRx, 40, 0, 2048);
    this._netTx = this._drift(this._netTx, 30, 0, 1024);
    this._uptime += 5;

    return {
      cpu: this._cpu,
      ram: this._ram,
      disk: this._disk,
      netRx: this._netRx,
      netTx: this._netTx,
      uptime: this._uptime,
      simulated: true
    };
  }

  async getCPUCores() { return 4; }
  async getTotalRAM() { return 8 * 1024 * 1024 * 1024; } // 8GB
  async getTotalDisk() { return 50 * 1024 * 1024 * 1024; } // 50GB
  async getLoadAvg1m() { return (this._cpu / 100 * 3.8).toFixed(2); }
}

// ─── EXPORTS ──────────────────────────────────────────────────
window.PrometheusAPI = PrometheusAPI;
window.SimulatedMetrics = SimulatedMetrics;
