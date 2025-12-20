// Global Logger - логирует в консоль, localStorage и разработчику можно скачать
class Logger {
  constructor() {
    this.logs = [];
    this.sessionId = Date.now();
    this.maxLogs = 1000;
    this.loadLogs();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.sessionId,
      level,
      message,
      data: data ? JSON.stringify(data) : null,
      url: window.location?.href || 'unknown'
    };

    // Добавляем в массив
    this.logs.push(logEntry);

    // Ограничиваем размер логов
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Сохраняем в localStorage
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (e) {
      // silently fail
    }
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }

  success(message, data) {
    this.log('SUCCESS', message, data);
  }

  loadLogs() {
    try {
      const saved = localStorage.getItem('app_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      // silently fail
    }
  }

  getLogs(sessionId = null) {
    if (sessionId) {
      return this.logs.filter(log => log.sessionId == sessionId);
    }
    return this.logs;
  }

  getCurrentSessionLogs() {
    return this.getLogs(this.sessionId);
  }

  exportLogs(sessionId = null) {
    const logsToExport = sessionId ? this.getLogs(sessionId) : this.logs;
    const csv = this.convertToCSV(logsToExport);
    return csv;
  }

  convertToCSV(logs) {
    const headers = ['Timestamp', 'Session', 'Level', 'Message', 'Data', 'URL'];
    const rows = logs.map(log => [
      log.timestamp,
      log.sessionId,
      log.level,
      log.message,
      log.data || '',
      log.url
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell + '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }

  downloadLogs(sessionId = null) {
    const csv = this.exportLogs(sessionId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${sessionId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
  }
}

// Глобальный логгер
window.logger = new Logger();
window.logger.success('Logger initialized');
