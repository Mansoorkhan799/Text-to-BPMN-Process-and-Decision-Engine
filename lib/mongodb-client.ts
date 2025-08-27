import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Add connection pooling options
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  // Enable connection monitoring
  monitorCommands: false,
};

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  try {
    // If we have a cached connection, use it
    if (cachedClient && cachedDb) {
      // Test if the connection is still alive
      try {
        await cachedClient.db('admin').command({ ping: 1 });
        return { client: cachedClient, db: cachedDb };
      } catch {
        // Connection is dead, clear cache and reconnect
        cachedClient = null;
        cachedDb = null;
      }
    }

    // Create new connection if none exists
    const client = await MongoClient.connect(uri, options);
    const db = client.db('nextauth');
    
    // Cache the connection
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});
