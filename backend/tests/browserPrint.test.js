const test = require('node:test');
const assert = require('node:assert/strict');
const { htmlDocument, paperFor, barcodeSvg } = require('../src/services/browserPrint');
const printing = require('../src/services/documentPrint');

const template = xml => ({ content: Buffer.from(xml) });
const data = {
  parameters: { DocTitle: 'LỆNH SỬA CHỮA', DocNumber: 'LSC-TEST', CompanyName: 'Công ty GARA', TONGCONG: 1100000, SummaryText: 'Tổng cộng: 1.100.000 đ', FooterNote: 'Ký tên' },
  tables: { Table0: [{ Index: '1', ItemName: 'Lọc dầu', QuantityText: '2', UnitPriceText: '550.000 đ', AmountText: '1.100.000 đ', Note: 'Thay mới' }] },
};

test('paper sizes preserve portrait, landscape, A5 and receipt widths', () => {
  assert.deepEqual(paperFor('<ReportPage PaperWidth="297" PaperHeight="210" Landscape="true">'), { name: 'A4 ngang', width: 297, height: 210, landscape: true, thermal: false });
  assert.equal(paperFor('<ReportPage PaperWidth="148" PaperHeight="210">').name, 'A5 đứng');
  assert.equal(paperFor('<ReportPage Landscape="true">').width, 297);
  for (const width of [54, 58, 77, 80]) assert.equal(paperFor(`<ReportPage PaperWidth="${width}">`).width, width);
});

test('legacy sales bills use named receipt sizes and tolerate decimal A5 dimensions', () => {
  const page = '<ReportPage Name="Page1" LeftMargin="3">';
  for (const width of [54, 58, 77, 80]) {
    const name = `Mẫu in bill ${width}mm`;
    assert.equal(paperFor(page, name).width, width);
    const html = htmlDocument(printing.typeByKey('MauHoaDonBanHang'), data, { ...template(page), NAME: name });
    assert.ok(html.includes(`@page{size:${width}mm 297mm`));
    assert.ok(html.includes(`.sheet{width:${width}mm`));
    assert.ok(html.includes('<tbody class="receipt-item">'));
    assert.ok(!html.includes('<th>STT</th>'));
    assert.ok(html.includes('white-space:nowrap'));
  }
  assert.equal(paperFor(page, 'Mẫu 54 mm x 2 dòng').width, 54);
  assert.equal(paperFor('<ReportPage PaperWidth="148.1" PaperHeight="210.1">', 'Mẫu in bill A5').name, 'A5 đứng');
  assert.equal(paperFor('<ReportPage PaperWidth="210.1" PaperHeight="148.1">').name, 'A5 ngang');
  assert.equal(paperFor(page, 'Mẫu in bill A5').width, 148);
  assert.equal(paperFor('<ReportPage PaperWidth="210" PaperHeight="297">', 'Mẫu in bill 80mm').width, 210);
  const custom = paperFor('<ReportPage PaperWidth="215.9" PaperHeight="139">', 'Mẫu in A5 cho máy in kim');
  assert.equal(custom.width, 215.9);
  assert.equal(custom.height, 139);
});

test('all document layouts produce printable HTML without executing FRX content', () => {
  for (const type of printing.types) {
    const html = htmlDocument(type, data, template('<ReportPage PaperWidth="80"><TextObject Text="DEMO VERSION"/></ReportPage>'));
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes('LSC-TEST'));
    assert.ok(html.includes('@page{size:80mm 297mm'));
    assert.ok(!html.includes('DEMO VERSION'));
    assert.ok(!html.includes('<script'));
  }
});

test('customer values and notes cannot insert executable markup into the print frame', () => {
  const input = structuredClone(data);
  input.parameters.CustomerName = '<img src=x onerror="alert(1)">';
  input.tables.Table0[0].Note = '</td><script>alert(1)</script>';
  const html = htmlDocument(printing.typeByKey('MauPhieuSuaChua'), input, template(''));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Một triệu một trăm nghìn'));
});

test('saved company logo takes priority over the embedded FRX image', () => {
  const logo = Buffer.from([137, 80, 78, 71]);
  const html = htmlDocument(printing.typeByKey('MauPhieuSuaChua'), data, template('<PictureObject Image="OLDIMAGE"/>'), logo);
  assert.ok(html.includes(`data:image/png;base64,${logo.toString('base64')}`));
  assert.ok(!html.includes('OLDIMAGE'));
});

test('barcode encodes Code128 B data, checksum and quiet zones', () => {
  const svg = barcodeSvg('ABC');
  // Start + 3 characters + checksum = 55 modules; stop = 13, quiet zones = 20.
  assert.ok(svg.includes('viewBox="0 0 88 70"'));
  assert.equal((svg.match(/<rect /g) || []).length, 19);
  assert.ok(!barcodeSvg('Ắ').includes('<svg'));
});
