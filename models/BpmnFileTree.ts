import mongoose from 'mongoose';

const bpmnFileTreeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    required: true,
  },
  treeData: {
    type: Array,
    required: true,
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

const BpmnFileTree = mongoose.models.BpmnFileTree || mongoose.model('BpmnFileTree', bpmnFileTreeSchema);

export default BpmnFileTree; 