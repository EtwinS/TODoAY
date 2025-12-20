const http = require('http');
const url = require('url');
const PouchDB = require('pouchdb');
const path = require('path');
const fs = require('fs');

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

log('[PouchDB Extension] Process starting...');
log(`[PouchDB Extension] CWD: ${process.cwd()}`);

// Инициализируем PouchDB с локальной директорией
const dbPath = path.join(process.cwd(), 'data', 'db');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// Очищаем LOCK файл если он остался с предыдущего запуска
const lockFile = path.join(dbPath, 'LOCK');
if (fs.existsSync(lockFile)) {
  try {
    fs.unlinkSync(lockFile);
    log('[PouchDB Extension] Cleaned up stale LOCK file');
  } catch (e) {
    log('[PouchDB Extension] Could not clean LOCK file: ' + e.message);
  }
}

const db = new PouchDB(dbPath);
const PORT = 8490;

log('[PouchDB Extension] Starting...');
log('[PouchDB Extension] DB path: ' + dbPath);

// Обработка закрытия stdin (когда Neutralino хочет остановить процесс)
process.stdin.on('end', () => {
  log('[PouchDB Extension] stdin ended - shutting down');
  process.exit(0);
});

process.stdin.on('close', () => {
  log('[PouchDB Extension] stdin closed - shutting down');
  process.exit(0);
});

// Функции для работы с БД
async function addTask(task) {
  try {
    log('[PouchDB] addTask:', JSON.stringify(task));
    const { v4: uuidv4 } = require('uuid');
    const taskId = `task_${uuidv4()}`;
    
    const result = await db.put({
      _id: taskId,
      ...task,
      type: 'task',
      createdAt: new Date().toISOString(),
      completed: false,
    });
    log('[PouchDB] addTask success: ' + taskId);
    return { success: true, id: result.id, rev: result.rev };
  } catch (error) {
    log('[PouchDB] addTask error: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function updateTask(id, updates) {
  try {
    log('[PouchDB] updateTask: ' + id);
    const doc = await db.get(id);
    const result = await db.put({
      ...doc,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, id: result.id, rev: result.rev };
  } catch (error) {
    log('[PouchDB] updateTask error: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function deleteTask(id) {
  try {
    log('[PouchDB] deleteTask: ' + id);
    const doc = await db.get(id);
    await db.remove(doc);
    return { success: true };
  } catch (error) {
    log('[PouchDB] deleteTask error: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function getAllTasks() {
  try {
    log('[PouchDB] getAllTasks');
    const result = await db.allDocs({ include_docs: true });
    const tasks = result.rows.map(row => row.doc);
    log('[PouchDB] Retrieved ' + tasks.length + ' tasks');
    return { success: true, tasks };
  } catch (error) {
    log('[PouchDB] getAllTasks error: ' + error.message);
    if (error.message.includes('LOCK')) {
      log('[PouchDB] LOCK conflict detected, retrying...');
      await new Promise(r => setTimeout(r, 500));
      return getAllTasks();
    }
    return { success: false, error: error.message };
  }
}

async function getTask(id) {
  try {
    log('[PouchDB] getTask: ' + id);
    const doc = await db.get(id);
    return { success: true, task: doc };
  } catch (error) {
    log('[PouchDB] getTask error: ' + error.message);
    return { success: false, error: error.message };
  }
}

// HTTP сервер с обработкой ошибок
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let body = '';
  
  req.on('error', (err) => {
    log('[PouchDB Extension] Request error: ' + err.message);
    if (!res.writableEnded) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: 'Request error' }));
    }
  });

  req.on('data', chunk => {
    try {
      body += chunk.toString();
    } catch (e) {
      log('[PouchDB Extension] Data parsing error: ' + e.message);
    }
  });

  req.on('end', async () => {
    try {
      let response = { success: false, error: 'Unknown endpoint' };

      if (pathname === '/ping') {
        response = { success: true, message: 'pong' };
      } else if (pathname === '/add-task' && req.method === 'POST') {
        try {
          const data = body ? JSON.parse(body) : {};
          response = await addTask(data);
        } catch (e) {
          log('[PouchDB Extension] Parse error for /add-task: ' + e.message);
          response = { success: false, error: 'Invalid JSON: ' + e.message };
        }
      } else if (pathname === '/get-task' && req.method === 'POST') {
        try {
          const data = body ? JSON.parse(body) : {};
          response = await getTask(data.id);
        } catch (e) {
          log('[PouchDB Extension] Parse error for /get-task: ' + e.message);
          response = { success: false, error: 'Invalid JSON: ' + e.message };
        }
      } else if (pathname === '/update-task' && req.method === 'POST') {
        try {
          const data = body ? JSON.parse(body) : {};
          response = await updateTask(data.id, data);
        } catch (e) {
          log('[PouchDB Extension] Parse error for /update-task: ' + e.message);
          response = { success: false, error: 'Invalid JSON: ' + e.message };
        }
      } else if (pathname === '/delete-task' && req.method === 'POST') {
        try {
          const data = body ? JSON.parse(body) : {};
          response = await deleteTask(data.id);
        } catch (e) {
          log('[PouchDB Extension] Parse error for /delete-task: ' + e.message);
          response = { success: false, error: 'Invalid JSON: ' + e.message };
        }
      } else if (pathname === '/get-all-tasks' && req.method === 'POST') {
        response = await getAllTasks();
      } else if (pathname === '/shutdown' && req.method === 'POST') {
        response = { success: true, message: 'Shutting down' };
        // Отправляем ответ и затем завершаем процесс
        res.writeHead(200);
        res.end(JSON.stringify(response));
        log('[PouchDB Extension] Shutdown requested');
        setTimeout(() => {
          log('[PouchDB Extension] Exiting...');
          process.exit(0);
        }, 100);
        return;
      }

      if (!res.writableEnded) {
        res.writeHead(200);
        res.end(JSON.stringify(response));
      }
    } catch (error) {
      log('[PouchDB Extension] Handler error: ' + error.message);
      if (!res.writableEnded) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
  });
});

server.on('error', (err) => {
  log('[PouchDB Extension] Server error: ' + err.message);
  if (err.code === 'EADDRINUSE') {
    log('[PouchDB Extension] Port ' + PORT + ' is already in use');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log(`[PouchDB Extension] ✓ Server listening on 127.0.0.1:${PORT}`);
});

process.on('SIGINT', () => {
  log('[PouchDB Extension] SIGINT received - shutting down gracefully...');
  server.close(() => {
    log('[PouchDB Extension] Server closed');
    process.exit(0);
  });
  // Форсированный выход через 5 секунд если graceful shutdown не сработал
  setTimeout(() => {
    log('[PouchDB Extension] Forced exit');
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  log('[PouchDB Extension] SIGTERM received - shutting down gracefully...');
  server.close(() => {
    log('[PouchDB Extension] Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    log('[PouchDB Extension] Forced exit');
    process.exit(0);
  }, 5000);
});

process.on('uncaughtException', (err) => {
  log('[PouchDB Extension] Uncaught exception: ' + err.message);
  log('[PouchDB Extension] Stack: ' + err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('[PouchDB Extension] Unhandled rejection: ' + reason);
});