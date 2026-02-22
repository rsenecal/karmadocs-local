import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; 
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'articles.json');

    // 1. Delete from Firestore if it exists (Firestore IDs are strings)
    if (typeof id === 'string') {
      await db.collection('articles').doc(id).delete();
    }

    // 2. Delete from local JSON
    const fileData = await fs.readFile(filePath, 'utf8');
    let articles = JSON.parse(fileData);
    articles = articles.filter((a: any) => a.id !== id);
    
    await fs.writeFile(filePath, JSON.stringify(articles, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}