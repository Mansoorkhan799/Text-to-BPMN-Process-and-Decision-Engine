import mongoose from 'mongoose';

const latexFileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: false,
    unique: false,
  },
  userId: {
    type: String,
    required: true,
  },
  ownerUserId: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['tex', 'latex'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  documentMetadata: {
    title: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  archived: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Useful indexes for admin listing
latexFileSchema.index({ createdAt: -1 });
latexFileSchema.index({ updatedAt: -1 });
latexFileSchema.index({ name: 1 });

const LatexFile = mongoose.models.LatexFile || mongoose.model('LatexFile', latexFileSchema);

export default LatexFile; 