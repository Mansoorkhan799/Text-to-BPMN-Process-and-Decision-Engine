import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sidemenu';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Initialize the cache if it doesn't exist
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

const cached = global.mongoose;

async function connectDB() {
  if (cached.conn) {
    console.log('✓ Already connected to MongoDB');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✓ Connected to MongoDB successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB; 