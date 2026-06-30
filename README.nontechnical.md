# Arkive — A Simple Guide for Everyone

> The family safe for the things you'd panic to find in an emergency — blood groups,
> allergies, medicines, insurance policies, IDs and important documents. On your phone,
> private, and working even with no internet.

This is the **plain-language** guide. If you're a developer and want the technical details,
read [`README.technical.md`](README.technical.md) instead.

---

## What is Arkive, in one minute

Imagine a small, private safe that lives on your family's phones. Inside it you keep the
information you'd be desperate to find in a hospital waiting room: a blood group, a list of
allergies, which medicines someone takes, an insurance policy number, a scan of an ID.

- It works **offline**. If the network is down, the safe still opens.
- It's **private**. Only your family can read what's inside — not even the people who run
  the service can see it. (More on that below.)
- It **keeps itself fresh** with reminders, so policy renewals and document expiries don't
  sneak up on you.

It's a habit, not an install-and-forget app. The reminders are what keep it useful.

---

## How to get it

**Android (recommended):** download and install the app here:
👉 **https://github.com/prabhatpatni9/arkive/releases/latest/download/arkive.apk**

Because it isn't on the Play Store yet, your phone will ask permission to "install unknown
apps" the first time — that's normal for apps you install directly. After that, the app keeps
itself up to date and checks that every update is genuinely from us before installing it.

**iPhone / computer:** open **https://arkive.punyakosh.in** in your browser and add it to your
home screen. (On iPhone, see the note about storage further down.)

---

## How a family works

There is **no username and no password**. There are only two doors:

### 1. Create a family
The first person creates the family. They become the **admin** (the person who can approve who
joins). At this moment the app shows a **recovery phrase** — a list of words. **Write it down
and keep it safe.** It's the master key to your family's safe. If everyone loses their phones,
this phrase is what rebuilds the family. We never see it and can't recover it for you.

The app also asks the admin to pick a **backup admin** — a second trusted person — so the
family is never locked out if something happens to the first admin.

### 2. Join a family
Another family member installs the app and asks to join. The admin approves them. To make sure
nobody is sneaking in, **both phones show a short matching code** — you check that the numbers
match (ideally in person or over a call) before approving. Once approved, that person's phone
gets its own copy of the family safe.

