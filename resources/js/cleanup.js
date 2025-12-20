// Cleanup - убирает зависшие процессы при выходе

let cleanupInProgress = false;

async function cleanup() {
  if (cleanupInProgress) return;
  cleanupInProgress = true;

  console.log('[Cleanup] Starting cleanup process...');

  try {
    // Gracefully shutdown extension
    if (window.db && typeof window.db.shutdown === 'function') {
      console.log('[Cleanup] Requesting extension shutdown...');
      try {
        await Promise.race([
          window.db.shutdown(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Shutdown timeout')), 2000)
          )
        ]);
        console.log('[Cleanup] Extension shutdown successful');
      } catch (error) {
        console.warn('[Cleanup] Extension shutdown failed:', error.message);
      }
    }

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force kill node processes on Windows
    if (navigator.platform && navigator.platform.includes('Win')) {
      console.log('[Cleanup] Forcing Node process termination on Windows...');
      try {
        // This will be handled by Neutralino's exit mechanism
        // But we can try to use WMI if available
        const { exec } = require('child_process');
        exec('taskkill /F /IM node.exe', (error) => {
          if (!error) {
            console.log('[Cleanup] Node processes killed');
          }
        });
      } catch (e) {
        console.log('[Cleanup] Could not force kill (expected in browser)');
      }
    }

  } catch (error) {
    console.error('[Cleanup] Cleanup error:', error);
  }

  console.log('[Cleanup] Cleanup complete, exiting...');
  cleanupInProgress = false;
}

// Register cleanup handlers
window.addEventListener('beforeunload', () => {
  cleanup();
});

if (window.Neutralino) {
  Neutralino.events.on('windowClose', async () => {
    console.log('[Cleanup] Window close event triggered');
    await cleanup();
    try {
      await Neutralino.app.exit();
    } catch (error) {
      console.error('[Cleanup] Exit failed:', error);
    }
  });
}

// Make cleanup available globally
window.cleanup = cleanup;

console.log('[Cleanup] Initialized');
