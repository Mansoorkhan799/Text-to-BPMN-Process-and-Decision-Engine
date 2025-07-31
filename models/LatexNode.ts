import mongoose from 'mongoose';

const documentMetadataSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  author: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String }],
}, { _id: false });

const latexNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID
  userId: { type: String, required: true },
  type: { type: String, enum: ['folder', 'file'], required: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null }, // null for root
  children: [{ type: String }], // Array of child node IDs (for folders)
  content: { type: String }, // LaTeX content (for files)
  documentMetadata: { type: documentMetadataSchema }, // For files
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const LatexNode = mongoose.models.LatexNode || mongoose.model('LatexNode', latexNodeSchema);

export default LatexNode; 