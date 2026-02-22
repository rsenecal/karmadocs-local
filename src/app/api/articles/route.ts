import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const syncRequested = searchParams.get('sync') === 'true';
  const filePath = path.join(process.cwd(), 'data', 'articles.json');

  // STEP 1: LOAD LOCAL JSON (This should never fail even if Firebase is broken)
  let localData = [];
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    localData = JSON.parse(fileContent);
    
    if (!syncRequested) {
      return NextResponse.json(localData);
    }
  } catch (err) {
    console.log("No local articles.json found. If not syncing, returning empty.");
    if (!syncRequested) return NextResponse.json([]);
  }

  // STEP 2: FIREBASE SYNC (Only happens if ?sync=true)
  if (syncRequested) {
    try {
      // DYNAMIC IMPORT: This prevents the error from crashing the whole file
      const { db } = await import('@/lib/firebaseAdmin');
      
      const snapshot = await db.collection('articles').get();
      const firebaseArticles = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        pushedToLive: true,
        localModified: false
      }));

      await fs.writeFile(filePath, JSON.stringify(firebaseArticles, null, 2));
      return NextResponse.json(firebaseArticles);
    } catch (error: any) {
      console.error("Firebase Connection Failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(localData);
}