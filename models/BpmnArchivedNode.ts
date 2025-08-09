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

const bpmnArchivedNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  ownerUserId: { type: String, default: '' },
  type: { type: String, enum: ['folder', 'file'], required: true },
  name: { type: String, required: true },
  parentId: { type: String, default: null },
  children: [{ type: String }],
  content: { type: String },
  processMetadata: { type: processMetadataSchema },
  advancedDetails: { type: advancedDetailsSchema },
  signOffData: { type: signOffDataSchema },
  historyData: { type: historyDataSchema },
  triggerData: { type: triggerDataSchema },
  archived: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

bpmnArchivedNodeSchema.index({ updatedAt: -1 });
bpmnArchivedNodeSchema.index({ name: 1 });

const BpmnArchivedNode = mongoose.models.BpmnArchivedNode || mongoose.model('BpmnArchivedNode', bpmnArchivedNodeSchema);

export default BpmnArchivedNode;


