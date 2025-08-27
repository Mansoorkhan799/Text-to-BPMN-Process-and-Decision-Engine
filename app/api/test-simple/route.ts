import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        error: 'MONGODB_URI environment variable is not set',
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('MONGODB'))
      }, { status: 500 });
    }

    console.log('Testing simple MongoDB connection...');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('nextauth');
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Simple connection successful',
      collections: collections.map(c => c.name)
    });
    
  } catch (error) {
    console.error('Simple connection test failed:', error);
    return NextResponse.json({ 
      error: 'Connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
