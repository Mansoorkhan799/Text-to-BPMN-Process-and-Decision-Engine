import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import LatexFile from '@/models/LatexFile';

interface DecodedToken { role?: string }

function requireAdmin(): boolean {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
}

function ensureFullDocument(tex: string): string {
  if (/\\documentclass\s*\{/.test(tex)) return tex;
  return `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{amsmath, amssymb}\n\\usepackage{graphicx}\n\\usepackage{array}\n\\usepackage{longtable}\n\\usepackage{tabularx}\n\\usepackage{booktabs}\n\\begin{document}\n${tex}\n\\end{document}`;
}

// Escape problematic characters conservatively (e.g., underscores in text)
function sanitizeLatexInput(source: string): string {
  // Skip replacement inside inline math delimited by unescaped $ ... $
  let result = '';
  let i = 0;
  let inMath = false;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '$') {
      // Toggle math mode if not escaped
      const prev = i > 0 ? source[i - 1] : '';
      if (prev !== '\\') {
        inMath = !inMath;
      }
      result += ch;
      i += 1;
      continue;
    }
    if (!inMath && ch === '_' && (i === 0 || source[i - 1] !== '\\')) {
      result += '\\_';
      i += 1;
      continue;
    }
    result += ch;
    i += 1;
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Load tex content
    let file = await LatexFile.findById(id).lean();
    if (!file) file = await LatexFile.findOne({ fileId: id }).lean();
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const texRaw = String((file as any).content || '');
    const tex = ensureFullDocument(sanitizeLatexInput(texRaw));

    // Try to compile using latexonline.cc (use xelatex for broader support)
    const compileUrl = 'https://latexonline.cc/compile?'+ new URLSearchParams({ text: tex, engine: 'xelatex' }).toString();
    const res = await fetch(compileUrl, { method: 'GET' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/pdf')) {
      const text = await res.text().catch(() => '');
      console.error('latexonline compile failed:', res.status, text?.slice(0, 500));
      return NextResponse.json({ error: 'Compile failed', details: text?.slice(0, 2000) || 'No details' }, { status: 502 });
    }
    const pdfArrayBuffer = await res.arrayBuffer();

    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${(file as any).name || 'document'}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    console.error('Admin compile latex error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


