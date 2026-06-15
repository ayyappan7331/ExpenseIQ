import type { NewTransaction, TransactionSubtype } from '@/lib/types/api';
import { isValidSubtype } from '@/lib/types/api';

export interface ImportResult {
  valid: NewTransaction[];
  errors: { row: number; message: string }[];
  total: number;
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

// Valid subtype values — used to validate imported subtype column
const VALID_SUBTYPES = new Set([
  'payment', 'refund', 'cashback', 'reimbursement', 'transfer_in',
  'purchase', 'fee', 'interest', 'transfer_out', 'emi', 'other',
]);

export function parseTransactionsCSV(csv: string): ImportResult {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { valid: [], errors: [{ row: 0, message: 'Empty file' }], total: 0 };

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('date') || firstLine.includes('type') || firstLine.includes('amount');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detect column layout from header:
  // New 10-col: date, time, type, subtype, amount, category, subcategory, paymentMethod, paymentApp, notes
  // Old 9-col:  date, time, type, amount, category, subcategory, paymentMethod, paymentApp, notes
  // Legacy 6-col: date, type, amount, category, paymentMethod, notes
  const hasSubtype = hasHeader && firstLine.includes('subtype');
  const isNewFormat = hasHeader && firstLine.includes('time');

  const valid: NewTransaction[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const row = i + (hasHeader ? 2 : 1);
    const fields = parseLine(dataLines[i]);

    if (fields.length < 3) {
      errors.push({ row, message: 'Too few columns (need at least date, type, amount)' });
      continue;
    }

    let date: string, time: string, type: string, subtypeRaw: string, amountStr: string,
        category: string, subcategory: string, paymentMethod: string,
        paymentApp: string, notes: string;

    if (isNewFormat && hasSubtype) {
      // New 10-column format with subtype
      [date, time, type, subtypeRaw, amountStr, category, subcategory, paymentMethod, paymentApp, notes] = fields;
    } else if (isNewFormat) {
      // Old 9-column format without subtype
      [date, time, type, amountStr, category, subcategory, paymentMethod, paymentApp, notes] = fields;
      subtypeRaw = '';
    } else {
      // Legacy 6-column format: date, type, amount, category, paymentMethod, notes
      [date, type, amountStr, category, paymentMethod, notes] = fields;
      time = '';
      subtypeRaw = '';
      subcategory = '';
      paymentApp = '';
    }

    if (!DATE_RE.test(date)) {
      errors.push({ row, message: `Invalid date: "${date}" (expected YYYY-MM-DD)` });
      continue;
    }
    if (type !== 'income' && type !== 'expense') {
      errors.push({ row, message: `Invalid type: "${type}" (expected income or expense)` });
      continue;
    }
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ row, message: `Invalid amount: "${amountStr}"` });
      continue;
    }

    // Validate subtype: unknown values are silently cleared;
    // mismatched type/subtype combinations are also silently cleared.
    const subtype = (subtypeRaw && VALID_SUBTYPES.has(subtypeRaw) && isValidSubtype(type as 'income' | 'expense', subtypeRaw))
      ? (subtypeRaw as TransactionSubtype)
      : undefined;

    valid.push({
      
      date,
      time: (time && TIME_RE.test(time)) ? time : undefined,
      type,
      subtype,
      amount,
      category: category || undefined,
      subcategory: subcategory || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentApp: paymentApp || undefined,
      notes: notes || undefined,
    });
  }

  return { valid, errors, total: dataLines.length };
}
