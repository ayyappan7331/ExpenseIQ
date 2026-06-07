const mongoose = require('mongoose');

// Phase 7. Stores `passwordHash` only — the raw password never reaches Mongo.
// `passwordHash` is excluded from JSON output so it can't leak via responses.
// Either email or mobile is required (enforced at the service/validator layer).

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,          // allows null/undefined — uniqueness only on actual values
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true,          // allows null/undefined
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    dob: { type: String, default: '' },        // YYYY-MM-DD string
    purpose: { type: String, default: '' },    // personal | business | family | student | other
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
