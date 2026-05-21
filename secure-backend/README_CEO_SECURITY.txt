Sicurezza CEO reale per NicotinaaTv

GitHub Pages da solo NON puo bloccare davvero una pagina CEO per IP.
Il blocco IP deve stare su un backend o edge server.

Questa cartella contiene:
- supabase-schema.sql
  Crea tabelle utenti/commenti con Row Level Security.

- cloudflare-worker.js
  Protegge le azioni CEO controllando IP e token: approva, rifiuta,
  risponde ed elimina definitivamente i commenti.
  IP consentito: 2.38.77.137

- wrangler.toml.example
  Esempio di configurazione Cloudflare Worker.

Flusso consigliato:
1. Pubblica il sito statico su GitHub Pages.
2. Crea un progetto Supabase.
3. Incolla supabase-schema.sql in Supabase SQL Editor.
4. Crea il tuo utente Supabase.
5. Nel database imposta role='ceo' per il tuo profilo.
6. Pubblica cloudflare-worker.js su Cloudflare Workers.
7. Configura le variabili segrete del Worker:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   CEO_TOKEN_SECRET
   CEO_PASSWORD
   ALLOWED_CEO_IP=2.38.77.137

Importante:
SUPABASE_SERVICE_ROLE_KEY e CEO_PASSWORD non devono MAI stare in index.html,
client.js o GitHub Pages. Devono stare solo nelle variabili segrete del Worker.
