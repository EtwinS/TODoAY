Neutralino.init();

Neutralino.events.on('ready', async () => {
  console.log('Neutralino is ready');
  
  // Инициализируем БД
  try {
    const dbReady = await db.init();
    if (!dbReady) {
      console.error('Failed to initialize database');
      return;
    }
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database init error:', error);
  }
});

Neutralino.events.on('windowClose', async () => {
  console.log('Window close event - calling cleanup');
  if (window.cleanup) {
    await window.cleanup();
  }
});