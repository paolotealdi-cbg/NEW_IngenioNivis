Ingenio Nivis (versione iniziale aprile 2026)

## Versione corretta e collaudo

Le correzioni di finestre previsionali, dati mancanti, cache e disponibilità sono documentate in [docs/CORREZIONI.md](docs/CORREZIONI.md).

```sh
npm ci --include=dev
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Per eseguire il server impostare `METEOPIEMONTE_API_KEY` e, in produzione, `NODE_ENV=production`; quindi `npm start`. Non inserire chiavi reali nei sorgenti o nel frontend.
