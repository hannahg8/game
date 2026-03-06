# ALL IN ♠ — Setup Guide

A long distance love poker game. NYC 🐰 ↔ AMS 🐱

---

## What you'll need

- A **GitHub** account (free) — [github.com](https://github.com)
- A **Vercel** account (free) — [vercel.com](https://vercel.com) (sign in with GitHub)
- A **Firebase** account (free) — [firebase.google.com](https://firebase.google.com) (sign in with Google)

Total cost: **$0**. All free tiers.

---

## Step 1: Set up Firebase (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** → name it `allin-game` → click Continue
3. Disable Google Analytics (you don't need it) → click **Create Project**
4. Once created, click the **</>** (Web) icon to add a web app
5. Name it `allin-web` → **don't** check Firebase Hosting → click **Register App**
6. You'll see a config block like this — **copy it and save it somewhere**:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "allin-game-xxxxx.firebaseapp.com",
  databaseURL: "https://allin-game-xxxxx-default-rtdb.firebaseio.com",
  projectId: "allin-game-xxxxx",
  storageBucket: "allin-game-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

7. Click **Continue to console**

### Enable the Realtime Database:

1. In the left sidebar, click **Build → Realtime Database**
2. Click **Create Database**
3. Choose a location (US is fine)
4. Start in **test mode** (we'll secure it later)
5. Click **Enable**

### Set database rules:

1. Go to the **Rules** tab in Realtime Database
2. Replace the rules with:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. Click **Publish**

---

## Step 2: Add your Firebase config (1 minute)

Open the file `src/firebase.js` in this project and replace the placeholder config with your real Firebase config from Step 1.

---

## Step 3: Push to GitHub (3 minutes)

1. Go to [github.com/new](https://github.com/new)
2. Name the repo `allin-game` → keep it **Private** → click **Create repository**
3. Upload all the files from this project folder to the repo
   - Easiest way: click "uploading an existing file" on the repo page and drag the whole folder contents in
   - Or use git from the command line if you're comfortable with that

---

## Step 4: Deploy on Vercel (2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `allin-game` repo
3. Vercel auto-detects it's a Vite project — just click **Deploy**
4. Wait ~60 seconds for it to build
5. You'll get a URL like `allin-game.vercel.app` — **that's your game!**

---

## Step 5: Play!

1. Open the URL on your phone
2. Pick **NYC (Bunny)** and enter your name
3. Send the same URL to your boyfriend
4. He picks **AMS (Cat)** and enters his name
5. The game starts! Take turns whenever you're free

Each time someone plays, the other person will see the update in real time.

---

## Optional: Custom domain

In Vercel dashboard → your project → Settings → Domains → add a custom domain like `allin.yourdomain.com`

## Optional: Secure the database later

Once you're comfortable, update Firebase rules to only allow authenticated users. But test mode is fine for a private game between two people.

---

♥ Have fun falling deeper in love, one round at a time.
