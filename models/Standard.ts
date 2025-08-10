import mongoose from 'mongoose';

const standardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying (name and code already have unique indexes)
standardSchema.index({ category: 1 });
standardSchema.index({ isActive: 1 });

const Standard = mongoose.models.Standard || mongoose.model('Standard', standardSchema);

export default Standard;
