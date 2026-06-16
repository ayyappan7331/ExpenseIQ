// Strips volatile fields so snapshots are deterministic.
// We DO NOT modify the API response itself — only the value passed to toMatchSnapshot.

const VOLATILE = new Set(['_id', 'id', '__v', 'createdAt', 'updatedAt', 'timestamp', 'userId']);

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (VOLATILE.has(k)) {
        out[k] = `<${k}>`;
      } else {
        out[k] = normalize(v);
      }
    }
    return out;
  }
  return value;
}

module.exports = { normalize };
