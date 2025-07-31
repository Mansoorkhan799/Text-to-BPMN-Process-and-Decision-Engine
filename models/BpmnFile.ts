import mongoose from 'mongoose';

const bpmnFileSchema = new mongoose.Schema({
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
    enum: ['xml', 'json'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  processMetadata: {
    processName: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    processOwner: {
      type: String,
      default: '',
    },
    processManager: {
      type: String,
      default: '',
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

const BpmnFile = mongoose.models.BpmnFile || mongoose.model('BpmnFile', bpmnFileSchema);

export default BpmnFile; 