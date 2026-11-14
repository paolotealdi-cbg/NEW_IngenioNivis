# Correzioni: finestra temporale e qualità

## Ambito

Branch locale `fix/forecast-window-data-quality`, base main `11a0ecb436f4d059b75fbffd54a09db9ac5d4633`.
La dashboard resta una dimostrazione: non invia comandi fisici ad attuatori.

## Finestra temporale

- Richiesta Open-Meteo: `forecast_hours=48`, `timeformat=unixtime`; alba/tramonto separati.
- Timestamp normalizzati ISO UTC, visualizzati esplicitamente in Europe/Rome.
- Finestre continue di 12 campioni per rischio e 24 per grafici/tabella, selezionate dall'ora corrente.
- Alle 17:23 si parte dal campione 17:00: non sono dodici intervalli interamente futuri.
- Neve/pioggia sono accumuli dell'ora che termina al timestamp del campione.
- Ricalcolo ogni 30 secondi e alla ripresa della pagina, anche senza nuovi download.
- Fine prevista: prima coppia di ore sicure successiva ALL'ULTIMO episodio critico nella finestra. È una stima visuale, non un timer hardware.

## Qualità e disponibilità

- Misure mancanti: `null` nei grafici, `N/D` nella presentazione; zero rimane zero.
- Metadati distinti: misura, download, tentativo API, successo API, origine NETWORK/CACHE/DEMO, errore e campi assenti.
- Soglie proposte in `services/dataQuality.ts`: recente <=20 minuti; vecchio <=60 minuti; scaduto oltre 60. Previsioni valide per analisi fino a 30 minuti dal download.
- Soglie applicative da concordare con chi gestisce la stazione; non sono garanzie del fornitore.
- Timestamp senza offset interpretati come Europe/Rome (assunzione da confermare con fornitore), formati ISO locale o gg/mm/aaaa. Ora ambigua/inesistente nei cambi DST rifiutata: età sconosciuta.
- Cache v2: riutilizzo sotto 10 minuti; recupero da errore fino a 24 ore dal download solo per consultazione, mantenendo l'età effettiva. Non estende la validità per analisi.
- Dopo ricaricamento e uso cache, API non verificata: non si inventa un successo corrente.
- Pulsante aggiorna forza un nuovo accesso anche se cache recente.
- Assenza dati, temperatura invalida, previsione vecchia, buco temporale, neve/codice assenti o codice WMO sconosciuto: AUTOMAZIONE NON VALUTABILE, mai SAFE per default.
- In questo stato heatingOn=false è solo uno stato dimostrativo della UI: non definisce una politica fail-safe fisica.
- Un errore di rete con cache recente non rende vecchia la misura: freschezza e accesso API restano indipendenti.

## Sicurezza e server

- Rimossa chiave incorporata; richiesta `METEOPIEMONTE_API_KEY` nell'ambiente server.
- Nessun tentativo live con la credenziale precedentemente pubblicata.
- La vecchia chiave va revocata: la rimozione dal branch non la cancella dalla storia Git.
- PORT configurabile; timeout remoto 20s; errori JSON; NODE_ENV=production serve dist; start tramite tsx.
- `.env` non caricato implicitamente da Node: in locale usare export/$env oppure `npx tsx --env-file=.env server.ts`. Non committare .env.
- Cache condivisa server, rate limit, storico persistente e integrazione hardware NON implementati in questa modifica.

## Ripetere il collaudo

Node 20.20.0+ o 22 LTS, npm:

```sh
npm ci --include=dev
npx playwright install chromium
npm run test:all
npm audit
```

Su Linux minimale usare `npx playwright install --with-deps chromium`.
`PLAYWRIGHT_EXECUTABLE_PATH` è opzionale per un Chromium già disponibile; normalmente lasciarla non impostata.

`npm run lint` è il controllo TypeScript, non ESLint. I browser test avviano un server di produzione sulla porta 4175.
I test usano fixture artificiali chiaramente etichettate e intercettano le API: nessuna misura sintetica viene presentata come meteo reale.

## Limiti del collaudo

La suite verifica codice e UI con risposte controllate, errori e cache. Non certifica affidabilità della stazione reale né sicurezza dell'impianto.
Formato e unità dei payload MeteoPiemonte non sono stati convalidati con credenziali reali; vengono mantenute le convenzioni dei sorgenti originali. In particolare confermare ts e unità del vento con il fornitore.
Mappe, webcam, satellite e invio Telegram reali esclusi dalle prove browser.
Il workflow GitHub è predisposto ma la sua esecuzione remota deve avvenire dopo push/PR.
Resta un warning Vite sul bundle >500 kB: non è un errore di compilazione.
