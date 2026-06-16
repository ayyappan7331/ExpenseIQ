const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Profile = require('./models/Profile');
const Transaction = require('./models/Transaction');
const Subscription = require('./models/Subscription');
const Debt = require('./models/Debt');
const Goal = require('./models/Goal');
const CreditCard = require('./models/CreditCard');
const Settings = require('./models/Settings');
const Budget = require('./models/Budget');
const FinancialConfig = require('./models/FinancialConfig');
const dns = require('dns');

// Force Google DNS to bypass Windows ISP DNS filtering on SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const TARGET_EMAIL = 'ayyappan7331@gmail.com';
  const user = await User.findOne({ email: TARGET_EMAIL });

  if (!user) {
    console.error(`User ${TARGET_EMAIL} not found. Please register this account first.`);
    process.exit(1);
  }

  const userId = user._id;
  console.log(`Migrating default profile data to user: ${userId}`);

  const collections = [
    Transaction,
    Subscription,
    Debt,
    Goal,
    CreditCard,
    Settings,
    Budget,
    FinancialConfig
  ];

  for (const Model of collections) {
    console.log(`Updating ${Model.modelName}...`);
    // Find all records that belong to the 'default' profile
    await Model.updateMany(
      { profileId: 'default' },
      { $set: { userId, context: 'Personal' } }
    );
    // Delete any remaining records (from other test profiles)
    await Model.deleteMany({ profileId: { $ne: 'default' }, userId: { $exists: false } });
    
    // Unset the profileId field
    await Model.collection.updateMany({}, { $unset: { profileId: "" } });
  }

  console.log('Dropping profiles collection...');
  try {
    await Profile.collection.drop();
  } catch (err) {
    if (err.code === 26) {
      console.log('Profiles collection already dropped.');
    } else {
      console.error(err);
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

run().catch(console.error);
