/**
 * ExpenseIQ API Client
 * Drop this into the frontend to replace localStorage with backend API calls.
 * 
 * Usage: Include this script in the HTML, then replace localStorage calls with API.xxx()
 * 
 * All methods return Promises. Use async/await in the calling code.
 */

const API_BASE = 'http://localhost:5000/api';

const API = {
  // --- Transactions ---
  async getTransactions(profileId = 'default', month = '') {
    const params = new URLSearchParams({ profileId });
    if (month) params.append('month', month);
    const res = await fetch(`${API_BASE}/transactions?${params}`);
    return res.json();
  },

  async createTransaction(data) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTransaction(id, data) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTransaction(id) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async bulkDeleteTransactions(ids) {
    const res = await fetch(`${API_BASE}/transactions/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.json();
  },

  async importTransactions(txns) {
    const res = await fetch(`${API_BASE}/transactions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txns),
    });
    return res.json();
  },

  // --- Subscriptions ---
  async getSubscriptions(profileId = 'default') {
    const res = await fetch(`${API_BASE}/subscriptions?profileId=${profileId}`);
    return res.json();
  },

  async createSubscription(data) {
    const res = await fetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSubscription(id, data) {
    const res = await fetch(`${API_BASE}/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSubscription(id) {
    const res = await fetch(`${API_BASE}/subscriptions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- Debts ---
  async getDebts(profileId = 'default') {
    const res = await fetch(`${API_BASE}/debts?profileId=${profileId}`);
    return res.json();
  },

  async createDebt(data) {
    const res = await fetch(`${API_BASE}/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateDebt(id, data) {
    const res = await fetch(`${API_BASE}/debts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteDebt(id) {
    const res = await fetch(`${API_BASE}/debts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- Goals ---
  async getGoals(profileId = 'default') {
    const res = await fetch(`${API_BASE}/goals?profileId=${profileId}`);
    return res.json();
  },

  async upsertGoal(data) {
    const res = await fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteGoal(id) {
    const res = await fetch(`${API_BASE}/goals/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- Profiles ---
  async getProfiles() {
    const res = await fetch(`${API_BASE}/profiles`);
    return res.json();
  },

  async createProfile(data) {
    const res = await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteProfile(id) {
    const res = await fetch(`${API_BASE}/profiles/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- Credit Cards ---
  async getCreditCards(profileId = 'default') {
    const res = await fetch(`${API_BASE}/creditcards?profileId=${profileId}`);
    return res.json();
  },

  async createCreditCard(data) {
    const res = await fetch(`${API_BASE}/creditcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCreditCard(id, data) {
    const res = await fetch(`${API_BASE}/creditcards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCreditCard(id) {
    const res = await fetch(`${API_BASE}/creditcards/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- Settings ---
  async getSettings(profileId = 'default') {
    const res = await fetch(`${API_BASE}/settings?profileId=${profileId}`);
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // --- Health ---
  async health() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
