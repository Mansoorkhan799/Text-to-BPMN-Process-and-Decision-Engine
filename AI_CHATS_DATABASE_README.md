# AI Chats Database Implementation

This document describes the database implementation for storing AI chat conversations in the AI Process Generator application.

## Database Schema

### Table: `ai-chats`

The `ai-chats` table stores all chat conversations between users and the AI system.

#### Schema Fields:

```typescript
{
  _id: ObjectId,                    // MongoDB document ID
  userId: ObjectId,                 // Reference to User document
  title: String,                    // Chat title/summary
  messages: [Message],              // Array of conversation messages
  timestamp: Date,                  // When the chat was created
  lastModified: Date,               // Last modification timestamp
  isArchived: Boolean,              // Archive status
  tags: [String],                   // Optional tags for categorization
  category: String,                 // Chat category (e.g., 'General', 'Sales', 'HR')
  createdAt: Date,                  // Document creation timestamp
  updatedAt: Date                   // Document update timestamp
}
```

#### Message Schema:

```typescript
{
  id: String,                       // Unique message ID
  type: 'user' | 'assistant',      // Message sender type
  content: String,                  // Message content
  timestamp: Date                   // Message timestamp
}
```

## API Endpoints

### 1. GET `/api/ai-chats`
**Purpose**: Retrieve all chats for the authenticated user

**Query Parameters**:
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for chat titles
- `category`: Filter by category
- `archived`: Filter archived chats (true/false)

**Response**:
```json
{
  "chats": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### 2. POST `/api/ai-chats`
**Purpose**: Create a new chat

**Request Body**:
```json
{
  "title": "Chat Title",
  "messages": [...],
  "category": "General",
  "tags": ["tag1", "tag2"]
}
```

**Response**: Created chat object

### 3. GET `/api/ai-chats/[id]`
**Purpose**: Retrieve a specific chat with full messages

**Response**: Complete chat object

### 4. PUT `/api/ai-chats/[id]`
**Purpose**: Update an existing chat

**Request Body**: Partial update object
**Response**: Updated chat object

### 5. DELETE `/api/ai-chats/[id]`
**Purpose**: Delete a chat

**Response**: Success message

## Frontend Integration

### Service Layer
The frontend uses `aiChatService` to interact with the database:

```typescript
import aiChatService from '@/app/utils/aiChatService';

// Create a new chat
const newChat = await aiChatService.createChat({
  title: "Chat Title",
  messages: [...],
  category: "General"
});

// Load all chats
const response = await aiChatService.getChats({
  page: 1,
  limit: 20,
  search: "search term"
});

// Update a chat
const updatedChat = await aiChatService.updateChat(chatId, {
  title: "New Title"
});

// Delete a chat
await aiChatService.deleteChat(chatId);
```

### Component Integration
The `AIProcessGenerator` component automatically:
- Loads chats from the database on mount
- Saves new conversations to the database
- Updates existing chats in real-time
- Handles chat deletion and archiving

## Database Indexes

The following indexes are created for optimal performance:

```typescript
// User and timestamp index for efficient user-specific queries
aiChatSchema.index({ userId: 1, timestamp: -1 });

// Text search index for chat titles
aiChatSchema.index({ userId: 1, title: 'text' });
```

## Authentication & Security

- All API endpoints require authentication via NextAuth.js
- Users can only access their own chats
- User ID is extracted from the session and validated
- All database operations are scoped to the authenticated user

## Error Handling

The system includes comprehensive error handling:
- Database connection errors
- Authentication failures
- Invalid request data
- Chat not found scenarios
- User permission violations

## Usage Examples

### Creating a New Chat
```typescript
const userMessage = {
  id: Date.now().toString(),
  type: 'user' as const,
  content: "Create a customer order workflow",
  timestamp: new Date()
};

const aiMessage = {
  id: (Date.now() + 1).toString(),
  type: 'assistant' as const,
  content: "I'll help you create a customer order workflow...",
  timestamp: new Date()
};

const newChat = await aiChatService.createChat({
  title: "Customer Order Workflow",
  messages: [userMessage, aiMessage],
  category: "Sales",
  tags: ["workflow", "customer", "order"]
});
```

### Loading User Chats
```typescript
const loadUserChats = async () => {
  try {
    const response = await aiChatService.getChats({
      page: 1,
      limit: 50,
      category: "Sales"
    });
    
    setChats(response.chats);
    setTotalPages(response.pagination.pages);
  } catch (error) {
    console.error('Failed to load chats:', error);
  }
};
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live chat updates
2. **Chat Sharing**: Allow users to share chats with team members
3. **Advanced Search**: Full-text search across chat content
4. **Chat Templates**: Pre-defined chat structures for common processes
5. **Analytics**: Chat usage statistics and insights
6. **Export**: Export chats to various formats (PDF, Word, etc.)

## Database Migration

To set up the database:

1. Ensure MongoDB is running
2. The collection will be created automatically when the first chat is saved
3. Indexes are created automatically via the Mongoose schema
4. No manual migration scripts are required

## Monitoring & Maintenance

- Monitor database performance with MongoDB Compass
- Check index usage and query performance
- Regular backup of the `ai-chats` collection
- Monitor storage usage and implement archiving strategies for old chats
