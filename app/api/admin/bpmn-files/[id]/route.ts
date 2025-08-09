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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const node = await BpmnNode.findOne({ id: params.id, type: 'file' }).lean();
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, file: node });
  } catch (e) {
    console.error('Admin GET bpmn file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const node = await BpmnNode.findOneAndDelete({ id: params.id, type: 'file' });
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin DELETE bpmn file error:', e);
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
    if (typeof body.userId === 'string') update.userId = body.userId; // if reassigning underlying ownership
    if (typeof body.archived === 'boolean') {
      update.archived = body.archived;
    }
    update.updatedAt = new Date();
    let node = await BpmnNode.findOneAndUpdate({ id: params.id, type: 'file' }, { $set: update }, { new: true });
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Mirror archive status in archive collection
    if (typeof body.archived === 'boolean') {
      if (body.archived) {
        // Upsert into archived collection
        await BpmnArchivedNode.findOneAndUpdate(
          { id: node.id },
          { $set: node.toObject() },
          { upsert: true, new: true }
        );
      } else {
        // Remove from archived collection
        await BpmnArchivedNode.findOneAndDelete({ id: node.id });
      }
    }

    const leanNode = node.toObject();
    return NextResponse.json({ success: true, file: node });
  } catch (e) {
    console.error('Admin PATCH bpmn file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


