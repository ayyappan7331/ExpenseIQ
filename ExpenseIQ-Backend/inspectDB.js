require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    console.log('Connecting to', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const Profile = require('./models/Profile');
    const User = require('./models/User');
    const Transaction = require('./models/Transaction');

    const users = await User.find().lean();
    console.log('Users:', JSON.stringify(users, null, 2));

    const profiles = await Profile.find().lean();
    console.log('Profiles:', JSON.stringify(profiles, null, 2));

    const txnCount = await Transaction.countDocuments();
    const defaultTxnCount = await Transaction.countDocuments({ profileId: 'default' });
    console.log(`Total transactions: ${txnCount}. Transactions with profileId 'default': ${defaultTxnCount}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
