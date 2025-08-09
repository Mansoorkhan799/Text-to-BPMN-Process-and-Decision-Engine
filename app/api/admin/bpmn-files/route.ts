import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import BpmnNode from '@/models/BpmnNode';

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
    // AuthZ: only admins can access
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const files = await BpmnNode.find({ type: 'file' })
      .select({
        id: 1,
        name: 1,
        userId: 1,
        ownerUserId: 1,
        archived: 1,
        'advancedDetails.createdBy': 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = files.map((f: any) => ({
      id: f.id,
      name: f.name,
      userId: f.userId || '',
      ownerUserId: f.ownerUserId || '',
      archived: !!f.archived,
      createdBy: f?.advancedDetails?.createdBy || '',
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ success: true, files: data });
  } catch (error) {
    console.error('Error fetching admin BPMN files:', error);
    return NextResponse.json({ error: 'Failed to fetch BPMN files' }, { status: 500 });
  }
}


