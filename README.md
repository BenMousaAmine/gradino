# Gradino

*Un gradino alla volta.*

Piattaforma di studio per ragazzi di scuola media. Si parte dalla matematica di terza media, poi si aggiungono altre materie.

- **Stack:** Next.js 16 (App Router) · Supabase (login + Postgres) · Vercel
- **Analisi e metodo:** [`docs/`](docs/)
- **Brand:** [`docs/brand.md`](docs/brand.md)

## Avvio in locale

Servono Node 24, pnpm e Docker.

```bash
pnpm install
pnpm db:start                      # Supabase locale (porte 553xx, Studio su http://127.0.0.1:55323)
cp .env.example .env.local         # incolla URL e chiavi da: pnpm exec supabase status
pnpm content:import                # carica materie, abilità ed esercizi
pnpm user:create --email karim@test.local --password karim1234 --name Karim
pnpm dev
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | Avvia l'app in locale |
| `pnpm test` | Test della correzione, del test iniziale e dei contenuti |
| `pnpm lint` / `pnpm typecheck` | Controlli del codice |
| `pnpm db:start` / `pnpm db:stop` | Avvia / ferma Supabase locale |
| `pnpm db:reset` | Ricrea il database locale dalle migrazioni (cancella i dati) |
| `pnpm db:types` | Rigenera i tipi TypeScript dal database locale |
| `pnpm content:import` | Valida e carica nel database tutti i file in `content/` (rilanciabile senza doppioni) |
| `pnpm user:create --email … --password … --name … [--admin]` | Crea un account (la registrazione libera è disattivata) |

## Contenuti

Gli esercizi stanno nel database. Si scrivono come file JSON in `content/<materia>/` e si caricano con `pnpm content:import`.

Prima di caricare, ogni file viene controllato:
- struttura e riferimenti (abilità, aree, sezioni);
- ogni risposta giusta deve essere corretta come giusta;
- ogni errore tipico deve essere riconosciuto.

Se qualcosa non torna, il caricamento si ferma e dice cosa correggere.

Cosa può contenere un file:
- `items`: esercizi fissi e problemi (`kind: "problem"`, con `solution` passo per passo). Tipi: `input` (numeri, frazioni, unità di misura, anche più campi), `choice`, `multi_choice`, `order`.
- `templates`: esercizi infiniti creati da un generatore (`src/lib/generators/`), uno per gradino (base, medio, avanzato).
- `lessons`: lezioni in 4 passi (Capire, Ricetta, Esempio, Prova tu).
- `assessments`: test come quello iniziale.

## Studio quotidiano

- `/today`: sessione di 2 ore in 5 blocchi (riscaldamento, argomento nuovo, pratica, problemi, verifica), con pause.
- `/skill/[id]`: lezione ed esercizi di una singola abilità.
- Ogni abilità ha 3 gradini: si sale con 9 risposte giuste su 10 (o 5 di fila), poi un ripasso il giorno dopo la conferma. I ripassi successivi arrivano dopo 3, 7, 15 e 30 giorni.

## Pannello admin

- `/admin`: elenco studenti (solo per gli account creati con `--admin`).
- Scheda studente: andamento degli ultimi 30 giorni, punti deboli, errori ricorrenti, come studia (uscite dall'app, pause, lettura delle correzioni), percorso, lezioni, test iniziale.
- Diario del giorno: ogni esercizio con la risposta data, la risposta giusta, i tempi e le correzioni, più gli eventi di sessione e di lezione.
- I dati arrivano da `practice_answers`, `responses` e `activity_events` (eventi inviati dall'app a `/api/events`).

## Pubblicazione (Supabase + Vercel)

1. Crea un progetto su [supabase.com](https://supabase.com) chiamato `gradino`, regione **Frankfurt**.
2. In **Authentication → Sign In / Providers** disattiva **Allow new users to sign up**.
3. Collega il progetto e applica le tabelle:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push
   ```
4. Crea `.env.production.local` con URL, **Publishable key** e **Secret key** del progetto, poi carica contenuti e account:
   ```bash
   pnpm exec tsx --env-file=.env.production.local scripts/import-content.ts
   pnpm exec tsx --env-file=.env.production.local scripts/create-user.ts --email … --password … --name …
   ```
5. Su [vercel.com](https://vercel.com) importa il repository e aggiungi le variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
6. In Supabase, **Authentication → URL Configuration**: imposta **Site URL** con l'indirizzo Vercel.
