# How to Share InteraX with a Friend

If you want to let a friend access the InteraX site directly from your computer (without having to pay for a live server or setup complex hosting), you have a few easy options! 

Here are the 3 best ways to "deploy" your local site so others can see it:

---

## Method 1: The Local Network (Wi-Fi) Method
*Best if your friend is in the same house/building on the same Wi-Fi network.*

1. **Find your computer's IP address:**
   * Open your terminal or Command Prompt.
   * Type `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and press Enter.
   * Look for the line that says **IPv4 Address**. It will look something like `192.168.1.15` or `10.0.0.x`.
2. **Start the Next.js server so it listens to the network:**
   * Instead of running `npm run dev`, you need to tell it to accept external connections.
   * Run this command: `npm run dev -- -H 0.0.0.0`
3. **Give your friend the link:**
   * Tell your friend to open their phone or laptop browser and go to: `http://<YOUR_IPV4_ADDRESS>:3000`
   * *(Example: `http://192.168.1.15:3000`)*

---

## Method 2: The Ngrok Tunnel Method (Easiest for Remote Friends)
*Best if your friend is at their own house (on a different Wi-Fi network).*

Ngrok creates a secure, temporary public link that tunnels directly into your local computer. 

1. **Start your server normally:**
   * Run `npm run dev` in your project folder.
2. **Install Ngrok (if you haven't):**
   * Go to [ngrok.com](https://ngrok.com/), sign up for a free account, and download the software.
3. **Start the Tunnel:**
   * Open a *new* terminal window.
   * Run: `ngrok http 3000`
4. **Share the Link:**
   * Ngrok will give you a special URL that looks like this: `https://a1b2-c3d4.ngrok-free.app`
   * Send this link to your friend! As long as your terminal remains open, they can use the site from anywhere in the world.

*Alternative to Ngrok: You can also use LocalTunnel by running `npx localtunnel --port 3000` without needing an account!*

---

## Method 3: The Permanent Deployment (Vercel)
*Best when you are completely finished with the app and want it online forever.*

Since InteraX is built with Next.js, Vercel is the absolute best place to host it for free.

1. **Push your code to GitHub:**
   * Make sure your entire InteraX folder is uploaded to a repository on your GitHub account.
2. **Deploy on Vercel:**
   * Go to [Vercel.com](https://vercel.com/) and create a free account.
   * Click **"Add New Project"** and connect your GitHub account.
   * Select your InteraX repository.
3. **Add your Environment Variables:**
   * Before clicking "Deploy", open the **Environment Variables** section.
   * Copy everything from your `.env.local` file (like your Database URL) and paste it here.
4. **Deploy!**
   * Click Deploy. Vercel will give you a permanent, fast URL (e.g., `https://interax.vercel.app`) that anyone can visit!

---
**Important Note on Uploads**: Because your app currently saves photos and media to the local `/public/uploads` folder, images uploaded using Method 1 or 2 will save directly to your computer. If you move to Method 3 (Vercel), you will need to eventually switch to a cloud storage bucket (like Supabase Storage or AWS S3), because Vercel deletes local files every time the server restarts.
