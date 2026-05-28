*Sei un Principal Software Architect e Lead Security Engineer. Sviluppa il codice sorgente completo, reale e funzionante di "GhostHound", una OSINT Investigation Dashboard basata su Electron.js e Node.js.*

*REGOLA ZERO: NESSUN PLACEHOLDER. Ogni riga di codice deve essere funzionante. Niente // TODO o // logica qui. Se il messaggio è troppo lungo, fermati e chiedi di continuare — non tagliare mai il codice.*

---

### STACK TECNOLOGICO
- *Core*: Electron.js + Node.js (fs, path, dns, child_process)
- *Frontend*: Vanilla JS (ES6+), HTML5, CSS3 — nessun framework esterno
- *NPM*: axios, exif-parser, cheerio, whois-json, node-dns

---

### STRUTTURA FILE

/ghosthound
  ├── package.json
  ├── main.js
  ├── preload.js
  └── /src
      ├── index.html
      ├── renderer.js
      ├── style.css
      └── /modules
          ├── osint-core.js
          ├── stealth.js
          └── breach.js


---

### SPECIFICHE DETTAGLIATE

*[FILE 1] package.json*
- Script start per Electron, target Windows, tutte le dipendenze versionate.

*[FILE 2] main.js*
- BrowserWindow frameless, contextIsolation: true, nodeIntegration: false
- Carica preload.js come bridge sicuro
- Gestisce tutti i canali ipcMain.handle()
- Integra stealth.js sulle webRequest della sessione

*[FILE 3] stealth.js*
- Rotazione dinamica User-Agent (5 UA reali: Win/Mac/Linux/iOS/Android) su ogni richiesta
- Blocco WebRTC leak (disable_non_proxied_udp)
- Rimozione header traccianti (X-Forwarded-For, Referer opzionale)

*[FILE 4] osint-core.js — Il motore, 4 moduli reali:*

1. *checkUsername(username)* — Sherlock-style
   - Controlla in parallelo (Promise.allSettled) almeno 15 piattaforme: GitHub, Reddit, Twitter/X, Instagram, TikTok, LinkedIn, Telegram, Medium, DeviantArt, Pinterest, Twitch, YouTube, Pastebin, HackerNews, GitLab
   - Usa endpoint pubblici reali o HTTP status 200/404 per validare la presenza
   - Restituisce array JSON { platform, url, found: bool, status }

2. *investigateDomain(target)* — Domini & IP
   - WHOIS via whois-json
   - DNS lookup (A, MX, TXT, NS) via dns.promises
   - Reverse IP (chiama https://api.hackertarget.com/reverseiplookup/?q=IP — free, no key)
   - Shodan InternetDB free (https://internetdb.shodan.io/IP) — no API key necessaria
   - GeoIP via http://ip-api.com/json/IP — free

3. *extractEXIF(imagePath)*
   - Leggi file con fs.readFileSync, passalo a exif-parser
   - Restituisce: data scatto, modello fotocamera, GPS lat/lon, software, dimensioni

4. *searchBreach(email)* — Completamente free, zero API key:
   - Chiama https://leakcheck.io/api/public?check=EMAIL (tier pubblico free)
   - Chiama https://api.xposedornot.com/v1/check-email/EMAIL (free, no key)
   - Merge dei risultati da entrambe le fonti
   - Restituisce array { source, breachName, date, dataTypes[] }

*[FILE 5] preload.js*
- contextBridge.exposeInMainWorld('ghostHoundAPI', { ... })
- Espone: checkUsername, investigateDomain, extractEXIF, searchBreach, dropFile (drag & drop immagini per EXIF)
- Tutti via ipcRenderer.invoke

*[FILE 6] index.html*
Layout a griglia a 3 zone:
- *Top bar*: Logo + Omnibox unificata + indicatore stealth attivo
- *Sidebar sinistra*: Log operazioni in tempo reale (scrollabile)
- *Main content*: Area risultati dinamica con tab per modulo

*[FILE 7] style.css — Dark SOC Console*
- Background #0d1117, pannelli #161b22, testo #c9d1d9
- Accento primario #00ffcc (neon cyan), errori #ff4444
- Font monospace (JetBrains Mono o Fira Code via Google Fonts)
- Tabelle risultati con bordi cyan, animazione pulse sui risultati trovati
- Badge colorati per status: FOUND verde, NOT FOUND grigio, BREACH rosso
- Drag & drop zone per EXIF

*[FILE 8] renderer.js — Logica Omnibox intelligente*

Parse dell'input:
- @username → lancia checkUsername
- email@dominio.com → lancia searchBreach
- dominio.com o IP → lancia investigateDomain
- File trascinato .jpg/.png → lancia extractEXIF

Rendering risultati:
- Ogni modulo genera card/tabelle DOM dinamiche nel #main-content
- Sidebar log aggiornata in real-time con timestamp e stato operazione
- Pulsante "Esporta JSON" per ogni risultato
- Indicatore di loading animato durante le richieste

---

### QUALITÀ ATTESA
- Codice production-ready, commentato dove non ovvio
- Error handling completo (try/catch, timeout axios 10s, fallback su API irraggiungibile)
- Nessuna dipendenza da API key a pagamento — tutto free e open
- Compatibile Windows 10/11, pronto per pubblicazione su GitHub

*Inizia dal package.json e main.js. Non fermarti finché non hai completato tutti e 8 i file.*