### Sub-families ("nodes")
Big joint families can split into **households**. For example, three brothers' families can
each be their own household inside one big family. Shared things (a grandparent's medical info)
are visible to everyone; a household's private things stay within that household.

### Who can see what
Every item you save has a **visibility** setting:
- **Just me** — only you.
- **My household** — your sub-family.
- **Whole family** — everyone in the family.
- **Specific people** — only the people you pick.
- **Sealed** — locked even from family, openable only in a real emergency when enough trusted
  members agree (a "break-glass" — and everyone can see in the family log that it was opened).

### People who don't have a phone
Elderly relatives or young children can be added as **dependents** — a profile a guardian
manages for them, with no device of their own. If they later get a phone, they can take over
their own profile.

---

## What you can do today

| You can… | How it helps |
|----------|--------------|
| **Store health info** per person | Blood group, allergies, conditions, medicines |
| **Make an Emergency Card** | A printable/QR card a paramedic can read without the app or a login. It's **off by default** and only turned on with that person's consent, because it's deliberately not encrypted (so anyone can read it in an emergency). |
| **Keep a document vault** | Scan IDs, policies, prescriptions. Photos are **compressed at capture** so they stay small but readable. |
| **Read documents with the camera** | The app reads text from a scan on your phone and offers to fill in fields, which you confirm. |
| **Set reminders** | Document expiries, insurance renewals, vehicle pollution (PUC) checks, birthdays, bills — one-time or repeating. |
| **Turn modules on/off** | Vehicles, milk/daily-help logs, contacts, home devices, expenses — switch on only what your family needs. |
| **Sync across devices** | Everyone's phone stays up to date automatically. |

---

## What isn't possible yet (and why)

- **Buying insurance inside the app.** The "renew/buy" button is a **"coming soon" placeholder**.
  Selling insurance needs licences we don't have yet, so it stays a dummy button on purpose
  until that's sorted.
- **A native iPhone app.** For now iPhone users use the web version. A full iPhone app comes
  later — it's more work to publish on Apple's store, so we do it once there's demand.
- **Being on the Google Play Store / Apple App Store.** Right now you install the Android app
  directly (the link above). Stores come later.
- **Automatic admin succession by vote.** Today there's an admin plus a backup admin. A fuller
  "the family votes in a new admin" system is planned for a future version.
- **A public security email or website to report problems.** We don't have a domain or a
  contact address set up yet, so there isn't one to share at the moment.

None of these affect the core promise: storing your family's critical info, privately, offline.

---

## How private is it, really?

This is the part people care about most, so here it is plainly:

- Everything you save is **scrambled (encrypted) on your phone** before it ever leaves it. The
  keys that unscramble it **only exist on your family's phones**.
- Our sync service is a **"blind post office"**: it carries sealed envelopes between your
  family's phones and stores backups, but it **cannot open them**. We can't read your data even
  if we wanted to, and even if someone broke into our servers they'd find only scrambled blobs.
- This isn't a promise on paper — it's how the maths works. The service is built so the data is
  unreadable to anyone but your family.

**Honest about the edges:** the service can tell *that* your family is syncing and roughly how
often (like a postman seeing envelopes go by) — but never what's inside. And if someone steals
a phone that's already **unlocked**, they can see what's on that phone, the same as any app. So
keep a screen lock on.

---

## How much data does it use?

Very little. It's designed for patchy, expensive mobile data.

- **Text records** (a blood group, a reminder, a contact) are tiny — a few kilobytes. You could
  store thousands and barely notice.
- **Document scans/photos** are squeezed down to roughly **200–500 KB each** while staying
  readable. So even a few hundred documents is only a few tens of megabytes total — less than a
  couple of photos from a modern camera.
- **Syncing only sends what changed**, not the whole safe each time. The little "wake up, there's
  something new" nudges between phones carry **no content at all** — they're just a knock on the
  door.
- You can keep a phone on a **"lean" mode** that holds less locally if storage is tight.

In everyday use, Arkive is one of the lightest things on your phone.

---

## How does it work offline?

This is a core promise, not a nice-to-have: **a medical app that can't show a blood group
because the network is down has failed.**

- On Android, your family's safe is stored **durably on the phone itself**. Open the app on a
  plane, in a basement, in a village with no signal — the emergency information is right there.
- When you're back on Wi-Fi or data, the app quietly catches up with everyone else's changes.
- Phones on the **same Wi-Fi can sync directly to each other**, no internet needed.

**One caveat for iPhone/web users:** iPhones can sometimes clear a website's stored data when
the phone is low on space. For iPhone users, the online backup is the dependable copy and the
safe re-loads next time you open it. Android users get the strongest offline guarantee.

---

## What does it cost?

Everything that matters is **free**. You only pay if you want us to keep an encrypted backup
copy on our servers for reliable syncing:

| Option | Cost | What you get |
|--------|------|--------------|
| **One device** | Free | Your safe on a single phone |
| **Same Wi-Fi sync** | Free | Phones at home sync to each other |
| **Phone-to-phone over internet** | Free | Best-effort direct sync |
| **Managed backup** | ₹99/year (first year free) | Reliable encrypted backup + sync via our service |
| **Run your own backup** | Free | Tech-savvy families can self-host |

All the features — reminders, scanning, medical records, modules — are free. The only paid
thing is the optional encrypted backup.

---

## A note on the name

"Arkive" is the working name of this open-source project. **No trademark is claimed** and the
name/branding aren't legally registered. It's a community project under an open licence.

---

## Questions families ask

**If I lose my phone, do I lose everything?**
No — other family members' phones still have the shared safe, and your recovery phrase can
rebuild your access. That's why writing the recovery phrase down at the start matters.

**Can Arkive (the company) read my documents?**
No. They're scrambled with keys only your family holds. We only ever see sealed, unreadable
data.

**Does it work without internet?**
Yes, on Android the emergency info is always available offline. Syncing just catches up later.

**Is my data sold or shared?**
There's nothing readable to sell or share — we can't see inside your safe.
