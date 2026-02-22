import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    // 1. Validate Firebase connection before proceeding
    if (!db) {
      throw new Error("Firebase Admin not initialized. Check .env.local variables.");
    }

    const { id, content, title, slug, category } = await req.json();
    
    // Clean the slug (remove leading digits/timestamps if they exist)
    const cleanedSlug = slug ? slug.replace(/^\d+-/, '') : title.toLowerCase().replace(/\s+/g, '-');
    
    // Capture the current timestamp for the sync record
    const syncDate = new Date().toLocaleString();

    // 2. Determine if we are updating an existing Firestore doc or creating a new one
    // If 'id' is a string (Firestore ID), we update. If it's a number (local temp ID), we create.
    const docRef = typeof id === 'string' 
      ? db.collection('articles').doc(id) 
      : db.collection('articles').doc(); 

    const firebaseId = docRef.id;

    // 3. Push to Firestore
    await docRef.set({
      title,
      content,
      slug: cleanedSlug,
      category,
      status: 'published',
      lastSyncedAt: syncDate, // Human-readable for the UI
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Precise for DB sorting
    }, { merge: true });

    console.log(`✅ Article ${firebaseId} pushed to Firebase successfully.`);

    // 4. Update the local articles.json file
    const filePath = path.join(process.cwd(), 'data', 'articles.json');
    let articles = [];
    
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      articles = JSON.parse(fileData);

      // Map through and update the specific article's metadata
      articles = articles.map((a: any) => {
        // Use fuzzy match to handle ID type differences
        if (a.id == id) {
          return { 
            ...a, 
            id: firebaseId,        // Update local ID to match Firebase
            pushedToLive: true, 
            localModified: false, 
            lastSyncedAt: syncDate 
          };
        }
        return a;
      });

      await fs.writeFile(filePath, JSON.stringify(articles, null, 2));
      console.log(`✅ Local articles.json updated with sync date for ${firebaseId}`);
    } catch (fsError) {
      console.warn("⚠️ Firestore push succeeded, but local articles.json update failed:", fsError);
    }

    // 5. Return success to the frontend
    return NextResponse.json({ 
      success: true, 
      firebaseId: firebaseId, 
      lastSyncedAt: syncDate 
    });

  } catch (error: any) {
    console.error("❌ Push Live API Error:", error.message);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred during the push." }, 
      { status: 500 }
    );
  }
}