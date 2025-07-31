import mongoose from 'mongoose';

const processMetadataSchema = new mongoose.Schema({
  processName: { type: String, default: '' },
  description: { type: String, default: '' },
  processOwner: { type: String, default: '' },
  processManager: { type: String, default: '' },
}, { _id: false });

const bpmnNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID
  userId: { type: String, required: true },
  type: { type: String, enum: ['folder', 'file'], required: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null }, // null for root
  children: [{ type: String }], // Array of child node IDs (for folders)
  content: { type: String }, // BPMN XML (for files)
  processMetadata: { type: processMetadataSchema }, // For files
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const BpmnNode = mongoose.models.BpmnNode || mongoose.model('BpmnNode', bpmnNodeSchema);

export default BpmnNode; 