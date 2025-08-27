import mongoose from 'mongoose';

const voiceNoteSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  file: {
    base64Data: { type: String, required: true },
    mimeType: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number }
  },
  recordedAt: { type: Date, default: Date.now }
}, { _id: false });

const videoNoteSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  file: {
    base64Data: { type: String, required: true },
    mimeType: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number }
  },
  recordedAt: { type: Date, default: Date.now }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  base64Data: { type: String, required: true },
  mimeType: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number }
}, { _id: false });

const recordSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true // Index for fast title searches
  },
  date: {
    type: Date,
    required: true,
    index: true // Index for fast date-based queries
  },
  tag: {
    type: String,
    required: true,
    index: true // Index for fast tag filtering
  },
  attachments: [attachmentSchema],
  link: {
    type: String,
    trim: true
  },
  voiceNotes: [voiceNoteSchema],
  videoNotes: [videoNoteSchema],
  owner: {
    type: String,
    required: true,
    index: true // Index for fast owner filtering
  },
  parentId: {
    type: String,
    default: null,
    index: true // Index for fast hierarchy queries
  },
  level: {
    type: Number,
    default: 0,
    index: true // Index for fast level-based queries
  },
  order: {
    type: Number,
    default: 0,
    index: true // Index for fast ordering
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Index for fast creation date queries
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true // Index for fast update date queries
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  // Optimize for read-heavy workloads
  readPreference: 'primaryPreferred'
});

// Compound indexes for common query patterns
recordSchema.index({ owner: 1, createdAt: -1 }); // Fast owner + date queries
recordSchema.index({ tag: 1, owner: 1 }); // Fast tag + owner filtering
recordSchema.index({ parentId: 1, level: 1, order: 1 }); // Fast hierarchy queries
recordSchema.index({ title: 'text', tag: 'text' }); // Text search index

// Optimize for common query patterns
recordSchema.set('autoIndex', false); // Disable auto-indexing in production

const Record = mongoose.models.Record || mongoose.model('Record', recordSchema);

export default Record;
