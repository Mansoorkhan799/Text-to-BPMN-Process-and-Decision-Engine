import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Record from '@/models/Record';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const newRecord = new Record({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newRecord.save();
    
    return NextResponse.json({ 
      success: true, 
      id: newRecord._id.toString() 
    });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    const result = await Record.findByIdAndUpdate(
      id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      modifiedCount: 1,
      record: result
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tag = searchParams.get('tag');
    const owner = searchParams.get('owner');
    const parentId = searchParams.get('parentId');
    
    // Build query based on parameters
    const query: any = {};
    
    if (userId) query.userId = userId;
    if (tag && tag !== 'all') query.tag = tag;
    if (owner && owner !== 'all') query.owner = owner;
    
    // Only filter by parentId if explicitly requested
    // By default, fetch ALL records to build complete hierarchy
    if (parentId !== undefined && parentId !== null) {
      if (parentId === 'null' || parentId === '') {
        query.parentId = null; // Top-level records only
      } else {
        query.parentId = parentId; // Specific parent's children
      }
    }
    // If no parentId specified, fetch ALL records (no filter)
    
    // Use lean() for better performance when we don't need Mongoose documents
    const records = await Record.find(query)
      .sort({ createdAt: -1, order: 1 })
      .lean()
      .exec();
    

    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    const result = await Record.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: 1 
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
