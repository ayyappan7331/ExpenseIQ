import type { Transaction, FinancialConfig } from '@/lib/types/api';
import { downloadBlob } from './json';

// ---------------------------------------------------------------------------
// Minimal ZIP builder (STORED — no compression)
// ---------------------------------------------------------------------------

function crc32(data: Uint8Array): number {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

const enc = new TextEncoder();

interface ZipEntry { name: string; data: Uint8Array; offset: number; crc: number; }

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: ZipEntry[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);

    const local = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
      u16(20), u16(0), u16(0),                   // version, flags, compression (STORED)
      u16(0), u16(0),                             // mod time, mod date
      u32(crc),
      u32(data.length), u32(data.length),         // compressed = uncompressed
      u16(nameBytes.length), u16(0),              // name len, extra len
      nameBytes,
      data,
    );

    entries.push({ name: f.name, data, offset, crc });
    localParts.push(local);
    offset += local.length;
  }

  const centralParts: Uint8Array[] = [];
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    centralParts.push(concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
      u16(20), u16(20), u16(0), u16(0),          // versions, flags
      u16(0),                                     // compression STORED
      u16(0), u16(0),                             // mod time, date
      u32(e.crc),
      u32(e.data.length), u32(e.data.length),
      u16(nameBytes.length), u16(0), u16(0),      // name, extra, comment
      u16(0), u16(0),                             // disk start, int attrs
      u32(0),                                     // ext attrs
      u32(e.offset),
      nameBytes,
    ));
  }

  const central = concat(...centralParts);
  const centralOffset = offset;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(central.length), u32(centralOffset),
    u16(0),
  );

  return concat(...localParts, central, eocd);
}

// ---------------------------------------------------------------------------
// OOXML helpers
// ---------------------------------------------------------------------------

function xmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sheetXml(headers: string[], rows: (string | number)[][]): string {
  const colCount = headers.length;
  const colLetter = (i: number) => String.fromCharCode(65 + i);

  const headerRow = headers.map((h, i) =>
    `<c r="${colLetter(i)}1" t="inlineStr"><is><t>${xmlEsc(h)}</t></is></c>`
  ).join('');

  const dataRows = rows.map((row, ri) =>
    `<row r="${ri + 2}">${row.map((cell, ci) => {
      const ref = `${colLetter(ci)}${ri + 2}`;
      if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(String(cell))}</t></is></c>`;
    }).join('')}</row>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1">${headerRow}</row>
${dataRows}
</sheetData>
<sheetFormatPr defaultColWidth="${Math.max(12, Math.ceil(120 / colCount))}"/>
</worksheet>`;
}

// ---------------------------------------------------------------------------
// Public export function
// ---------------------------------------------------------------------------

export function exportXLSX(transactions: Transaction[], config: FinancialConfig | undefined, filename: string): void {
  const txHeaders = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Subcategory', 'Payment Method', 'Payment App', 'Notes'];
  const txRows: (string | number)[][] = transactions.map(t => [
    t.date, t.time ?? '', t.type, t.amount,
    t.category ?? '', t.subcategory ?? '',
    t.paymentMethod ?? '', t.paymentApp ?? '',
    t.notes ?? '',
  ]);

  const expCats = config?.customExpenseCategories ?? [];
  const incCats = config?.customIncomeCategories ?? [];
  const catRows: (string | number)[][] = [
    ...expCats.map(c => [c, 'expense']),
    ...incCats.map(c => [c, 'income']),
  ];

  const subcatRows: (string | number)[][] = [];
  const subcatMap = config?.subcategoryMap ?? {};
  for (const [cat, subs] of Object.entries(subcatMap)) {
    for (const sub of subs) subcatRows.push([cat, sub]);
  }

  const methodRows: (string | number)[][] = (config?.customPaymentMethods ?? []).map(m => [m]);
  const appRows: (string | number)[][] = (config?.customPaymentApps ?? []).map(a => [a]);

  const sheetNames = ['Transactions', 'Categories', 'Subcategories', 'Payment Methods', 'Payment Apps'];
  const sheets = [
    sheetXml(txHeaders, txRows),
    sheetXml(['Category', 'Type'], catRows),
    sheetXml(['Category', 'Subcategory'], subcatRows),
    sheetXml(['Payment Method'], methodRows),
    sheetXml(['Payment App'], appRows),
  ];

  const sheetRels = sheetNames.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('');

  const workbookSheets = sheetNames.map((name, i) =>
    `<sheet name="${xmlEsc(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('');

  const files: { name: string; content: string }[] = [
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetNames.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${workbookSheets}</sheets>
</workbook>`,
    },
    ...sheets.map((xml, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: xml })),
  ];

  const zip = buildZip(files);
  downloadBlob(
    new Blob([zip as unknown as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}
