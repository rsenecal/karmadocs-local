// src/lib/chatwoot.ts
'use server'

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { remark } from 'remark';
import html from 'remark-html';

export interface ChatwootArticle {
  id: number;
  title: string;
  content: string; // This will hold the converted HTML
  description: string;
  slug: string;
  status: string;
  category_id: number;
  meta: any;
}

/**
 * Utility to convert Markdown strings to semantic HTML strings.
 */
async function convertToHtml(markdown: string) {
  const processedContent = await remark()
    .use(html)
    .process(markdown);
  return processedContent.toString();
}

export async function fetchAndStoreArticles() {
  let allArticles: ChatwootArticle[] = [];
  let page = 1;
  let hasMore = true;

  console.log(`🚀 Starting sync and Markdown conversion for ${PORTAL_SLUG}...`);

  try {
    while (hasMore) {
      const url = `${CHATWOOT_API_URL}/accounts/${ACCOUNT_ID}/portals/${PORTAL_SLUG}/articles?page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          'api_access_token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Chatwoot API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawArticles = data.payload || [];

      if (rawArticles.length > 0) {
        // Process each article: Clean it and convert Markdown -> HTML
        const processedBatch = await Promise.all(rawArticles.map(async (article: any) => {
          const cleanHtml = await convertToHtml(article.content || '');
          
          return {
            id: article.id,
            title: article.title,
            slug: article.slug,
            content: cleanHtml, // Now ready for Tiptap and karmaDocs
            description: article.description || '',
            status: article.status,
            category_id: article.category_id,
            meta: article.meta || {}
          };
        }));

        allArticles = [...allArticles, ...processedBatch];
        console.log(`✅ Page ${page} converted. Total: ${allArticles.length}`);
        page++;
      } else {
        hasMore = false;
      }

      if (page > 50) hasMore = false;
    }

    // Save a local JSON backup
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'articles.json');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(allArticles, null, 2), 'utf8');

    console.log(`🎉 Successfully synced and converted ${allArticles.length} articles.`);

    revalidatePath('/');
    
    return { success: true, articles: allArticles };

  } catch (error) {
    console.error('❌ Sync/Conversion failed:', error);
    return { success: false, error: String(error), articles: [] };
  }
}