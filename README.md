# Production BoM Check

Full production app: React frontend + Node.js/Express backend + MongoDB Atlas,
matching the same stack and deployment pattern used for the Fire Safety
Checklist and Copper Shop Quality Check apps (JWT + bcrypt auth, Nodemailer
for OTP/notification emails, backend on Render, frontend on Netlify).

## Folder structure

```
bom-checklist-app/
  backend/     Node.js + Express + MongoDB API
  frontend/    React (Vite) app
```

## What's implemented

- Sign in / create account / forgot-password with emailed OTP (JWT + bcrypt),
  10 failed attempts locks the account for 30 minutes
- Brand / Model master list with Add / Edit / Delete (stored in MongoDB, not
  hardcoded)
- Add BOM: upload an Excel/CSV file — the backend finds the real header row
  by looking for the known BOM column names (Item Code, Product name, Q.P.S,
  Unit, Specification, any letter case) and ignores metadata rows above it.
  The BOM is saved permanently right away — nothing is asked at this step.
- Opening a BOM's checklist for the first time asks how many times per month
  it needs checking (0–12) and an optional notify email
- Checklist renders as a real table (all columns from the file) with an
  OK / NOT OK action per row; submitting records one dated attempt
  (Asia/Kolkata time)
- Attempt counter resets every calendar month automatically; once the
  required attempts for the month are done, a completion email is sent to
  the configured notify address
- "This month's checklists in progress" — a cross-brand/model list showing
  every BOM with at least one attempt this month and how many are pending,
  so you don't have to reopen every BOM to check status
- Excel export per BOM: Item Code / Product name / Q.P.S / Unit /
  Specification columns + Status1, Status2... per attempt, with an
  "Attempt Date" row above the status columns
- All native `confirm`/`alert`/`prompt` dialogs replaced with in-app modals

## 1. MongoDB Atlas

1. Create a free cluster (or use your existing Atlas account/cluster from the
   other two projects).
2. Create a new database user (separate from the fire-safety / copper-shop
   ones) and a database named e.g. `bom_checklist`.
3. Copy the connection string — you'll need it for `MONGO_URI`.

## 2. Backend setup (local)

```
cd backend
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, EMAIL_* values in .env
npm install
npm run dev
```

The API runs on `http://localhost:5000` by default. Health check:
`GET /api/health`.

### Email (OTP / completion notifications)

`utils/sendEmail.js` uses standard SMTP via Nodemailer. For Gmail: enable
2-Step Verification on the sending account, then create an **App Password**
and use that as `EMAIL_PASS` (not your normal password). Any other SMTP
provider (SendGrid, Mailgun, your company mail server) works the same way —
just change `EMAIL_HOST` / `EMAIL_PORT`.

## 3. Frontend setup (local)

```
cd frontend
cp .env.example .env
# set VITE_API_URL to your backend URL, e.g. http://localhost:5000/api
npm install
npm run dev
```

Opens on `http://localhost:5173` by default.

## 4. Deploying (same pattern as the other two apps)

**Backend → Render**
1. Push this repo to GitHub.
2. New Web Service on Render, root directory `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all variables from `backend/.env.example` in Render's Environment tab
   (with your real values).
5. Once deployed, copy the Render URL (e.g. `https://bom-checklist-api.onrender.com`).

**Frontend → Netlify**
1. New site from Git, root directory `frontend`.
2. Build command: `npm run build`. Publish directory: `dist`.
3. Add environment variable `VITE_API_URL` = `https://bom-checklist-api.onrender.com/api`
   (your Render URL from above, with `/api` at the end).
4. Deploy. Netlify gives you a shareable link — same as the other two apps.

Update `CLIENT_ORIGIN` in the backend's Render environment variables to your
Netlify URL once you have it, so CORS allows requests from the live site.

## Notes / things to review before go-live

- The office WiFi issue you hit with MongoDB on the copper-shop project
  (blocked on office network, works on hotspot) is a network/firewall thing
  on that WiFi, not the app — worth flagging to IT if it happens again here.
- Passwords are hashed with bcrypt; OTPs expire in 10 minutes; JWT tokens
  default to a 7-day expiry (`JWT_EXPIRES_IN` in `.env`).
- File uploads are capped at 15MB in `bomRoutes.js` (`multer` limits) —
  raise if your BOM files are larger.
