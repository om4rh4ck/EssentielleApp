// Dynamic import wrapper for ES module with explicit startup for shared hosts.
(async () => {
  try {
    const serverModule = await import('./dist/app/server/server.mjs');
    if (typeof serverModule.startServer === 'function') {
      await serverModule.startServer();
      return;
    }

    throw new Error('startServer export not found in dist/app/server/server.mjs');
  } catch (error) {
    console.error('[startup] Failed to launch application from server.js');
    console.error(error);
    process.exit(1);
  }
})();

