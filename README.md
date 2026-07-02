# CTF Artiest

React-webapp voor de makers van Café Theater Festival, gehost op `artiest.cafetheaterfestival.nl`.

## Inhoud
- Formulieren & deadlines (default tab)
- Informatiepagina's (rich text, vanuit CRM)
- Jaarplanning (gefilterd: items met "uitsluiten_van_ctf_artiest" worden weggelaten)
- Wie is wie (uit Teams + Contacten met InWieIsWieApp = true)
- Aanbiedingen / open calls van partners
- Belangrijke documenten

De pagina is afgeschermd met één gedeeld wachtwoord, beheerbaar in het CRM-onderdeel "CTF artiest" → tabblad Instellingen.

## Lokaal draaien

```
npm install
npm start
```

Maak optioneel een `.env.local` met:

```
REACT_APP_API_URL=https://backend.cafetheaterfestival.nl
```

## Deploy

Push naar `main` → GitHub Action `deploy.yml` doet FTPS-deploy naar Plesk.
Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.
