---
# ============================================================================
# KITTEN TEMPLATE — copy this file when a new kitten is ready to list.
#
# How to use:
#   1. Copy this file in content/kittens/  →  e.g. cookie-kitten-01.md
#   2. Set `active: true`
#   3. Fill in the fields below (delete fields you don't need)
#   4. Drop photos into images/kittens/<kitten-id>/ and list them in `photos`
#   5. When the kitten is reserved or sold, just change the `status` field
#
# This file itself stays inactive (active: false) so it never appears on
# the site. Don't rename it.
# ============================================================================

active: false

# Internal id — used in URLs and as a filename slug. Lowercase, hyphenated.
id: template-kitten

# Optional: controls ordering on the available-kittens page (lower = first).
order: 0

# Display name (often a temporary "kitten suite" name like "Jellybean")
name: ""

# Litter — link this kitten back to its litter file (the file id in
# content/litters/, e.g. cookies-litter-may). Leave blank if not applicable.
litterId: ""

# Parents
dam: ""              # cat id from content/cats/, e.g. cookie
sireId: ""           # cat id if it's one of our studs (e.g. ralphy)
sireName: ""         # free text fallback if the sire isn't on the site

# Basics
breed: Ragdoll       # Ragdoll | Maine Coon | British Shorthair
sex: ""              # Boy | Girl
colour: ""           # e.g. Lilac Lynx Point
dob: ""              # display string, e.g. "1st May 2026"
availableFrom: ""    # display string, e.g. "from 12 weeks" or "mid July"
price: ""            # display string, e.g. "£950"

# Status drives the badge and the call-to-action:
#   Available  → green badge, "Reserve me" button
#   Reserved   → terracotta badge, no enquiry button
#   Sold       → grey badge, no enquiry button
status: Available

# Photos — first one is used as the card image. Add as many as you like.
photos: []
# photos:
#   - images/kittens/template-kitten/template-kitten-001.jpg
#   - images/kittens/template-kitten/template-kitten-002.jpg
---

A short paragraph or two about this kitten — personality, quirks, what
they're like to live with so far. Optional. Keep it warm and honest.
