import mongoose from 'mongoose';

const latexFileTreeSchema = new mongoose.Schema({
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

const LatexFileTree = mongoose.models.LatexFileTree || mongoose.model('LatexFileTree', latexFileTreeSchema);

export default LatexFileTree; 