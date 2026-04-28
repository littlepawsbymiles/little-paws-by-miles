# 🐾 Site Handover Guide

> **For:** the site owner (you!). This walks through everything needed to
> get the site live on Cloudflare Pages with the Decap CMS admin panel
> working for Mum and Mark.
>
> **Time:** ~45 minutes the first time. You only do this once.
>
> **Cost:** £0. Everything below has a permanent free tier that covers this site.

---

## What you're setting up

```
                         [Mum / Mark / You]
                                │
                                │ 1. Edit content in a friendly form UI
                                ▼
               ┌──────────────────────────────┐
               │  Decap CMS admin panel       │
               │  (yourdomain/admin/)         │
               │                              │
               │  Logs in with GitHub         │
               └──────────────────────────────┘
                                │
                                │ 2. Saves content as markdown files
                                ▼
               ┌──────────────────────────────┐
               │  GitHub repo                 │
               │  (content/ directory)        │
               └──────────────────────────────┘
                                │
                                │ 3. Cloudflare rebuilds the site
                                ▼
               ┌──────────────────────────────┐
               │  Cloudflare Pages            │
               │  (littlepawsbymiles.co.uk)   │
               └──────────────────────────────┘
                                │
                                │ 4. Visitors see the updated site
                                ▼
                            [World]
```

---

## Step 1 — Create a GitHub account

1. Go to **https://github.com/signup**
2. Enter your email, pick a password and a username (this is public — consider `little-paws-admin` or similar)
3. Verify your email
4. ✅ Done — free forever

> **For Mum and Mark:** they'll do the same thing before Step 7 (invitations).
> Send them the URL when you're ready. They pick their own usernames and
> passwords — you don't need to know either.

---

## Step 2 — Create a GitHub repository

