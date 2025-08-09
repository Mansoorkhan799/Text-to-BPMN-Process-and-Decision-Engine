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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    // Accept either _id or fileId via params.id
    let file = await LatexFile.findById(params.id).lean();
    if (!file) file = await LatexFile.findOne({ fileId: params.id }).lean();
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, file });
  } catch (e) {
    console.error('Admin GET latex file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    let res = await LatexFile.findByIdAndDelete(params.id);
    if (!res) res = await LatexFile.findOneAndDelete({ fileId: params.id });
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin DELETE latex file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const body = await req.json();
    const update: any = {};
    if (typeof body.name === 'string') update.name = body.name;
    if (typeof body.ownerUserId === 'string') update.ownerUserId = body.ownerUserId;
    if (typeof body.userId === 'string') update.userId = body.userId; // true owner field
    if (typeof body.archived === 'boolean') update.archived = body.archived;
    update.updatedAt = new Date();

    let file = await LatexFile.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
    if (!file) file = await LatexFile.findOneAndUpdate({ fileId: params.id }, { $set: update }, { new: true }).lean();
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Mirror archive status in archive collection
    if (typeof body.archived === 'boolean') {
      const docId: any = (file as any)?._id || (file as any)?.fileId;
      if (docId) {
        if (body.archived) {
          await LatexArchivedFile.findOneAndUpdate(
            { _id: docId },
            { $set: file },
            { upsert: true, new: true }
          );
        } else {
          await LatexArchivedFile.findOneAndDelete({ _id: docId });
        }
      }
    }
    return NextResponse.json({ success: true, file });
  } catch (e) {
    console.error('Admin PATCH latex file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


