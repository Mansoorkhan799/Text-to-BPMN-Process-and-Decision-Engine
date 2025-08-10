import mongoose from 'mongoose';

const processMetadataSchema = new mongoose.Schema({
  processName: { type: String, default: '' },
  description: { type: String, default: '' },
  processOwner: { type: String, default: '' },
  processManager: { type: String, default: '' },
}, { _id: false });

const advancedDetailsSchema = new mongoose.Schema({
  versionNo: { type: String, default: '1.0.0' },
  processStatus: { type: String, default: '' },
  classification: { type: String, default: '' },
  dateOfCreation: { type: String, default: '' },
  dateOfReview: { type: String, default: '' },
  effectiveDate: { type: String, default: '' },
  modificationDate: { type: String, default: '' },
  modifiedBy: { type: String, default: '' },
  changeDescription: { type: String, default: '' },
  createdBy: { type: String, default: '' },
}, { _id: false });

// Add the three table data schemas
const signOffDataSchema = new mongoose.Schema({
  responsibility: { type: String, default: '' },
  date: { type: String, default: '' },
  name: { type: String, default: '' },
  designation: { type: String, default: '' },
  signature: { type: String, default: '' },
}, { _id: false });

const historyDataSchema = new mongoose.Schema({
  versionNo: { type: String, default: '' },
  date: { type: String, default: '' },
  statusRemarks: { type: String, default: '' },
  author: { type: String, default: '' },
}, { _id: false });

const triggerDataSchema = new mongoose.Schema({
  triggers: { type: String, default: '' },
  inputs: { type: String, default: '' },
  outputs: { type: String, default: '' },
}, { _id: false });

const bpmnNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID
  userId: { type: String, required: true },
  ownerUserId: { type: String, default: '' },
  type: { type: String, enum: ['folder', 'file'], required: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null }, // null for root
  children: [{ type: String }], // Array of child node IDs (for folders)
  content: { type: String }, // BPMN XML (for files)
  processMetadata: { type: processMetadataSchema }, // For files
  advancedDetails: { type: advancedDetailsSchema }, // For files
  // Add the three table data structures
  signOffData: { type: signOffDataSchema }, // For files
  historyData: { type: historyDataSchema }, // For files
  triggerData: { type: triggerDataSchema }, // For files
  selectedStandards: [{ type: String }], // Array of selected standard IDs
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Useful indexes for admin listing
bpmnNodeSchema.index({ createdAt: -1 });
bpmnNodeSchema.index({ updatedAt: -1 });
bpmnNodeSchema.index({ name: 1 });

const BpmnNode = mongoose.models.BpmnNode || mongoose.model('BpmnNode', bpmnNodeSchema);

export default BpmnNode; 