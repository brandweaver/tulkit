# Tulkit — Invoices & Quotes Made Easy

**Powered by Brandweaver**

A complete, runnable Next.js web app for creating invoices and quotes, generating PDFs, and sharing them via WhatsApp or email. Built with **Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + jsPDF + Zustand**.

Tulkit is the app brand (shown in the header, footer, and browser tab). Each user enters their own business name in Settings — that's what appears on the invoices they send to clients.

All data is stored locally in the browser (localStorage) — no database setup required.

## ✨ Features

- 📄 Create **invoices** and **quotes** with line items, per-line discounts, tax, and global discounts
- 🎨 Live HTML preview that mirrors the generated PDF
- 📥 **Download PDF** — professionally styled with your logo and accent colour
- 💬 **Share via WhatsApp** — opens WhatsApp with the client's number and a pre-filled message
- 📧 **Share via Email** — opens the user's email client with subject and body pre-filled
- 👥 Manage **clients** (name, company, contact, address, VAT number)
- 🏢 Manage your **business profile** (logo, accent colour, currency, banking details, VAT number)
- 🔢 **Sequential numbering** with custom prefixes (INV-0001, QUO-0001...) — audit-safe
- 📊 Dashboard with stats: paid, outstanding, overdue totals
- 🔍 Search and filter documents by type and status
- 🌍 Multi-currency (ZAR, USD, EUR, GBP, NGN, KES, GHS, INR, AUD)
- 📱 Fully responsive — works on mobile and desktop

## 🚀 Getting Started (in VSCode)

### 1. Unzip the project

```bash
unzip tulkit.zip
cd tulkit
```

### 2. Open in VSCode

```bash
code .
```

(Or use **File → Open Folder** in VSCode and select the `tulkit` folder.)

### 3. Install dependencies

You can use either **npm**, **bun**, **pnpm**, or **yarn**. The recommended setup uses bun (faster), but npm works everywhere.

```bash
# Option A: npm (default with Node.js)
npm install

# Option B: bun (recommended — much faster)
# Install bun first:  curl -fsSL https://bun.sh/install | bash
bun install
```

### 4. Set up environment variables

```bash
cp .env.example .env
```

The default `.env` uses a relative SQLite path. The app works fully client-side (localStorage) so the database is only needed if you upgrade to a real backend later.

### 5. Run the dev server

```bash
# With npm
npm run dev

# With bun
bun run dev
```

Open **http://localhost:3000** in your browser. That's it — the app is running.

### 6. Build for production (optional)

```bash
npm run build
npm run start
```

## 📂 Project Structure

