/**
 * Seed Script for ExpenseIQ
 *
 * Usage:
 *   node utils/seed.js              -> seeds 3 months of realistic demo data
 *   node utils/seed.js --import     -> imports from utils/import-data.json
 *
 * The demo data matches the categories, payment methods, and card names
 * the frontend (Expense Tracker.html) ships with, so no UI mismatches.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Debt = require('../models/Debt');
const Goal = require('../models/Goal');
const Profile = require('../models/Profile');
const CreditCard = require('../models/CreditCard');
const Settings = require('../models/Settings');

const pad = (n) => String(n).padStart(2, '0');

// Same expense templates the old frontend buildSampleData() used,
// with the same payment-method strings the modal dropdown lists.
const EXPENSE_TEMPLATES = [
  { category: 'EMI',            amount: 18000, paymentMethod: 'HDFC Bank',        notes: 'Home loan EMI',          day: 5  },
  { category: 'Food',           amount: 3800,  paymentMethod: 'HDFC Credit Card', notes: 'Groceries + dining out', day: 8  },
  { category: 'Fuel',           amount: 2600,  paymentMethod: 'HDFC Credit Card', notes: 'Petrol for the month',   day: 10 },
  { category: 'Recharge/Bills', amount: 1900,  paymentMethod: 'Amazon Pay CC',    notes: 'Phone + electricity',    day: 12 },
  { category: 'Shopping',       amount: 4200,  paymentMethod: 'Amazon Pay CC',    notes: 'Amazon orders',          day: 15 },
  { category: 'Entertainment',  amount: 1300,  paymentMethod: 'HDFC Credit Card', notes: 'Netflix + movie outing', day: 18 },
  { category: 'Family',         amount: 3500,  paymentMethod: 'Cash',             notes: 'Family groceries',       day: 20 },
  { category: 'Travel',         amount: 2800,  paymentMethod: 'HDFC Credit Card', notes: 'Weekend trip',           day: 22 },
  { category: 'Medical',        amount: 950,   paymentMethod: 'Cash',             notes: 'Medicines & checkup',    day: 25 },
  { category: 'Miscellaneous',  amount: 1400,  paymentMethod: 'HDFC Bank',        notes: 'Miscellaneous spends',   day: 28 },
];

function buildSampleTransactions(profileId = 'default') {
  const data = [];
  const now = new Date();

  // 3 months: current and the two prior (mo=2 oldest, mo=0 current)
  for (let mo = 2; mo >= 0; mo--) {
    const d = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    const yr = d.getFullYear();
    const mn = pad(d.getMonth() + 1);

    // Salary on 1st
    data.push({
      profileId, type: 'income', date: `${yr}-${mn}-01`, amount: 85000,
      source: 'Salary', category: '', paymentMethod: '', notes: 'Monthly salary',
    });

    // Birthday gift one month back
    if (mo === 1) {
      data.push({
        profileId, type: 'income', date: `${yr}-${mn}-10`, amount: 5000,
        source: "Dad's Gift", category: '', paymentMethod: '', notes: 'Birthday gift',
      });
    }

    EXPENSE_TEMPLATES.forEach(e => {
      // Frontend skipped Travel for current month
      if (mo === 0 && e.category === 'Travel') return;
      // Same +-15% jitter the frontend applied
      const amt = e.amount + Math.round((Math.random() - 0.5) * e.amount * 0.15);
      data.push({
        profileId, type: 'expense',
        date: `${yr}-${mn}-${pad(e.day)}`,
        amount: Math.max(100, amt),
        category: e.category,
        source: '',
        paymentMethod: e.paymentMethod,
        notes: e.notes,
      });
    });
  }
  return data;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// Dates relative to today so demo entries always look fresh
function isoDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoDate30FromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d.toISOString().slice(0, 10);
}

const demoSubscriptions = [
  { profileId: 'default', name: 'Netflix',  amount: 799, cycle: 'monthly', due: isoDate30FromNow(), category: 'Entertainment',    active: true },
  { profileId: 'default', name: 'Spotify',  amount: 119, cycle: 'monthly', due: isoDate30FromNow(), category: 'Music',            active: true },
  { profileId: 'default', name: 'iCloud',   amount: 75,  cycle: 'monthly', due: isoDate30FromNow(), category: 'Cloud & Storage',  active: true },
];

// Card names MUST match what the frontend looks up by name
const demoCreditCards = [
  { profileId: 'default', name: 'HDFC Credit Card',       billDate: 19, dueDate: 8,  limit: 300000, color: '#7c6ff7' },
  { profileId: 'default', name: 'Amazon Pay Credit Card', billDate: 11, dueDate: 30, limit: 150000, color: '#f59e0b' },
];

const demoDebts = [
  { profileId: 'default', type: 'lent',     person: 'Rahul', amount: 2500, note: 'Lunch tab',     date: isoDate(14), settled: false, settledDate: null },
  { profileId: 'default', type: 'borrowed', person: 'Priya', amount: 1500, note: 'Cab share',     date: isoDate(7),  settled: false, settledDate: null },
];

const demoGoals = [
  { profileId: 'default', month: currentMonth(), amount: 40000 },
];

async function seedDemo() {
  await connectDB();

  await Promise.all([
    Transaction.deleteMany({}), Subscription.deleteMany({}), Debt.deleteMany({}),
    Goal.deleteMany({}),        Profile.deleteMany({}),      CreditCard.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  await Profile.create({ profileId: 'default', name: 'Personal', icon: '👤', isDefault: true });
  await Transaction.insertMany(buildSampleTransactions('default'));
  await Subscription.insertMany(demoSubscriptions);
  await CreditCard.insertMany(demoCreditCards);
  await Debt.insertMany(demoDebts);
  await Goal.insertMany(demoGoals);
  await Settings.create({ profileId: 'default', theme: 'dark' });

  console.log('Demo data seeded for profile "default" (3 months of transactions).');
  process.exit(0);
}

async function importFromBackup() {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, 'import-data.json');

  if (!fs.existsSync(filePath)) {
    console.error('No import-data.json found in utils/ folder.');
    console.log('Export your backup from the app and save it as utils/import-data.json');
    process.exit(1);
  }

  await connectDB();
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const profileId = data.profileId || 'default';

  await Promise.all([
    Transaction.deleteMany({ profileId }), Subscription.deleteMany({ profileId }),
    Debt.deleteMany({ profileId }),        Goal.deleteMany({ profileId }),
    CreditCard.deleteMany({ profileId }),
  ]);

  if (data.txns && data.txns.length) {
    const txns = data.txns.map(t => ({
      profileId, type: t.type, amount: t.amount,
      category: t.category || '', source: t.source || '',
      date: t.date, paymentMethod: t.paymentMethod || '', notes: t.notes || '',
    }));
    await Transaction.insertMany(txns);
    console.log(`Imported ${txns.length} transactions`);
  }

  // Backup field name was 'subscriptions', not 'subs'
  const subsArr = data.subscriptions || data.subs || [];
  if (subsArr.length) {
    const subs = subsArr.map(s => ({
      profileId, name: s.name, amount: s.amount,
      cycle: s.cycle, due: s.due || s.dueDate,
      category: s.category, active: s.active !== false,
    }));
    await Subscription.insertMany(subs);
    console.log(`Imported ${subs.length} subscriptions`);
  }

  if (data.debts && data.debts.length) {
    const debts = data.debts.map(d => ({
      profileId, type: d.type, person: d.person, amount: d.amount,
      note: d.note || d.reason || '', date: d.date,
      settled: d.settled || false, settledDate: d.settledDate || null,
    }));
    await Debt.insertMany(debts);
    console.log(`Imported ${debts.length} debts`);
  }

  if (data.goals) {
    const goals = Object.entries(data.goals).map(([month, amount]) => ({ profileId, month, amount }));
    if (goals.length) {
      await Goal.insertMany(goals);
      console.log(`Imported ${goals.length} goals`);
    }
  }

  if (data.creditCards && data.creditCards.length) {
    const cards = data.creditCards.map(c => ({
      profileId, name: c.name, billDate: c.billDate, dueDate: c.dueDate,
      limit: c.limit, color: c.color || '#7c6ff7',
    }));
    await CreditCard.insertMany(cards);
    console.log(`Imported ${cards.length} credit cards`);
  }

  if (data.theme) {
    await Settings.findOneAndUpdate({ profileId }, { theme: data.theme }, { upsert: true });
  }

  console.log('Import complete!');
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--import')) importFromBackup();
else seedDemo();
