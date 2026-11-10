# 🚀 Tulkit Multi-User Setup Guide

**Powered by Brandweaver**

This guide walks you through setting up Tulkit as a **real multi-user SaaS** with authentication and a database. After this, every visitor can sign up, log in, and have their own private invoices/quotes saved server-side.

**Time needed:** ~30 minutes
**Cost:** Free (Supabase free tier covers 50,000 users)

---

## 🎯 What you'll need

1. **A Supabase account** (free) — handles user accounts + database
2. **Your Tulkit code** on your computer
3. **Your GitHub repo** (already set up at github.com/Brandweaversa/tulkit)
4. **Your Vercel deployment** (already live at tulkit-ashy.vercel.app)

---

## 📦 Step 1: Sign up for Supabase (5 min)

1. Go to **https://supabase.com**
2. Click **"Start your project"** (top right)
3. Sign in with GitHub (use the same account as your Tulkit repo)
4. Click **"New project"**
5. Fill in:
   - **Name:** `tulkit`
   - **Database Password:** click "Generate a password" → **WRITE THIS DOWN** (you'll need it)
   - **Region:** choose the closest to South Africa (e.g. `Frankfurt` or `Cape Town` if available)
   - **Pricing plan:** Free
6. Click **"Create new project"**
7. **Wait 2-3 minutes** while Supabase sets up your database (you'll see a progress bar)

---

## 🔑 Step 2: Get your API keys (3 min)

Once your Supabase project is ready:

1. On the left sidebar, click **"Project Settings"** (gear icon at the bottom)
2. Click **"API"**
3. You'll see several values. **Copy these three** to a safe place (Notepad):

| Value name | What it looks like | Where it goes |
|---|---|---|
| **Project URL** | `https://abcdefgh.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public key** | `eyJhbGciOi...` (long string) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Connection string** (in Database tab) | `postgresql://postgres:[PASSWORD]@db.abcdefgh.supabase.co:5432/postgres` | `DATABASE_URL` |

> 💡 For the connection string, replace `[PASSWORD]` with the database password you wrote down in Step 1.

4. Also scroll down to **"Connection pooling"** (or "Connection string" → Transaction mode) and copy that URL too — it's your `DIRECT_URL`. It looks similar but uses port `6543` instead of `5432`.

---

## 💻 Step 3: Add keys to your local Tulkit project (5 min)

1. Open your **`tulkit-download`** folder in VSCode
2. In the left sidebar, find the file called **`.env`** and click it
3. **Replace the entire contents** with this (use your real values from Step 2):

```bash
# Public — safe to expose in the browser
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...

# Server-only — NEVER expose in browser code
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.abcdefgh.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.astyourproject:YOUR_PASSWORD@aws-0-region.supabase.co:6543/postgres
```

4. Save the file (**Ctrl + S**)
5. **Important:** Close and reopen VSCode (to load the new env vars)

---

## 🗄️ Step 4: Create the database tables (2 min)

1. In VSCode, open the terminal (**Terminal → New Terminal**)
2. Type this and press Enter:

```
npx prisma db push
```

3. You'll see output like:
   ```
   🌱  Your database is now in sync with your Prisma schema.
   ```
4. **Done!** Tables are created in Supabase.

> ⚠️ If you get an error like "Connection refused":
> - Double-check your `DATABASE_URL` in `.env`
> - Make sure you replaced `[PASSWORD]` with your actual database password
> - Make sure there are no spaces around the `=` signs

---

## 🧪 Step 5: Test locally (2 min)

1. In the same terminal, type:
   ```
   npm run dev
   ```
2. Open **http://localhost:3000** in your browser
3. You should now see the **Tulkit login screen** (instead of the dashboard)
4. Click **"Sign up"** → enter your email + a password (min 6 chars) → click **"Create account"**
5. 🎉 You're now logged in! The dashboard appears.
6. Create an invoice, save it, refresh the page → your data persists!
7. Open the site in **incognito mode** → log in again → your invoices are there!

**Your app is now multi-user!** Each visitor signs up with their own email and sees only their own data.

---

## 🌐 Step 6: Add env vars to Vercel (3 min)

Now we need to add the same keys to your live Vercel deployment.

1. Go to **https://vercel.com** → sign in
2. Click your **`tulkit`** project
3. Click **"Settings"** (top tab)
4. On the left sidebar, click **"Environment Variables"**
5. Add **4 variables** (click "Add New" for each):

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (your Supabase URL) | All environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your anon key) | All environments |
| `DATABASE_URL` | (your direct connection string) | All environments |
| `DIRECT_URL` | (your pooling connection string) | All environments |

6. After adding all 4, click **"Deployments"** (top tab)
7. Find the latest deployment → click the **"..."** menu → **"Redeploy"**
8. Wait ~2 minutes

---

## ✅ Step 7: Test your live multi-user app

1. Visit **https://tulkit-ashy.vercel.app/**
2. You should see the **login screen** (not the dashboard)
3. Sign up with a real email
4. Check your email — Supabase sends a confirmation link
5. Click the link → you're confirmed
6. Go back to https://tulkit-ashy.vercel.app/ → sign in
7. Create an invoice → refresh → data persists! 🎉

---

## 🔄 How to push your changes to GitHub + Vercel

After updating your `.env` file locally (Step 3), you should push the new code to GitHub so Vercel uses the multi-user version:

1. Open **GitHub Desktop**
2. You'll see lots of changed files (the multi-user upgrade)
3. In the **Summary** box, type: `Upgrade to multi-user SaaS (Supabase + auth)`
4. Click **"Commit to main"**
5. Click **"Push origin"** (top right)
6. Wait ~30 seconds for the upload
7. Vercel auto-detects the push → starts building
8. Wait ~2 minutes → your live site is now multi-user!

> ⚠️ **Critical:** Your `.env` file is in `.gitignore` — it will NOT be uploaded to GitHub. That's good for security. The env vars only live on your computer + in Vercel's dashboard.

---

## 🆘 Common problems

### "prisma db push" fails
- Double-check `DATABASE_URL` in `.env` — no spaces, real password
- Make sure your Supabase project is fully provisioned (not still "setting up")
- Try the **connection pooling URL** instead of direct connection

### Sign up doesn't work
- Open browser DevTools (F12) → Console tab → check for errors
- Make sure you're using the right Supabase URL (no trailing slash)
- Check that your anon key is the `anon` `public` one (not `service_role`)

### Vercel build fails
- Make sure you added ALL 4 env vars in Vercel dashboard
- Trigger a redeploy after adding env vars
- Check the build logs in Vercel for the specific error

### Emails don't arrive
- Check spam folder
- Supabase free tier has email limits — for production, configure custom SMTP
- For testing, you can disable email confirmation in Supabase → Authentication → Providers → Email → turn off "Confirm email"

### Hydration mismatch warnings
- These are usually caused by browser extensions (Bitdefender, etc.) — completely safe to ignore
- Or test in Incognito mode

---

## 📊 What you now have

✅ Real multi-user SaaS — each visitor signs up with their email
✅ Server-side data storage — invoices/clients saved to Postgres
✅ Cross-device sync — user logs in on phone → sees same data on laptop
✅ Secure authentication — Supabase handles passwords, sessions, email verification
✅ Free for first 50,000 users — Supabase free tier
✅ Auto-deploys on every git push — Vercel handles it

## 🎯 What's next?

Now you're ready for **Phase B: OTT Voucher subscription integration**. With multi-user auth + database in place, you can:
- Track which users are Free vs Pro
- Server-side voucher validation (impossible to bypass!)
- Feature gating (limit free users to 3 invoices/month)
- Admin dashboard to see all users + revenue

Just say "let's do Phase B" when you're ready!