1. Log in to GitHub
2. Click the **`+`** icon top-right → **New repository**
3. Fill in:
   - **Repository name:** `little-paws-by-miles`
   - **Description:** Little Paws By Miles website
   - Select **Public** (required for Decap's free backend). Don't worry — only the content is visible, not anything sensitive. Most website repos are public.
   - Leave all other options unticked
4. Click **Create repository**
5. You'll land on a page with setup instructions. **Leave this tab open**, you'll need the repo URL in a moment.

---

## Step 3 — Upload the site to GitHub

Two ways to do this. Pick whichever suits you.

### Option A — Drag and drop (easiest, no command line)

1. On the repo page you just opened, click the **"uploading an existing file"** link
2. Drag every file and folder from your unzipped `little-paws-by-miles/` folder into the browser
3. Scroll down, type "Initial commit" in the box, click **Commit changes**
4. Wait a minute while it uploads (the image files are the slow bit)

> ⚠️ Make sure you drag the **contents** of `little-paws-by-miles/`, not the folder itself. GitHub should end up showing `index.html`, `cats.html`, `content/`, `images/` etc. at the top level — not nested inside another folder.

### Option B — Command line (if you've used Git before)

```bash
cd path/to/little-paws-by-miles
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/little-paws-by-miles.git
git push -u origin main
```

---

## Step 4 — Update the CMS config with your repo name

Open `admin/config.yml` in GitHub (click it in the file browser on the repo page, then click the pencil icon ✏️ to edit). Find the line:

```yaml
  repo: REPO_OWNER/REPO_NAME              # ← replace after creating the GitHub repo
```

Change it to match your actual repo. If your GitHub username is `milesdad` and the repo is `little-paws-by-miles`, you want:

```yaml
  repo: milesdad/little-paws-by-miles
```

Scroll down, commit the change. (This automatically saves to the main branch.)

---

## Step 5 — Set up Cloudflare Pages hosting

1. Sign up at **https://dash.cloudflare.com/sign-up** (free, no credit card)
2. Once logged in, from the left sidebar click **Workers & Pages**
3. Click **Create application** → **Pages** tab → **Connect to Git**
4. Click **Connect GitHub** and authorise Cloudflare to access your repos
5. Select `little-paws-by-miles` and click **Begin setup**
6. On the configuration screen:
   - **Project name:** `little-paws-by-miles` (this becomes your free subdomain)
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `node scripts/build-data.js`
   - **Build output directory:** `/` (just a single forward-slash — we're not putting output in a subfolder)
7. Click **Save and Deploy**
8. Wait ~2 minutes for the first build to complete
9. ✅ Your site is live at `https://little-paws-by-miles.pages.dev`

---

## Step 6 — Point your real domain at Cloudflare Pages

> This step moves `littlepawsbymiles.co.uk` from Netlify's DNS to
> Cloudflare's. Your Netlify site keeps working until you flip the DNS —
> no rush, no downtime.

1. In Cloudflare Pages, click your project → **Custom domains** tab → **Set up a custom domain**
2. Enter `littlepawsbymiles.co.uk`, click Continue
3. Cloudflare shows you what DNS records to update:
   - A record pointing at Cloudflare's IPs
   - CNAME for `www`
4. **Log into your domain registrar** (wherever you bought the domain — Netlify, GoDaddy, 123-reg, etc.)
5. Find the DNS settings for `littlepawsbymiles.co.uk`
6. Add the records Cloudflare showed you (or delete the old Netlify ones and add these)
7. Go back to Cloudflare Pages and click **Activate domain**
8. DNS changes take 5 minutes – 24 hours to propagate. Usually under an hour.
9. Once active, you'll see a green tick and you can also enable `www.littlepawsbymiles.co.uk` to redirect to the apex.

> **Already on Netlify and nervous about moving?** You can keep Netlify as
> a safety net. Just don't delete the Netlify site until the new Cloudflare
> setup is working. The DNS switch is the only thing that matters — it's
> instant and fully reversible.

---

## Step 7 — Set up GitHub OAuth for the CMS login

This is the bit that lets editors log in to `/admin` with their GitHub account.

1. In GitHub, click your profile picture → **Settings** → **Developer settings** (bottom of left sidebar) → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** `Little Paws CMS`
   - **Homepage URL:** `https://littlepawsbymiles.co.uk/`
   - **Authorization callback URL:** `https://api.netlify.com/auth/done`
     - ⚠️ Yes, this really does need to be a Netlify URL — we're using Netlify's free authentication proxy (called Git Gateway) *without* hosting the site on Netlify. It's a separate product and this bit stays free.
3. Click **Register application**
4. Copy the **Client ID** shown
5. Click **Generate a new client secret** and copy that too
6. Keep this tab open — you'll paste both values next

7. Go to **https://app.netlify.com** and sign up/in (your existing account is fine)
8. From your team dashboard, click **Add new site → Deploy manually** and just upload any folder (a dummy deploy — we just need the site for its Identity service). Actually — simpler route if this feels fiddly: **use your existing Netlify site that's already set up** for `littlepawsbymiles.co.uk`. It doesn't matter that it isn't your live production site; we only use the auth layer.
9. On the site's dashboard → **Project configuration → Identity → Enable Identity**
10. Under **Registration preferences**, choose **Invite only** (important — means random people can't sign up)
11. Under **External providers**, click **Add provider → GitHub** and paste the Client ID and Client Secret from step 4-5
12. Under **Services → Git Gateway**, click **Enable Git Gateway**

> This is genuinely the fiddliest step. If you get stuck, the official
> walkthrough is at https://decapcms.org/docs/github-backend/

---

## Step 8 — Invite Mum and Mark

1. In Netlify → your Identity site → **Identity** tab
2. Click **Invite users**
3. Enter Mum's email and Mark's email (comma-separated), click Send
4. They'll get an email with a "Sign up" link. They click it, pick a password, done.
5. They can now log in to `https://littlepawsbymiles.co.uk/admin` with their email + password, OR with GitHub (either works)

---

## Step 9 — Test it end-to-end

1. Open `https://littlepawsbymiles.co.uk/admin` in a private browser window
2. Click **Login with GitHub** (or email/password if the user signed up that way)
3. You should land on the CMS dashboard with Cats, Available kittens, Upcoming litters, Testimonials and Site settings in the sidebar
4. Open "Cats" → click Bella → change her tagline to something silly → click **Publish**
5. Wait ~1 minute, reload `https://littlepawsbymiles.co.uk/cats.html` and check Bella's tagline has changed
6. Change it back! Celebrate. 🎉

---

## Ongoing — how content flows from here on

Whenever you/Mum/Mark hit **Publish** in the CMS:

1. The CMS commits the change to GitHub's `content/` folder
2. Cloudflare Pages notices the commit and triggers a build
3. The build script reads all the markdown files and rewrites `js/data.js`
4. Cloudflare Pages publishes the updated site globally — usually within 90 seconds

You never need to touch `js/data.js` again. You never need to run `npm install` or a local command. You never need to redeploy manually. It's all automatic.

---

## Troubleshooting

### "I changed something but the site hasn't updated"
Wait 2 minutes. Cloudflare builds take 60–90 seconds and then there's cache propagation. If nothing after 5 minutes, log in to Cloudflare Pages → your project → Deployments, and check if the latest build failed. Click a failed build to see the error.

### "Build failed: Cannot find module..."
The build script is deliberately zero-dependency, so you should never see this. If you do, it means someone added a dependency to `scripts/build-data.js`. Revert their change.

### "The CMS says 'Failed to load config' or 'Auth error'"
Most likely the `repo:` line in `admin/config.yml` doesn't match your actual GitHub repo, or Git Gateway isn't enabled in Netlify. Re-check Steps 4 and 7.

### "Mum can log in but can't save"
Check she's been invited via Netlify Identity (Step 8) AND that Git Gateway is enabled (Step 7 point 12).

### "I want to remove a cat but deleting the file in GitHub left the old entry on the site"
Shouldn't happen — the build script reads the folder fresh each time. If it does, force a rebuild from Cloudflare Pages → Deployments → Retry deployment.

---

## Files you can/can't edit

| What | Can edit via CMS? | Can edit in GitHub? | Notes |
|------|:-:|:-:|-------|
| `content/cats/*.md` | ✅ | ✅ | The cat content. CMS is friendlier. |
| `content/kittens/*.md` | ✅ | ✅ | |
| `content/litters/*.md` | ✅ | ✅ | |
| `content/testimonials/*.md` | ✅ | ✅ | |
| `content/settings/*.md` | ✅ | ✅ | |
| `images/cats/*.jpg` | ✅ via CMS upload | ✅ | |
| `js/data.js` | ❌ | ⚠️ | Auto-generated. Any edits get overwritten. |
| `css/style.css` | ❌ | ✅ | Design tweaks. Requires some CSS knowledge. |
| `*.html` | ❌ | ✅ | Page layouts. Requires some HTML knowledge. |

---

## Giving the editor guide to Mum and Mark

Once Step 8 is done, send them the short guide at `EDITOR_GUIDE.md` (also in this folder). That's all they need — they never have to read this file.
