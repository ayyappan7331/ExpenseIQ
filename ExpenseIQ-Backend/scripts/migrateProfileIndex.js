// One-time migration: drop the old profileId unique index on the profiles
// collection and let Mongoose rebuild it as (userId, profileId) compound.
//
// Run once: node scripts/migrateProfileIndex.js

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const collection = db.collection('profiles');

  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  // Drop the old single-field unique index on profileId if it exists
  const hasOld = indexes.some(
    (i) => i.key && i.key.profileId === 1 && !i.key.userId && i.unique
  );
  if (hasOld) {
    await collection.dropIndex('profileId_1');
    console.log('✅ Dropped old profileId_1 unique index');
  } else {
    console.log('ℹ️  Old index not found — already migrated or never existed');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch((err) => { console.error(err); process.exit(1); });
