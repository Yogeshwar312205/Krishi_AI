const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  role: {
    type: String,
    // 'Driver'/'Transporter' are legacy: no longer offered at registration, but
    // kept here so accounts created before the fleet-owner model still load.
    enum: ['Farmer', 'Logistics', 'Driver', 'Transporter', 'Trader', 'Buyer', 'APMC Buyer', 'Admin'],
    default: 'Farmer',
  },
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  /*
   * The crop this account mainly grows. Asked for at signup and editable from
   * the profile screen; it is the ACCOUNT's crop, not the consignment being
   * worked on right now (that lives in the client's cropDetails and is what
   * deals and pickup requests are filtered by). Empty for buyers and fleets.
   *
   * Until this field existed, signup collected the answer and dropped it.
   */
  primaryCrop: {
    type: String,
    trim: true,
    default: '',
  },
  /*
   * Buyer-specific location fields for APMC Buyer/Trader roles.
   * 
   * When a buyer posts a rate, farmers need to know where to deliver. This can
   * be the buyer's warehouse, APMC yard office, or procurement center - not
   * necessarily the mandi center point. These fields store the buyer's actual
   * pickup/delivery location.
   */
  buyerAddress: {
    type: String,
    trim: true,
    default: '',
  },
  buyerCoordinates: {
    type: [Number], // [longitude, latitude]
    default: undefined,
  },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
