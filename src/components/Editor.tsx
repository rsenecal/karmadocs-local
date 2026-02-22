'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Highlighter, 
  Heading1, 
  Heading2, 
  Quote,
  Undo, 
  Redo, 
  Image as ImageIcon, 
  Youtube as YoutubeIcon,
  Code,
  Table as TableIcon,
  PlusSquare,
  MinusSquare,
  Layout,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const btn = "p-2 rounded hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-30";
  const active = "p-2 rounded bg-blue-50 text-blue-600 shadow-sm font-bold";

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl);

    if (url === null) return; // Cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Enter Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addYoutubeVideo = () => {
    const url = window.prompt('Enter YouTube URL');
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: 640,
        height: 480,
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
      {/* HISTORY */}
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn} title="Undo"><Undo size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn} title="Redo"><Redo size={18} /></button>
      
      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />

      {/* FORMATTING */}
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? active : btn} title="Bold"><Bold size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? active : btn} title="Italic"><Italic size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? active : btn} title="Highlight"><Highlighter size={18} /></button>
      
      {/* LINKS */}
      <button type="button" onClick={setLink} className={editor.isActive('link') ? active : btn} title="Set Link"><LinkIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className={btn} title="Remove Link"><Unlink size={18} /></button>

      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? active : btn} title="Code Block"><Code size={18} /></button>
      
      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
      
      {/* HEADINGS */}
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? active : btn} title="Heading 1"><Heading1 size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? active : btn} title="Heading 2"><Heading2 size={18} /></button>
      
      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
      
      {/* LISTS & BLOCKS */}
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? active : btn} title="Bullet List"><List size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? active : btn} title="Ordered List"><ListOrdered size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? active : btn} title="Quote"><Quote size={18} /></button>

      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />

      {/* TABLE CONTROLS */}
      <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn} title="Insert Table"><TableIcon size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.isActive('table')} className={btn} title="Add Column"><PlusSquare size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.isActive('table')} className={btn} title="Delete Column"><MinusSquare size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.isActive('table')} className={btn} title="Delete Table"><Layout size={18} /></button>

      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />

      {/* MEDIA */}
      <button type="button" onClick={addImage} className={btn} title="Add Image"><ImageIcon size={18} /></button>
      <button type="button" onClick={addYoutubeVideo} className={btn} title="Add YouTube Video"><YoutubeIcon size={18} /></button>
    </div>
  );
};

export default function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-slate-900 text-slate-50 rounded-xl p-6 font-mono my-6',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer font-bold',
        },
      }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-2xl shadow-lg border border-slate-100 my-8 max-w-full h-auto',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'aspect-video w-full rounded-2xl shadow-lg my-8',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    immediatelyRender: false, 
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none p-8 min-h-[500px] cursor-text bg-white selection:bg-blue-100',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className="w-full border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <MenuBar editor={editor} />
      <div className="bg-[#fcfcfc]">
        <EditorContent editor={editor} />
      </div>
      
      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 900;
          text-transform: uppercase;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1rem;
          font-style: italic;
          color: #64748b;
          margin: 1.5rem 0;
        }
        .ProseMirror mark {
          background-color: #fef08a;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .ProseMirror pre {
          background: #0f172a !important;
          color: #f8fafc !important;
          padding: 1.5rem !important;
          border-radius: 0.75rem !important;
          margin: 2rem 0 !important;
        }
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          font-weight: 600;
        }

        /* Table Styles */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 2rem 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
          min-width: 1em;
          padding: 12px 15px;
          position: relative;
          vertical-align: top;
        }
        .ProseMirror th {
          background-color: #f8fafc;
          font-weight: bold;
          text-align: left;
        }
      `}</style>
    </div>
  );
}