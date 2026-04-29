import mongoose from 'mongoose';

const StatusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Status || mongoose.model('Status', StatusSchema);