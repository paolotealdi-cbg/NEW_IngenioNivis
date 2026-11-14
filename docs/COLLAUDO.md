# Esito del collaudo

Data sessione: 22 ottobre 2026.
Base verificata: `11a0ecb436f4d059b75fbffd54a09db9ac5d4633` (main).
Branch locale: `fix/forecast-window-data-quality`.

## Risultati eseguiti

| Verifica | Esito |
|---|---|
| Installazione pulita con npm ci --include=dev | Superata |
| TypeScript npm run lint | Superata |
| Test unitari Node/tsx | 65 superati, 0 falliti |
| Build produzione Vite | Superata |
| Test browser Playwright | 11 superati, 0 falliti |
| npm audit finale, incluse dipendenze sviluppo | 0 vulnerabilità segnalate |
| git diff --check | Superato |
| Richiesta live Open-Meteo pubblica, 48 ore Unix, due modelli | HTTP 200, 48 timestamp, campi CH1/CH2 presenti |
| Servizio MeteoPiemonte reale autenticato | Non eseguito: nessuna chiave autorizzata usata |
| Pubblicazione GitHub | Non eseguita con successo: ambiente privo di autenticazione in scrittura |

Ambiente: Node 20.20.1, npm 10.8.2, Chromium 134.0.6998.35. Playwright usa Chromium già presente impostando PLAYWRIGHT_EXECUTABLE_PATH; la configurazione standard lascia scegliere a Playwright il suo browser.
I test browser usano timezone America/New_York per verificare che le informazioni locali restino in Europe/Rome; una prova riduce il viewport a 375x812. Rete esterna intercettata per test riproducibili, non per validare fornitori esterni.

## Casi coperti

Finestre dall'ora corrente, passaggio ora/giorno, DST primavera/autunno, campioni mancanti/duplicati, array disallineati, valori null, zero valido, parsing numerico rigoroso, CH1 -> CH2, neve negativa, timestamp non interpretabili/ambigui, misura recente/vecchia/scaduta/assente, cache e API indipendenti, errore HTTP/HTML/JSON, timeout simulato, storage bloccato, refresh forzato, deduplicazione richieste, recupero API, indisponibilità di sole effemeridi, qualità insufficiente senza SAFE, quattro scenari demo, richieste lente durante cambio scenario, comandi manuali senza dati, assenza chiave server, ordine della previsione di spegnimento.

## Limiti

- Soglie 20/60 minuti e validità previsione 30 minuti sono scelte proposte, non certificate dal fornitore.
- Formato ts senza offset assume Europe/Rome; confermare con MeteoPiemonte insieme alle unità vento.
- Non eseguite prove reali di relè/PLC, Telegram, webcam, mappe e satellite.
- Non eseguiti collaudi di carico, soak test multi-giorno o tutti i browser.
- Nessuna garanzia di sicurezza funzionale o fail-safe fisico.
- Il warning sul bundle Vite oltre 500 kB permane; build riuscita.
- Audit zero descrive il database npm al momento del test, non garantisce assenza assoluta di vulnerabilità.
- Chiave rimossa dai sorgenti ma ancora potenzialmente nella cronologia originale: revocarla prima dell'uso pubblico.
