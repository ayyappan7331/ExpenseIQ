import type { Transaction, FinancialConfig } from '@/lib/types/api';

function fmt(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(ds: string): string {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(time: string | undefined): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export function exportPDF(transactions: Transaction[], config?: FinancialConfig): void {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  void config;

  const rows = transactions.map(t => `
    <tr>
      <td class="nowrap">${fmtDate(t.date)}</td>
      <td class="nowrap">${fmtTime(t.time)}</td>
      <td>${t.category ?? ''}</td>
      <td>${t.subcategory ?? ''}</td>
      <td class="truncate">${t.notes ?? ''}</td>
      <td>${t.paymentMethod ?? ''}</td>
      <td>${t.paymentApp ?? ''}</td>
      <td class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ExpenseIQ — Transaction Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 11px; color: #1a1d2e; padding: 24px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #5a6080; font-size: 11px; margin-bottom: 20px; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px 16px; background: #f0f2f8; border-radius: 8px; }
  .summary-item { display: flex; flex-direction: column; gap: 2px; }
  .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #5a6080; }
  .summary-value { font-size: 14px; font-weight: 600; }
  .income { color: #20c997; }
  .expense { color: #f03e6a; }
  .net-pos { color: #20c997; }
  .net-neg { color: #f03e6a; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  col.date  { width: 10%; }
  col.time  { width: 7%; }
  col.cat   { width: 11%; }
  col.subcat{ width: 10%; }
  col.notes { width: 20%; }
  col.method{ width: 10%; }
  col.app   { width: 10%; }
  col.amount{ width: 12%; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #5a6080; padding: 6px 6px; border-bottom: 2px solid #e8ebf5; }
  td { padding: 5px 6px; border-bottom: 1px solid #e8ebf5; vertical-align: top; overflow: hidden; }
  td.nowrap { white-space: nowrap; }
  td.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.amount { text-align: right; font-weight: 600; white-space: nowrap; }
  tr:nth-child(even) td { background: #f8f9fc; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm; size: A4 landscape; }
  }
</style>
</head>
<body>
<h1>Transaction Report</h1>
<p class="meta">Exported on ${date} &nbsp;·&nbsp; ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}</p>
<div class="summary">
  <div class="summary-item"><span class="summary-label">Income</span><span class="summary-value income">+${fmt(totalIncome)}</span></div>
  <div class="summary-item"><span class="summary-label">Expense</span><span class="summary-value expense">-${fmt(totalExpense)}</span></div>
  <div class="summary-item"><span class="summary-label">Net</span><span class="summary-value ${net >= 0 ? 'net-pos' : 'net-neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</span></div>
</div>
<table>
  <colgroup>
    <col class="date"><col class="time"><col class="cat"><col class="subcat">
    <col class="notes"><col class="method"><col class="app"><col class="amount">
  </colgroup>
  <thead>
    <tr>
      <th>Date</th><th>Time</th><th>Category</th><th>Subcategory</th>
      <th>Notes</th><th>Method</th><th>App</th><th>Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
