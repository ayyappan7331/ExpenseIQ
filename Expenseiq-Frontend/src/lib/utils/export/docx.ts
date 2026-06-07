import type { Transaction } from '@/lib/types/api';
import { downloadBlob } from './json';

// Re-use the same ZIP builder from xlsx.ts — copy inline to avoid circular imports
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
function u16(n: number) { return new Uint8Array([n & 0xff, (n >> 8) & 0xff]); }
function u32(n: number) { return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]); }
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}
const enc = new TextEncoder();

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: { name: string; data: Uint8Array; offset: number; crc: number }[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const local = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), nameBytes, data,
    );
    entries.push({ name: f.name, data, offset, crc });
    localParts.push(local);
    offset += local.length;
  }
  const centralParts: Uint8Array[] = [];
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    centralParts.push(concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.data.length), u32(e.data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset), nameBytes,
    ));
  }
  const central = concat(...centralParts);
  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  );
  return concat(...localParts, central, eocd);
}

function xmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function para(text: string, bold = false, size = 20): string {
  const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${rPr}<w:rPr><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function tableRow(cells: string[], header = false): string {
  const tcs = cells.map(c => {
    const rPr = header ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r>${rPr}<w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xmlEsc(c)}</w:t></w:r></w:p></w:tc>`;
  }).join('');
  return `<w:tr>${tcs}</w:tr>`;
}

export function exportDOCX(transactions: Transaction[], filename: string): void {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headers = ['Date', 'Time', 'Type', 'Category', 'Subcategory', 'Method', 'App', 'Notes', 'Amount'];
  const dataRows = transactions.map(t => [
    t.date, t.time ?? '', t.type,
    t.category ?? '', t.subcategory ?? '',
    t.paymentMethod ?? '', t.paymentApp ?? '',
    t.notes ?? '',
    `${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}`,
  ]);

  const tableXml = `<w:tbl>
<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
</w:tblBorders></w:tblPr>
${tableRow(headers, true)}
${dataRows.map(r => tableRow(r)).join('\n')}
</w:tbl>`;

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${para('Transaction Report', true, 28)}
${para(`Exported on ${date}  ·  ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`, false, 18)}
${para('')}
${para(`Income: ${fmt(totalIncome)}   Expense: ${fmt(totalExpense)}   Net: ${net >= 0 ? '+' : ''}${fmt(net)}`, false, 20)}
${para('')}
${tableXml}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
</w:body>
</w:document>`;

  const files = [
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    },
    { name: 'word/document.xml', content: document },
  ];

  downloadBlob(
    new Blob([buildZip(files) as unknown as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    filename
  );
}
