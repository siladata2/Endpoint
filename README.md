# SILA API

Ready-made HTTP APIs zinazoendeshwa na Sila Tech. Kila endpoint inarudisha JSON safi.
Website yote na admin panel zinasoma **data halisi (real time) kutoka MongoDB**.

## Kuendesha

```bash
npm install
cp .env.example .env      # weka MONGODB_URI yako
npm start
```

Website: `http://localhost:3000`
Admin panel (haipo kwenye menu ya website): `http://localhost:3000/sila`

## Kuongeza endpoint mpya (auto-load)

Weka faili la `.js` popote ndani ya `silatech/`, halafu **huo ndiyo endpoint** —
linapakiwa moja kwa moja bila kurestart server:

```
silatech/ai/story.js        ->  GET /ai/story
silatech/image/firelogo.js  ->  GET /image/firelogo
silatech/tools/weather.js   ->  GET /tools/weather
```

Umbo la faili (lile lile ulilotumia):

```js
const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Jina la API",
  description: "Maelezo mafupi",
  method: "GET",
  parameters: [{ name: "text", type: "text", required: true, placeholder: "Andika hapa" }]
};

router.get("/", async (req, res) => { /* ... */ });

module.exports = router;
```

## Kuongeza page mpya

Weka `.html` ndani ya `sila/` (website ya watu) au `silapanel/` (admin):

```
sila/pricing.html     ->  /pricing
silapanel/users.html  ->  /sila/users
```

## Admin panel

* `GET /sila` — kuingia (login) au kutengeneza account mara ya kwanza (setup)
* `GET /sila/dashboard` — requests, visitors, endpoint statistics, change PIN
* Account ya admin inahifadhiwa **MongoDB**, hivyo login haiishi baada ya restart.
* PIN inaheshimiwa kwa `scrypt` (haitwi kama ilivyo).

## API za msingi

| Route | Maelezo |
| --- | --- |
| `GET /api` | taarifa za msingi za server |
| `GET /api/endpoints` | orodha ya endpoints zote zilizopakiwa (JSON) |
| `GET /api/public/stats` | statistiki za website ya mbele (requests, visitors, uptime) |
| `GET /health` | status ya server + database |

## Faili

```
index.js          server (auto-loader, security, live stats, admin)
silatech/         endpoints zako (auto-load)
sila/             website ya watu (index, endpoints, about, 404)
silapanel/        admin panel (index = login, dashboard)
silaapi.svg       logo
.env.example      mfano wa environment
```
