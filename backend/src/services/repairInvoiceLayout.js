const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const supported = new Set(['MauPhieuTiepNhan', 'MauPhieuSuaChua', 'MauPhieuTamTinh', 'MauBaoGia', 'MauPhieuBanGiao', 'MauHoaDonSuaChua', 'MauPhieuXuatKho']);

// Use the compact sales layout for the standard A5 garage documents.
function apply(xml, type) {
  if (!supported.has(type)) return xml;
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ''), 'text/xml');
  const elements = Array.from(doc.getElementsByTagName('*'));
  const named = name => elements.find(node => node.getAttribute('Name') === name);
  const title = named('Title'), summary = named('StyledSummary'), footer = named('StyledFooter');
  const page = doc.getElementsByTagName('ReportPage')[0];
  const a5 = page && Math.abs(Number(page.getAttribute('PaperWidth')) - 148) < 0.2 && Math.abs(Number(page.getAttribute('PaperHeight')) - 210) < 0.2;
  const set = (node, attrs) => {
    if (node) for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  };
  if (!a5 && type !== 'MauHoaDonSuaChua') return xml;
  if (a5 && type === 'MauPhieuXuatKho' && named('ReportTitle1')?.getAttribute('Height') === '198.45' && named('Text4')?.getAttribute('Text') === 'PHIẾU XUẤT KHO') {
    set(named('ReportTitle1'), { Height: 142, CanGrow: 'true', CanShrink: 'true' });
    const positions = {
      Text3: [65, 0, 230, 20], Text6: [65, 22, 230, 19],
      Text39: [65, 41, 230, 19], Text40: [9.45, 64, 280, 19],
      Text4: [290, 4, 220, 29], Text22: [290, 35, 220, 19], Text20: [290, 55, 220, 21],
      Text41: [9.45, 85, 80, 19], Text44: [89.45, 85, 235, 19], Text42: [330.75, 85, 179.55, 19],
      Text45: [9.45, 104, 80, 19], Text43: [89.45, 104, 235, 19], Text28: [274.05, 123, 236.25, 19],
    };
    for (const [name, [left, top, width, height]] of Object.entries(positions)) {
      const node = named(name);
      set(node, { Left: left, Top: top, Width: width, Height: height, CanGrow: 'true', ShiftMode: 'WhenOverlapped', Font: 'Arial, 9pt' });
    }
    set(named('Text3'), { Font: 'Arial, 10pt, style=Bold' });
    for (const name of ['Text3', 'Text6', 'Text39', 'Text40']) set(named(name), { HorzAlign: 'Left' });
    set(named('Text4'), { Font: 'Arial, 13pt, style=Bold', HorzAlign: 'Center' });
    for (const name of ['Text22', 'Text20']) set(named(name), { HorzAlign: 'Center' });
    set(named('Text20'), { Font: 'Arial, 10pt, style=Bold' });
    for (const picture of Array.from(doc.getElementsByTagName('PictureObject'))) {
      if (picture.parentNode === named('ReportTitle1')) set(picture, { Left: 9.45, Top: 0, Width: 50, Height: 50 });
    }
    if (named('Text1') && !named('Text1').getAttribute('Text')) named('Text1').parentNode.removeChild(named('Text1'));
    for (const name of ['PageHeader1', 'Table3', 'Row5']) set(named(name), { Height: 20 });
    for (const cell of Array.from(named('Row5')?.childNodes || []).filter(node => node.tagName === 'TableCell')) {
      if (cell.getAttribute('Text') === 'Số lượng') cell.setAttribute('Text', 'SL');
    }
    for (const cell of Array.from(named('Table4')?.getElementsByTagName('TableCell') || [])) {
      set(cell, { 'Border.Lines': 'None' });
      if (/Bằng chữ:|ToVndWords\(/i.test(cell.getAttribute('Text') || '')) {
        set(cell, { HorzAlign: 'Right', WordWrap: 'true', CanGrow: 'true' });
      }
      if (cell.getAttribute('Text') === 'TỔNG TIỀN:' || cell.getAttribute('Text') === '[TONGCONG]') {
        set(cell, { 'Border.Lines': 'Top', 'Border.Style': 'Solid', Font: 'Arial, 13pt, style=Bold' });
      }
    }
    return new XMLSerializer().serializeToString(doc);
  }
  if (!title || title.getAttribute('Height') !== '212' || !named('StyledText1')) return xml;
  set(title, { Height: 128 });
  const header = {
    StyledText1: [0, 20], StyledText2: [22, 19], StyledText3: [41, 19],
    StyledText4: [4, 29], StyledText5: [35, 19], StyledText6: [55, 21],
    StyledText7: [70, 19], StyledText8: [89, 19],
    StyledText9: [89, 19], StyledText10: [108, 19],
  };
  for (const [name, [top, height]] of Object.entries(header)) set(named(name), { Top: top, Height: height });
  // Keep address and employee in separate columns even when either wraps.
  set(named('StyledText9'), { Width: title.getAttribute('Width') * 0.64 });
  const note = named('StyledText11');
  if (note) note.parentNode.removeChild(note); // invoiceNotePrint puts the optional note below the items.

  for (const name of ['Data1', 'Columns', 'detail', 'colHeader']) set(named(name), { Height: 20 });
  for (const name of ['detailRow', 'colHeaderRow']) set(named(name), { MinHeight: 20 });
  set(named('StyledText12'), { Top: 20 });
  if (!summary || !footer) {
    const textSummary = doc.getElementsByTagName('ReportSummaryBand')[0];
    set(named('StyledText13'), { Top: 2, Height: 20, CanShrink: 'true', VisibleExpression: '[Extra] != ""' });
    set(named('StyledText14'), { Top: 24, Height: 24 });
    set(textSummary, { Height: 48, CanShrink: 'true' });
    return new XMLSerializer().serializeToString(doc);
  }
  let summaryHeight = 0;
  for (const row of Array.from(summary.childNodes).filter(node => node.tagName === 'TableRow')) {
    const height = row.getAttribute('Name') === 'GrandTotalSummary' ? 26 : 20;
    set(row, { MinHeight: height });
    summaryHeight += height;
  }
  set(named('SubtotalSummaryAmount'), { Font: 'Arial, 10pt, style=Bold' });
  set(named('GrandTotalSummaryLabel'), { Font: 'Arial, 13pt, style=Bold' });
  set(named('GrandTotalSummaryAmount'), { Font: 'Arial, 13pt, style=Bold' });
  set(named('WordsSummary'), { MinHeight: 22 });
  set(named('ExtraSummary'), { MinHeight: 20 });
  // Put the payment balance and amount in words in the same column as the totals.
  for (const name of ['ExtraSummary', 'WordsSummary']) {
    const row = named(name);
    if (row) summary.appendChild(row);
  }
  set(named('WordsCell'), { HorzAlign: 'Right', Padding: '2, 2, 2, 2', WordWrap: 'true', CanGrow: 'true' });
  summaryHeight += 42;
  set(summary, { Height: summaryHeight, 'Border.Lines': 'None' });
  set(named('SignaturesSummary'), { Height: 32 });
  set(footer, { Top: summaryHeight, Height: 32, ShiftMode: 'Always' });
  set(summary.parentNode, { Height: summaryHeight + 32 });
  return new XMLSerializer().serializeToString(doc);
}

module.exports = { apply };
