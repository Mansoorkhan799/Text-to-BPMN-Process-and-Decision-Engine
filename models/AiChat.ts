import mongoose from 'mongoose';

const attachedFileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: false,
  },
});

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  attachedFiles: [attachedFileSchema],
});

const aiChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  messages: [messageSchema],
  timestamp: {
    type: Date,
    default: Date.now,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
}, {
  timestamps: true,
});

// Index for efficient queries
aiChatSchema.index({ userId: 1, timestamp: -1 });
aiChatSchema.index({ userId: 1, title: 'text' });

// Create the model if it doesn't exist, otherwise use the existing one
const AiChat = mongoose.models.AiChat || mongoose.model('AiChat', aiChatSchema);

export default AiChat;
