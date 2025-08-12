import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'supervisor'],
    default: 'user',
  },
  // Additional profile fields
  phoneNumber: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
  },
  // Profile picture
  profilePicture: {
    type: String,
    trim: true,
  },
  // Authentication method
  authType: {
    type: String,
    enum: ['email', 'google'],
    default: 'email',
  },
  // Google authentication fields
  googleId: {
    type: String,
    sparse: true,
  },
  picture: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Create the model if it doesn't exist, otherwise use the existing one
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 