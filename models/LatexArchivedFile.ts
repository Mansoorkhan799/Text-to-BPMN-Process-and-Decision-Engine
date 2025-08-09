import mongoose from 'mongoose';

const latexArchivedFileSchema = new mongoose.Schema({
  fileId: { type: String, required: false, unique: false },
  userId: { type: String, required: true },
  ownerUserId: { type: String, default: '' },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['tex', 'latex'], required: true },
  content: { type: String, required: true },
  documentMetadata: {
    title: { type: String, default: '' },
    author: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  archived: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

latexArchivedFileSchema.index({ updatedAt: -1 });
latexArchivedFileSchema.index({ name: 1 });

const LatexArchivedFile = mongoose.models.LatexArchivedFile || mongoose.model('LatexArchivedFile', latexArchivedFileSchema);

export default LatexArchivedFile;


