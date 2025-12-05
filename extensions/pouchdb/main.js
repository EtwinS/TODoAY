const fs = require('fs');
const path = require('path');
const process = require('process');
const WS = require('websocket').w3cwebsocket;
const { v4: uuidv4 } = require('uuid');
const PouchDB = require('pouchdb');

// Получаем параметры подключения из stdin
const processInput = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'));
const NL_PORT = processInput.nlPort;
const NL_TOKEN = processInput.nlToken;
const NL_CTOKEN = processInput.nlConnectToken;
const NL_EXTID = processInput.nlExtensionId;

console.log(`[${NL_EXTID}] Starting PouchDB extension...`);
console.log(`[${NL_EXTID}] Connecting to port ${NL_PORT}`);

// Инициализируем PouchDB с локальной директорией
const dbPath = path.join(process.cwd(), 'data', 'db');
console.log(`[${NL_EXTID}] DB path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
  console.log(`[${NL_EXTID}] Created DB directory`);
}

const db = new PouchDB(dbPath);
let client;

// Функция для отправки сообщений в приложение
function sendToApp(event, data) {
  if (client && client.readyState === WS.OPEN) {
    try {
      client.send(
        JSON.stringify({
          id: uuidv4(),
          method: 'app.broadcast',
          accessToken: NL_TOKEN,
          data: { 
            event: 'dbResponse',
            data: { event, data }
          },
        })
      );
      console.log(`[${NL_EXTID}] Sent response: ${event}`);
    } catch (error) {
      console.error(`[${NL_EXTID}] Error sending message:`, error.message);
    }
  } else {
    console.warn(`[${NL_EXTID}] Client not connected, cannot send: ${event}`);
  }
}

// Функции для работы с БД
async function addTask(task) {
  try {
    console.log(`[${NL_EXTID}] addTask called:`, task);
    const result = await db.post({
      ...task,
      createdAt: new Date().toISOString(),
      completed: false,
    });
    console.log(`[${NL_EXTID}] Task added with id: ${result.id}`);
    return { success: true, id: result.id, rev: result.rev };
  } catch (error) {
    console.error(`[${NL_EXTID}] addTask error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function updateTask(id, updates) {
  try {
    console.log(`[${NL_EXTID}] updateTask called: id=${id}`, updates);
    const doc = await db.get(id);
    const result = await db.put({
      ...doc,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[${NL_EXTID}] Task updated: ${id}`);
    return { success: true, id: result.id, rev: result.rev };
  } catch (error) {
    console.error(`[${NL_EXTID}] updateTask error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function deleteTask(id) {
  try {
    console.log(`[${NL_EXTID}] deleteTask called: id=${id}`);
    const doc = await db.get(id);
    await db.remove(doc);
    console.log(`[${NL_EXTID}] Task deleted: ${id}`);
    return { success: true };
  } catch (error) {
    console.error(`[${NL_EXTID}] deleteTask error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getAllTasks() {
  try {
    console.log(`[${NL_EXTID}] getAllTasks called`);
    const result = await db.allDocs({ include_docs: true });
    const tasks = result.rows.map(row => row.doc);
    console.log(`[${NL_EXTID}] Retrieved ${tasks.length} tasks`);
    return { success: true, tasks };
  } catch (error) {
    console.error(`[${NL_EXTID}] getAllTasks error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getTask(id) {
  try {
    console.log(`[${NL_EXTID}] getTask called: id=${id}`);
    const doc = await db.get(id);
    return { success: true, task: doc };
  } catch (error) {
    console.error(`[${NL_EXTID}] getTask error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Подключение к Neutralino серверу
client = new WS(
  `ws://localhost:${NL_PORT}?extensionId=${NL_EXTID}&connectToken=${NL_CTOKEN}`
);

client.onerror = (error) => {
  console.error(`[${NL_EXTID}] Connection error:`, error.message);
};

client.onopen = () => {
  console.log(`[${NL_EXTID}] ✓ Connected to Neutralino server`);
  sendToApp('extensionReady', { message: 'PouchDB extension is ready' });
};

client.onclose = () => {
  console.log(`[${NL_EXTID}] Connection closed, exiting extension`);
  process.exit(0);
};

client.onmessage = async (e) => {
  try {
    const { event, data } = JSON.parse(e.data);
    console.log(`[${NL_EXTID}] Received event: ${event}`);

    let response;

    switch (event) {
      case 'addTask':
        response = await addTask(data);
        break;
      case 'updateTask':
        response = await updateTask(data.id, data.updates);
        break;
      case 'deleteTask':
        response = await deleteTask(data.id);
        break;
      case 'getAllTasks':
        response = await getAllTasks();
        break;
      case 'getTask':
        response = await getTask(data.id);
        break;
      default:
        console.warn(`[${NL_EXTID}] Unknown event: ${event}`);
        response = { success: false, error: `Unknown event: ${event}` };
    }

    sendToApp(`${event}Response`, response);
  } catch (error) {
    console.error(`[${NL_EXTID}] Message processing error:`, error.message);
    sendToApp('error', { error: error.message });
  }
};

process.on('SIGINT', () => {
  console.log(`[${NL_EXTID}] Received SIGINT, exiting gracefully`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${NL_EXTID}] Received SIGTERM, exiting gracefully`);
  process.exit(0);
});

console.log(`[${NL_EXTID}] PouchDB extension initialized successfully`);