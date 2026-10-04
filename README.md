# SILA API — by Sila Tech

## Run
```
npm install
cp .env.example .env     # then fill in your real values
npm start
```

## Add an endpoint (loads automatically, no restart needed)
Create a `.js` file anywhere inside `silatech/`. The URL comes from the folder + file name:

| File                          | URL                 |
|-------------------------------|---------------------|
| `silatech/ai/talkai.js`       | `GET /ai/talkai`    |
| `silatech/image/firelogo.js`  | `GET /image/firelogo` |
| `silatech/tools/weather.js`   | `GET /tools/weather` |

```js
const router = require("express").Router();

router.apiInfo = {
  name: "Weather",
  description: "Get the weather for a city",
  method: "GET",
  parameters: [{ name: "city", type: "text", required: true, placeholder: "Dar es Salaam" }]
};

router.get("/", async (req, res) => {
  res.json({ success: true, city: req.query.city });
});

module.exports = router;
```
It then shows up on the website's **Endpoints** page with its own test form.

## Add a page (loads automatically)
- `sila/pricing.html`   → `https://your-site/pricing`
- `silapanel/users.html` → `https://your-site/silapanel/users`
- `sila/404.html` is used as the "page not found" page.

## Routes
- `/` · `/endpoints` · `/about`  — public website
- `/silapanel`  — admin login, `/silapanel/dashboard` — dashboard
- `/api/endpoints` — JSON list of all endpoints, `/health` — status

## Security
Set `ADMIN_USERNAME`, `ADMIN_PIN` and `ADMIN_TOKEN_SECRET` in `.env`. Never commit `.env`.
