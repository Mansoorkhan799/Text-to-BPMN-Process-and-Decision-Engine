import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import JSZip from 'jszip';
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

export async function GET(req: NextRequest) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    const files = await LatexFile.find({ $or: [{ _id: { $in: ids } }, { fileId: { $in: ids } }] }).lean();
    const zip = new JSZip();
    for (const f of files) {
      const fileName = `${f.name || f._id}.tex`;
      zip.file(fileName, f.content || '');
    }
    const content = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="latex-files.zip"',
      },
    });
  } catch (e) {
    console.error('Admin export LaTeX error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


