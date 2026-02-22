import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { id, content, title, category, lastModified } = await req.json();
    
    // 1. Log exactly where we are looking
    const filePath = path.join(process.cwd(), 'data', 'articles.json');
    console.log("📂 TARGET FILE:", filePath);
    console.log("🔍 LOOKING FOR ID:", id, `(Type: ${typeof id})`);

    const fileData = await fs.readFile(filePath, 'utf8');
    let articles = JSON.parse(fileData);

    let found = false;
    const updatedArticles = articles.map((a: any) => {
      // Use fuzzy equality (==) to catch string vs number mismatches
      if (a.id == id) {
        found = true;
        return { 
          ...a, 
          content, 
          title, 
          category, 
          lastModified, 
          localModified: true 
        };
      }
      return a;
    });

    if (!found) {
      console.error("❌ MATCH NOT FOUND. Available IDs are:", articles.slice(0, 3).map((x:any) => x.id));
      return NextResponse.json({ error: `ID ${id} not found in JSON` }, { status: 404 });
    }

    // 2. Write and confirm
    await fs.writeFile(filePath, JSON.stringify(updatedArticles, null, 2), 'utf8');
    console.log("✅ FILE WRITTEN SUCCESSFULLY");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ SYSTEM ERROR:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}