import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String }, // plain for now, but will use hashedpassword
  hashedpassword: { type: String, required: true },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  requestedAt: { type: Date, default: Date.now },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);