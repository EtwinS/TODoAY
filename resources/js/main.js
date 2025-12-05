Neutralino.init();

Neutralino.events.on('ready', async () => {
  console.log('Neutralino is ready');
  
  // Инициализируем БД
  const dbReady = await db.init();
  if (!dbReady) {
    console.error('Failed to initialize database');
    return;
  }
  
  console.log('Database initialized successfully');
  // Здесь будет остальной твой код инициализации приложения
});

Neutralino.events.on('windowClose', () => {
  Neutralino.app.exit();
});