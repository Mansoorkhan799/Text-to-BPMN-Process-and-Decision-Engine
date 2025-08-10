import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Standard from '@/models/Standard';

export async function GET() {
  try {
    await connectDB();
    
    const standards = await Standard.find({ isActive: true })
      .select('_id name code description category')
      .sort({ name: 1 });
    
    return NextResponse.json({ success: true, standards });
  } catch (error) {
    console.error('Error fetching standards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch standards' },
      { status: 500 }
    );
  }
}
