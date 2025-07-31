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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const LatexFile = mongoose.models.LatexFile || mongoose.model('LatexFile', latexFileSchema);

export default LatexFile; 