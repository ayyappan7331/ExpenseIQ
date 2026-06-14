const Joi = require('joi');

const register = Joi.object({
  email: Joi.string().email().allow('', null).optional(),
  mobile: Joi.string().pattern(/^(\+91|91)?[6-9]\d{9}$/).allow('', null).optional(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required(),
  dob: Joi.string().allow('', null).optional(),
  purpose: Joi.string().allow('', null).optional(),
}).or('email', 'mobile');   // at least one required

const login = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
});

const sendOtp = Joi.object({
  identifier: Joi.string().required(),
  purpose: Joi.string().valid('verify', 'reset', 'login').required(),
});

const verifyOtp = Joi.object({
  identifier: Joi.string().required(),
  code: Joi.string().length(6).required(),
  purpose: Joi.string().valid('verify', 'reset', 'login').required(),
});

const resetPassword = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

// Validator for OTP-based login (two steps reuse sendOtp + verifyOtp; this
// covers the final step where verifyOtp returns a full session token)
const loginOtp = Joi.object({
  identifier: Joi.string().required(),
  code: Joi.string().length(6).required(),
});

module.exports = { register, login, sendOtp, verifyOtp, resetPassword, loginOtp };
