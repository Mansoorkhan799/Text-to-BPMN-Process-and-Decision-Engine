const { MongoClient } = require('mongodb');

async function createRecordIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sidemenu';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('nextauth');
    const collection = db.collection('records');

    console.log('🔧 Creating indexes for Records collection...');

    // Create individual field indexes
    await collection.createIndex({ title: 1 });
    console.log('✅ Created index on title field');

    await collection.createIndex({ date: 1 });
    console.log('✅ Created index on date field');

    await collection.createIndex({ tag: 1 });
    console.log('✅ Created index on tag field');

    await collection.createIndex({ owner: 1 });
    console.log('✅ Created index on owner field');

    await collection.createIndex({ parentId: 1 });
    console.log('✅ Created index on parentId field');

    await collection.createIndex({ level: 1 });
    console.log('✅ Created index on level field');

    await collection.createIndex({ order: 1 });
    console.log('✅ Created index on order field');

    await collection.createIndex({ createdAt: 1 });
    console.log('✅ Created index on createdAt field');

    await collection.createIndex({ updatedAt: 1 });
    console.log('✅ Created index on updatedAt field');

    // Create compound indexes for common query patterns
    await collection.createIndex({ owner: 1, createdAt: -1 });
    console.log('✅ Created compound index on owner + createdAt');

    await collection.createIndex({ tag: 1, owner: 1 });
    console.log('✅ Created compound index on tag + owner');

    await collection.createIndex({ parentId: 1, level: 1, order: 1 });
    console.log('✅ Created compound index on parentId + level + order');

    // Create text search index
    await collection.createIndex({ title: 'text', tag: 'text' });
    console.log('✅ Created text search index on title + tag');

    console.log('🎉 All indexes created successfully!');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('\n📊 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createRecordIndexes().catch(console.error);
