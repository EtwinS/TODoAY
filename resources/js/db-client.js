let db = {
  isReady: false,
  baseUrl: 'http://localhost:8490',

  async init() {
    console.log('[DB Client] Initializing extension connection...');
    
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const tryConnect = async () => {
        try {
          attempts++;
          console.log(`[DB Client] Connection attempt ${attempts}/${maxAttempts}`);
          
          // Отправляем ping запрос
          const response = await fetch(`${db.baseUrl}/ping`);
          if (response.ok) {
            console.log('[DB Client] ✓ Extension is ready');
            db.isReady = true;
            resolve(true);
          } else {
            throw new Error('Extension not responding');
          }
        } catch (error) {
          console.log(`[DB Client] Connection attempt ${attempts} failed:`, error.message);
          if (attempts >= maxAttempts) {
            console.warn('[DB Client] Max connection attempts reached, but continuing anyway');
            db.isReady = true;
            resolve(true);
          } else {
            setTimeout(tryConnect, 500);
          }
        }
      };

      setTimeout(tryConnect, 1000);
    });
  },

  async _dispatch(endpoint, data) {
    try {
      console.log(`[DB Client] Calling ${endpoint}:`, data);
      
      const response = await fetch(`${db.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`[DB Client] Response from ${endpoint}:`, result);
      
      return result;
    } catch (error) {
      console.error(`[DB Client] Error calling ${endpoint}:`, error);
      throw error;
    }
  },

  async addTask(task) {
    try {
      const response = await db._dispatch('/add-task', task);
      if (!response.success) {
        throw new Error(response.error || 'Failed to add task');
      }
      return response;
    } catch (error) {
      console.error('[DB Client] addTask error:', error);
      throw error;
    }
  },

  async updateTask(id, updates) {
    try {
      const response = await db._dispatch('/update-task', { id, ...updates });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update task');
      }
      return response;
    } catch (error) {
      console.error('[DB Client] updateTask error:', error);
      throw error;
    }
  },

  async deleteTask(id) {
    try {
      const response = await db._dispatch('/delete-task', { id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
      }
      return response;
    } catch (error) {
      console.error('[DB Client] deleteTask error:', error);
      throw error;
    }
  },

  async getAllTasks() {
    try {
      const response = await db._dispatch('/get-all-tasks', {});
      if (!response.success) {
        throw new Error(response.error || 'Failed to get tasks');
      }
      return { ...response, tasks: response.tasks || [] };
    } catch (error) {
      console.error('[DB Client] getAllTasks error:', error);
      throw error;
    }
  },

  async getTask(id) {
    try {
      const response = await db._dispatch('/get-task', { id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to get task');
      }
      return response;
    } catch (error) {
      console.error('[DB Client] getTask error:', error);
      throw error;
    }
  },

  async shutdown() {
    try {
      console.log('[DB Client] Requesting extension shutdown...');
      const response = await db._dispatch('/shutdown', {});
      console.log('[DB Client] Shutdown response:', response);
      return response;
    } catch (error) {
      console.error('[DB Client] Shutdown error:', error);
      // Ignore shutdown errors
      return { success: true };
    }
  }
};

console.log('[DB Client] Loaded');
