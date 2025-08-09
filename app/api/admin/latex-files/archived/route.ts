import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import LatexFile from '@/models/LatexFile';
import LatexArchivedFile from '@/models/LatexArchivedFile';

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

export async function GET(_req: NextRequest) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    let files = await LatexArchivedFile.find({ archived: true })
      .select({ _id: 1, fileId: 1, name: 1, 'documentMetadata.author': 1, createdAt: 1, updatedAt: 1, archived: 1 })
      .sort({ updatedAt: -1 })
      .lean();
    if (!files || files.length === 0) {
      files = await LatexFile.find({ archived: true })
        .select({ _id: 1, fileId: 1, name: 1, 'documentMetadata.author': 1, createdAt: 1, updatedAt: 1, archived: 1 })
        .sort({ updatedAt: -1 })
        .lean();
    }

    const data = files.map((f: any) => ({
      id: String(f._id || f.fileId),
      mongoId: String(f._id || ''),
      fileId: f.fileId || '',
      name: f.name,
      author: f?.documentMetadata?.author || '',
      archived: !!f.archived,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ success: true, files: data });
  } catch (e) {
    console.error('Admin archived LaTeX list error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


