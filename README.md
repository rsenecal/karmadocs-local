# 🚀 karmaDocs Migration Engine

A specialized, local-first CMS built with **Next.js 15**, **Tiptap**, and **Firebase Admin SDK**. Designed for high-speed offline editing and bulk synchronization of documentation articles.

## 📖 Purpose
The Migration Engine allows the Karmasoft team to:
1.  **Ingest:** Pull live articles from the `karma-docs` Firestore database into a local `articles.json`.
2.  **Edit Offline:** Perform heavy content editing, table restructuring, and media embedding without an active internet connection.
3.  **Track:** Visually identify which articles have local changes (**Staged**) vs. those that are current (**Live**) using high-visibility status badges.
4.  **Sync:** Push individual or bulk-selected articles back to Firebase with automatic timestamping and ID mapping.

## 🛠️ Tech Stack
* **Framework:** Next.js (App Router)
* **Editor:** Tiptap (Standardized with KarmaDocs extensions)
* **Database:** Firebase Firestore (Admin SDK)
* **Local Storage:** File System (fs/promises)
* **Styling:** Tailwind CSS + Lucide Icons



## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the root directory. **Note:** Use the `NEXT_PUBLIC_` prefix to match the current internal configuration:

```text
NEXT_PUBLIC_FIREBASE_PROJECT_ID=karma-reports
NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@karma-reports.iam.gserviceaccount.com
NEXT_PUBLIC_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
NEXT_PUBLIC_FIREBASE_DATABASE_ID=karma-docs
2. Installation
Bash
npm install
3. Run Development Server
Bash
npm run dev
Open http://localhost:3000 to access the dashboard.

📂 Key Features
💎 Standardized Editor
The editor is an exact mirror of the production KarmaDocs editor, supporting:

Tables: Full control over columns and rows.

Media: YouTube embeds and Image URL support.

Links: Integrated link/unlink functionality for cross-referencing docs.

Formatting: H1/H2, Bold, Italic, Highlight, and Code Blocks.

🔴 Staging & Sync Tracking
The sidebar provides real-time status indicators:

Synced (Blue Pill): Indicates the last time the article was successfully pushed to Firebase.

Saved (Emerald Pill): Indicates the last time the article was saved to the local articles.json draft.

Progress Bar: Displays the percentage of the total library currently "Live."

📡 API Endpoints
GET /api/articles: Loads local JSON. Use ?sync=true to fetch fresh data from Firebase.

POST /api/articles/save-local: Writes the current editor state to data/articles.json.

POST /api/articles/push-live: Pushes the local draft to Firestore and updates the lastSyncedAt timestamp.

POST /api/articles/delete: Removes articles from both local and remote storage.

⚠️ Safety & Best Practices
Private Key: Never commit .env.local to version control. The Firebase Private Key provides full administrative access.

Backup: Before running a Sync From Firebase, ensure you don't have unstaged local changes you wish to keep, as this will overwrite the local articles.json.

Slug Generation: The engine automatically cleans slugs, removing legacy Chatwoot timestamps to ensure clean, SEO-friendly URLs.