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
  advancedDetails: {
    versionNo: {
      type: String,
      default: '1.0.0',
    },
    processStatus: {
      type: String,
      default: '',
    },
    classification: {
      type: String,
      default: '',
    },
    dateOfCreation: {
      type: String,
      default: '',
    },
    dateOfReview: {
      type: String,
      default: '',
    },
    effectiveDate: {
      type: String,
      default: '',
    },
    modificationDate: {
      type: String,
      default: '',
    },
    modifiedBy: {
      type: String,
      default: '',
    },
    changeDescription: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
      default: '',
    },
  },
  // Add the three table data structures
  signOffData: {
    responsibility: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
    },
    signature: {
      type: String,
      default: '',
    },
  },
  historyData: {
    versionNo: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    statusRemarks: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
  },
  triggerData: {
    triggers: {
      type: String,
      default: '',
    },
    inputs: {
      type: String,
      default: '',
    },
    outputs: {
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