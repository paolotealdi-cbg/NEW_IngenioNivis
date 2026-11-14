import express from 'express';
import { createServer as createViteServer } from 'vite';
import fetch from 'node-fetch';
import path from 'node:path';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get('/api/station', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const apiKey = process.env.METEOPIEMONTE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: true, message: 'Chiave API stazione non configurata.' });
    }
    try {
      const response = await fetch('https://www.meteopiemonte.com/api/dati-attuali-stazione-busca/', {
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000)
      });
      if (!response.ok) return res.status(502).json({ error: true, message: `Servizio stazione HTTP ${response.status}` });
      if (!(response.headers.get('content-type') || '').includes('application/json')) {
        return res.status(502).json({ error: true, message: 'Risposta stazione non JSON.' });
      }
      const data = await response.json() as { error?: unknown } | null;
      if (!data || typeof data !== 'object' || data.error) {
        return res.status(502).json({ error: true, message: 'Risposta stazione non valida.' });
      }
      return res.json(data);
    } catch {
      return res.status(502).json({ error: true, message: 'Servizio stazione non raggiungibile o in timeout.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }
  app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
}
startServer();
