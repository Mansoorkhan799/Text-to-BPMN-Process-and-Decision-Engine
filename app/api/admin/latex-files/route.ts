import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import LatexFile from '@/models/LatexFile';

interface DecodedToken {
  role?: string;
  id?: string;
  email?: string;
}

function isAdmin(): boolean {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(_request: NextRequest) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const files = await LatexFile.find({})
      .select({ _id: 1, name: 1, 'documentMetadata.author': 1, createdAt: 1, fileId: 1, archived: 1 })
      .sort({ createdAt: -1 })
      .lean();

    const data = files.map((f: any) => ({
      id: String(f._id || f.fileId),
      mongoId: String(f._id || ''),
      fileId: f.fileId || '',
      name: f.name,
      author: f?.documentMetadata?.author || '',
      archived: !!f.archived,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({ success: true, files: data });
  } catch (error) {
    console.error('Error fetching admin LaTeX files:', error);
    return NextResponse.json({ error: 'Failed to fetch LaTeX files' }, { status: 500 });
  }
}


