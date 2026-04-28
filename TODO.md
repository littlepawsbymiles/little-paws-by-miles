# Future tasks / to-do list

A running list of things we've discussed but deferred for later.

---

## 📍 Google Business Profile (when Julia registers as a business)

**Status:** Deferred. Julia isn't currently a registered business.

**Why it matters:** Google Business Profile is the single highest-impact thing for local SEO. It's what makes you show up in the "map pack" when someone in Leeds Googles "Ragdoll kittens near me" or "cat breeder Leeds". Often ranks ABOVE organic search results.

**What's needed:**
- Business registration (sole trader is enough — no need for Ltd)
- A business address (can be home, doesn't have to be displayed publicly — you can set service area only)
- Phone number
- Real cat photos
- About 15 minutes to set up at https://business.google.com

**When to do:** As soon as Julia decides to formalise the business side. Massive SEO win.

---

## 🗺️ Add more detailed location signals once comfortable

**Status:** Partially done (Leeds/Yorkshire mention added, LocalBusiness schema has Leeds).

**Future additions if comfortable making it more public:**
- Actual postcode area (e.g., "LS17" or "North Leeds") in footer
- Nearest landmarks for direction-finding ("5 minutes from the A58")
- Map embed on the Contact page (if Julia is comfortable sharing the general area)

These make big differences for local ranking but are Julia's call on privacy vs discoverability.

---

## 🖼 Real photos

**Status:** Placeholders everywhere (letter initials in cream squares).

**What's needed:**
- Photos of each cat (3-5 per cat ideally)
- A photo of Julia &amp; Mark for the About page
- Ideally a hero shot for the homepage and some Leeds-based atmosphere

**Format notes:**
- Square crops work best
- Under 500KB each (run through https://squoosh.app if they're big)
- Natural daylight by a window beats flash every time

**When to do:** Once Julia has a good batch of photos. Drop them in via the CMS when live.

---

## 📝 Real content for the About page

**Status:** Placeholder copy throughout `about.html`.

**What Julia needs to write:**
- Her own story — how Little Paws came to be, why these breeds (2-3 paragraphs)
- Mark's part — his role in raising the kittens
- Closing paragraph about the family home environment

**Where to edit:** Once the CMS is live, she goes to `/admin` → Site settings → About page — breeders bio → fills in the rich text editor. Saves. Done.

Before the CMS is live, it can be edited in `content/settings/about.md`.

---

## 🏅 Additional certifications / memberships

**Status:** GCCF &amp; TICA listed. Placeholder card for "more coming soon".

**To add later:**
- Any breed-specific clubs (e.g., The Ragdoll Cat Club, Maine Coon Club of GB, British Shorthair Breed Society)
- Any other registries you join

**Where:** Edit directly in `about.html` — look for the `<!-- 🪄 PLACEHOLDER -->` comment in the Certifications section. Copy an existing `.cert-card` block and update the text.

---

## 📨 Set up the four Tally forms

**Status:** Placeholders showing "form coming soon" messages.

**What's needed:**
1. Sign up free at https://tally.so
2. Create four forms:
   - **Kitten enquiry** — for people interested in a specific available kitten
   - **Waitlist** — to join the list when no kittens are available
   - **Stud booking** — for queens looking for Ralphy or Starsky
   - **General contact** — the catch-all on the Contact page
3. Grab each embed URL and paste it into the CMS under Site settings → Form embed URLs

---

## 💰 Pricing for stud services

**Status:** "From £XXX per service" placeholder on the stud services page.

**What's needed:** Confirmed pricing for Ralphy and Starsky (and any deposit policy). Once known, edit directly in `stud-services.html` — search for `EXXX`.

---

## 🔄 Julia to polish the Our Promise list

**Status:** First draft on the About page; Julia to confirm.

**Potential additions worth thinking about:**
- 4 weeks free Agria pet insurance (common UK breeder practice — easy to set up)
- Written contract / kitten sales agreement
- Specific food brand in the starter pack
- Blanket with mum's scent on it
- Vet-visit receipt included in the pack

Edit directly in `about.html` — look for the `<!-- 🪄 PLACEHOLDER -->` comment near the Our Promise section.