```
tulkit/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page (dashboard / editor / clients / settings)
│   │   └── globals.css         # Tailwind theme + brand colours
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, dialog, etc.)
│   │   ├── dashboard.tsx       # Stat cards + document list + filters
│   │   ├── document-editor.tsx # Edit a doc + live preview side-by-side
│   │   ├── invoice-preview.tsx # Visual HTML preview of invoice/quote
│   │   ├── share-dialog.tsx    # PDF / WhatsApp / Email sharing modal
│   │   ├── clients-panel.tsx   # Client CRUD
│   │   └── business-settings.tsx # Business profile, branding, numbering, banking
│   ├── lib/
│   │   ├── types.ts            # TypeScript domain types
│   │   ├── format.ts           # Currency/date formatting, totals, currency list
│   │   ├── store.ts            # Zustand store with localStorage persistence
│   │   ├── pdf.ts              # jsPDF generation (download + preview)
│   │   └── share.ts            # WhatsApp deep link + mailto + clipboard
│   └── hooks/                  # use-toast, use-mobile
├── prisma/                     # Prisma schema (unused in this version, kept for future DB upgrade)
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🧠 How It Works

### Data Storage
All data (clients, documents, business profile) is saved in the browser's `localStorage` under the key `invoice-maker-v1`. This means:
- ✅ No backend, no database, no API keys needed
- ✅ Works offline after first load
- ✅ Survives page reloads
- ❌ Data is per-browser — clearing browser data wipes everything

**To upgrade to a real database later:** the `prisma/` folder is included and pre-configured for SQLite. You can move the store logic from `lib/store.ts` into Next.js API routes that talk to Prisma. The TypeScript types in `lib/types.ts` map cleanly to Prisma models.

### PDF Generation
PDFs are generated **client-side** using `jsPDF` + `jspdf-autotable`. The PDF matches the visual preview shown in the editor. The accent colour, logo, banking details, payment terms, and notes are all included.

### WhatsApp Sharing
Uses the official `wa.me` deep link:
- If the client has a phone number stored, opens WhatsApp directly to their chat
- If not, opens WhatsApp's contact picker
- A pre-filled message with the invoice number, amount, and due date is included

**Important:** Browsers cannot auto-attach files to WhatsApp for security reasons. The Share dialog tells the user to download the PDF first, then attach it in WhatsApp. This is a browser limitation, not a bug.

### Email Sharing
Uses a `mailto:` link — opens the user's default email client with the recipient, subject, and body pre-filled. Same attachment caveat as WhatsApp.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (New York) |
| State | Zustand (with persist middleware) |
| PDF | jsPDF + jspdf-autotable |
| Icons | lucide-react |
| Notifications | sonner / radix toast |

## 🎯 What to Customise

1. **Default business profile** — `src/lib/format.ts` → `DEFAULT_BUSINESS`
2. **Brand colour** — Settings page → Accent colour (default: emerald `#059669`)
3. **Currency list** — `src/lib/format.ts` → `CURRENCY_OPTIONS`
4. **PDF layout** — `src/lib/pdf.ts` → `generateInvoicePdf()`
5. **Share message templates** — `src/lib/share.ts` → `buildShareMessage()`, `buildShareSubject()`

## 🚀 Production Upgrade Path

When you're ready to monetise:

1. **Database:** Move from localStorage to Prisma + SQLite/Postgres (the schema is already in `prisma/schema.prisma`)
2. **Auth:** Add NextAuth.js (already installed) for multi-user
3. **Payment integration:** Add PayFast, Ozow, Yoco or Stripe for "Pay Now" buttons on invoices
4. **WhatsApp Business API:** Replace the `wa.me` deep link with the official WhatsApp Business API via Twilio/360dialog for auto-attachment and read receipts
5. **Email sending:** Replace `mailto:` with Resend or Postmark for auto-attached PDFs and tracking
6. **Subscription:** Add Stripe billing for Pro tier

## 📝 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint check |

## 🚀 Deploy to GitHub + Vercel (free hosting)

This is the recommended way to put your app online for free.

### Step 1 — Push the code to GitHub

The zip already contains a clean git repo with a single initial commit. After unzipping:

```bash
cd tulkit

# Create an empty repo on GitHub first (github.com/new)
# Don't add a README or .gitignore on GitHub — the repo already has both.

# Link your GitHub repo (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/tulkit.git

# Push
git branch -M main
git push -u origin main
```

### Step 2 — Deploy to Vercel (free)

Vercel is the company behind Next.js — they offer free hosting for personal projects.

1. Go to **https://vercel.com** and sign up (use your GitHub account)
2. Click **"Add New Project"**
3. Import your `tulkit` repo
4. Vercel auto-detects Next.js — just click **Deploy**
5. Wait ~2 minutes — your app is live at `https://tulkit.vercel.app`

Every `git push` from now on auto-deploys. ✨

### Alternative hosting options

- **Netlify** — similar to Vercel, free tier
- **Cloudflare Pages** — free, very generous bandwidth
- **Railway / Render** — if you add a real database later
- **GitHub Pages** — only works for static exports (limited; not recommended for Next.js apps with API routes)

## 📜 License

MIT — yours to use, modify, and monetise.

---

Built as a starting point for a monetisable invoice/quote SaaS. All the heavy lifting (PDF generation, sharing UX, totals, numbering) is done — focus on what makes your version unique. 🚀
