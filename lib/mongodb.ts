import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sidemenu';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  connectionStartTime?: number;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Initialize the cache if it doesn't exist
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

const cached = global.mongoose;

// Only log MongoDB connection messages once every 10 minutes
const shouldLogConnection = () => {
  const now = Date.now();
  const tenMinutesMs = 10 * 60 * 1000;

  if (!cached.connectionStartTime || (now - cached.connectionStartTime) > tenMinutesMs) {
    cached.connectionStartTime = now;
    return true;
  }
  return false;
};

async function connectDB(silent = false) {
  if (cached.conn) {
    // Only log "already connected" if it's not a silent check and should log based on time
    if (!silent && shouldLogConnection()) {
      console.log('✓ Already connected to MongoDB');
    }
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      // Always log new connections
      console.log('✓ Connected to MongoDB successfully');
      cached.connectionStartTime = Date.now();
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    // Always log errors
    console.error('❌ Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB; 