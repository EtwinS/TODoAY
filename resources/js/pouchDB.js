// Initialize PouchDB with LevelDB adapter for local storage

let localDB;

// Wait for PouchDB to be available globally
async function initializeDB() {
    if (typeof PouchDB === 'undefined') {
        console.error('PouchDB library not loaded');
        return;
    }

    try {
        // Create or connect to local database
        localDB = new PouchDB('todos', { 
            adapter: 'leveldb',
            revs_limit: 1000
        });

        // Verify database is working
        const info = await localDB.info();
        console.log('Local database initialized:', info);

        return localDB;
    } catch (err) {
        console.error('Error initializing PouchDB:', err);
        // Fallback to memory adapter if leveldb fails
        localDB = new PouchDB('todos');
        console.log('Fallback to memory adapter');
        return localDB;
    }
}

// Initialize immediately
await initializeDB();

export { localDB };
