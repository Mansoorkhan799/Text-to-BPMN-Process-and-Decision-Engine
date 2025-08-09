import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import BpmnNode from '@/models/BpmnNode';
import BpmnArchivedNode from '@/models/BpmnArchivedNode';

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

    // Prefer archived collection if present
    let files = await BpmnArchivedNode.find({ archived: true })
      .select({ id: 1, name: 1, 'advancedDetails.createdBy': 1, userId: 1, ownerUserId: 1, createdAt: 1, updatedAt: 1, archived: 1 })
      .sort({ updatedAt: -1 })
      .lean();
    if (!files || files.length === 0) {
      files = await BpmnNode.find({ type: 'file', archived: true })
        .select({ id: 1, name: 1, 'advancedDetails.createdBy': 1, userId: 1, ownerUserId: 1, createdAt: 1, updatedAt: 1, archived: 1 })
        .sort({ updatedAt: -1 })
        .lean();
    }

    const data = files.map((f: any) => ({
      id: f.id,
      name: f.name,
      userId: f.userId || '',
      ownerUserId: f.ownerUserId || '',
      createdBy: f?.advancedDetails?.createdBy || '',
      archived: !!f.archived,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ success: true, files: data });
  } catch (e) {
    console.error('Admin archived BPMN list error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


