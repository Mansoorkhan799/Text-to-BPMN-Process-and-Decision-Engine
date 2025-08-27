import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-client';

export async function GET() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const { db } = await connectToDatabase();
    console.log('Successfully connected to MongoDB');
    
    console.log('Connected to database: nextauth');
    
    // Test the connection by listing collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Test the records collection specifically
    const recordsCount = await db.collection('records').countDocuments();
    console.log('Records count:', recordsCount);
    
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connection successful',
      database: 'nextauth',
      collections: collections.map(c => c.name),
      recordsCount
    });
    
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    return NextResponse.json({ 
      error: 'MongoDB connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
