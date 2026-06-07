// Date <-> YYYY-MM-DD helpers used by both the schema toJSON transform
// (so the wire format stays a string for backwards compatibility) and the
// one-shot migration script.
//
// All conversions go through UTC. Server TZ is irrelevant.

const toYMD = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fromYMD = (value) => {
  if (value == null) return value;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) {
    // Fallback for any non-canonical string; Mongoose would do the same.
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? value : fallback;
  }
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
};

// Schema-level toJSON transform that walks the response and converts
// each field named in `fields` from Date back to YYYY-MM-DD.
// Pass to `new Schema({...}, { toJSON: dateFieldsToJSON(['date']) })`.
const dateFieldsToJSON = (fields) => ({
  transform: (doc, ret) => {
    for (const f of fields) {
      if (ret[f] !== undefined) ret[f] = toYMD(ret[f]);
    }
    return ret;
  },
});

module.exports = { toYMD, fromYMD, dateFieldsToJSON };
