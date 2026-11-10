# 🚀 Tulkit — Beginner's Hosting Guide

**Powered by Brandweaver**

Don't worry if you're not tech-savvy. This guide walks you through everything click-by-click. By the end, your Tulkit app will be live on the internet with a real web address you can share with customers.

**Time needed:** ~30 minutes
**Cost:** Free

---

## 🛠️ What You'll Need (install these first)

These are one-time installs. After this, you never have to do it again.

### 1. Install Node.js (the engine that runs the app)

- Go to **https://nodejs.org**
- Click the big **"LTS"** button (the green one) to download
- Open the installer and click "Next" through all the steps (just accept the defaults)
- That's it. You won't see a program open — it works in the background.

### 2. Install VSCode (where you edit the app)

- Go to **https://code.visualstudio.com**
- Click **"Download"** for your system (Windows or Mac)
- Install it like any normal program

### 3. Install GitHub Desktop (to upload your code)

- Go to **https://desktop.github.com**
- Click **"Download for Windows"** (or Mac)
- Install and open it

### 4. Create a GitHub account

- Go to **https://github.com/signup**
- Use your email and pick a username (e.g. `yourname`)
- Verify your email when GitHub sends the confirmation

---

## 📂 Step 1: Unzip Tulkit

1. Find the file **`tulkit.zip`** (in your Downloads folder)
2. **Right-click** → **"Extract All"** (Windows) or **double-click** (Mac)
3. Pick a simple location like your **Desktop** or **Documents**
4. You should now have a folder called `tulkit` — remember where it is

---

## 💻 Step 2: Test the App on Your Computer (Optional but Recommended)

This step lets you see the app running on your computer before putting it online.

1. Open **VSCode**
2. Click **File → Open Folder** (or `Open...` on Mac)
3. Find the `tulkit` folder you unzipped and click **Select Folder**
4. In VSCode, click **Terminal → New Terminal** (a panel opens at the bottom)
5. In the terminal, type exactly this and press Enter:

   ```
   npm install
   ```

6. Wait 1-2 minutes. Lots of text will scroll by — that's normal. When it stops, you're ready.
7. Now type this and press Enter:

   ```
   npm run dev
   ```

8. You'll see something like `✓ Ready in 602ms` — that means it's working!
9. Open your web browser (Chrome, Safari, etc.) and go to:

   **http://localhost:3000**

10. 🎉 You should see Tulkit running!

**To stop the app:** Go back to VSCode, click in the terminal, press **Ctrl+C** (Windows) or **Cmd+C** (Mac).

---

## 🌍 Step 3: Upload to GitHub

Now we put your code on GitHub so Vercel can host it.

1. Open **GitHub Desktop**
2. Sign in with your GitHub account
3. Click **"Add a Repository"** → **"Add Existing Repository"**
4. Click **"Choose..."** and find your `tulkit` folder
5. Click **"Add Repository"**
6. GitHub Desktop will show all the files in your project
7. At the bottom, in the **"Summary"** box, type: `Initial commit`
8. Click the blue **"Commit to main"** button
9. Now click the blue **"Publish repository"** button at the top
10. Leave the name as `tulkit`, keep **"Keep this code private"** UNCHECKED if you want a free Vercel account (or checked if you want it private — both work)
11. Click **"Publish repository"**

🎉 Your code is now on GitHub!

**To verify:** Go to **https://github.com/YOUR_USERNAME/tulkit** (replace YOUR_USERNAME with your GitHub username). You should see all your files there.

---

## 🚀 Step 4: Host It Online for Free (with Vercel)

Vercel is the company that made Next.js. They host apps for free.

1. Go to **https://vercel.com**
2. Click **"Sign Up"** (top right)
3. Click **"Continue with GitHub"** (use your GitHub account)
4. Authorize Vercel when it asks
5. Click **"Add New..."** → **"Project"**
6. You'll see your `tulkit` repo listed — click **"Import"**
7. **Don't change any settings** — Vercel auto-detects Next.js
8. Click the big blue **"Deploy"** button
9. Wait about 2 minutes — you'll see a build log scrolling
10. When it says **"Congratulations!"** with confetti, click **"Visit"**

🎉🎉🎉 **Your app is live!** You now have a web address like:
**`https://tulkit-xxxxx.vercel.app`** (the exact URL will be shown)

Share this URL with your customers — they can use Tulkit from any phone or computer.

---

## 🔄 How to Make Changes Later

When you want to change something (like your business name, logo, or colors):

1. Open the `tulkit` folder in VSCode
2. Make your changes (e.g. edit Settings inside the app, or edit code)
3. Open **GitHub Desktop**
4. It will show your changes on the left
5. Type a message in the **"Summary"** box like `Updated logo`
6. Click **"Commit to main"**
7. Click **"Push origin"** at the top

Vercel will automatically re-deploy your app within 2 minutes. Your live website updates itself!

---

## 💡 Tips for Non-Tech Users

- **Bookmark your live URL** so you don't lose it
- **Save your `tulkit.zip` file** in a safe place — it's your backup
- **Don't delete the `tulkit` folder** on your computer — you need it for making changes
- **If something breaks:** Go to Vercel → your project → "Deployments" → click the previous one → "Instant Rollback". This undoes your last change.
- **Customer data** is stored in each user's browser (localStorage). When you upgrade to OTT Voucher subscriptions later, you'll add a real database.

---

## 🆘 Common Problems

**"npm install" doesn't work**
- Make sure you installed Node.js (Step 1 of "What You'll Need")
- Restart VSCode after installing Node.js

**"localhost:3000" doesn't load**
- Make sure you ran `npm run dev` in the VSCode terminal and saw "✓ Ready"
- Try `127.0.0.1:3000` instead

**GitHub Desktop won't publish**
- Make sure you're signed in (check the top right corner)
- Try logging out and back in

**Vercel build fails**
- Open your `tulkit` folder in VSCode
- Run `npm run lint` in the terminal — it will show errors
- Fix any errors, commit, push, and Vercel will retry automatically

---

## 📞 Need Help?

If you get stuck:
1. Search the error message on Google or YouTube — usually someone has solved it
2. Ask ChatGPT or Claude: "I'm getting [error message] when running npm install — how do I fix it?"
3. For Vercel-specific issues: **https://vercel.com/docs/getting-started**

You've got this! 🚀
