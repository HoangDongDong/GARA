const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
function prepare(header, rows) {
  const billRate = Number(header.TILEGIAMGIA || 0);
  let lineDiscountTotal = 0;
  const details = rows.map(row => {
    const amount = Number(row.THANHTIEN || 0);
    let lineDiscount = Number(row.TIENCHIETKHAU);
    let lineRate = Number(row.TILECHIETKHAU);
    if (row.TIENCHIETKHAU == null || row.TILECHIETKHAU == null) {
      // Older invoices store the combined reduction. Recover the line discount
      // from the amount remaining after the additional bill discount.
      const factor = 1 - billRate / 100;
      const net = amount - Number(row.TIENGIAMGIA || 0);
      lineDiscount = factor > 0 ? round(amount - net / factor) : 0;
      lineDiscount = Math.max(0, Math.min(amount, lineDiscount));
      lineRate = amount ? round(lineDiscount / amount * 100) : 0;
    }
    lineDiscountTotal = round(lineDiscountTotal + lineDiscount);
    const quantity = Number(row.SLXUAT || 0);
    const net = round(amount - lineDiscount);
    return { ...row, LineDiscountRate: lineRate, LineDiscountText: lineRate > 0 ? `${lineRate}%` : '', LineDiscountAmount: lineDiscount,
      LineNetAmount: net, LineNetPrice: quantity ? round(net / quantity) : 0 };
  });
  return { rows: details, lineDiscountTotal,
    afterLineDiscount: round(Number(header.TIENHANGCHUAGIAM ?? header.TIENHANG ?? 0) - lineDiscountTotal),
    billDiscount: round(Number(header.TIENGIAMGIA || 0) - lineDiscountTotal) };
}
function template(xml) {
  if (xml.includes('Name="detailDiscountRow"')) return xml.replace('Text="Giá sau CK"', 'Text="Giá"').replace('Text="[Table0.LineNetPrice]"', 'Text="[Table0.DONGIA]"');
  if (!xml.includes('Name="detail"') || !xml.includes('Name="colHeader"')) return xml;
  const widths = [62, 20, 27, 49, 31, 56.7];
  const table = (name, detail) => {
    const original = xml.match(new RegExp(`<TableObject Name="${name}"[^>]*>`))?.[0];
    if (!original) return '';
    const texts = detail ? ['[Table0.DMATHANG_NAME]', '[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]', '[Table0.DDONVITINH_NAME]', '[Table0.DONGIA]', '[Table0.LineDiscountRate]%', '[Table0.LineNetAmount]']
      : ['Mặt hàng', 'SL', 'ĐVT', 'Giá', 'CK %', 'T tiền'];
    return original + widths.map((width, index) => `<TableColumn Name="${name}DiscountCol${index}" Width="${width}"/>`).join('')
      + `<TableRow Name="${name}DiscountRow" MinHeight="18.9" AutoSize="true">`
      + texts.map((text, index) => `<TableCell Name="${name}DiscountCell${index}" Border.Lines="All" Border.Style="Dash" Padding="1, 1, 1, 1" ${detail ? '' : 'Fill.Color="255, 255, 192"'} Text="${text}" ${detail && [1,3,5].includes(index) ? 'WordWrap="false" Format="Number" Format.UseLocale="false" Format.DecimalDigits="0" Format.GroupSeparator=","' : ''} HorzAlign="${index ? 'Right' : 'Left'}" VertAlign="Center" Font="Tahoma, 7pt${detail ? '' : ', style=Bold'}"/>`).join('')
      + '</TableRow></TableObject>';
  };
  xml = xml.replace(/<TableObject Name="colHeader"[\s\S]*?<\/TableObject>/, table('colHeader', false))
    .replace(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/, table('detail', true));
  xml = xml.replace(/(<TableDataSource Name="Table0"[^>]*>)/, '$1<Column Name="LineNetPrice" DataType="System.Decimal"/><Column Name="LineDiscountRate" DataType="System.Decimal"/><Column Name="LineNetAmount" DataType="System.Decimal"/>');
  xml = xml.replace(/\[TIENHANG\]/g, '[SalesAfterLineDiscount]').replace(/\[TIENGIAMGIA\]/g, '[SalesBillDiscount]');
  return xml.replace('</Dictionary>', '<Parameter Name="SalesAfterLineDiscount" DataType="System.Decimal"/><Parameter Name="SalesBillDiscount" DataType="System.Decimal"/></Dictionary>');
}
function hideUnusedDiscountColumns(xml, rows) {
  if (rows.some(row => Number(row.LineDiscountRate || 0) > 0 || Number(row.LineDiscountAmount || 0) > 0)) {
    xml = xml.replace(/Text="\[Table0.LineDiscountRate\]%"/g, 'Text="[Table0.LineDiscountText]"');
    if (!xml.includes('<Column Name="LineDiscountText"')) xml = xml.replace(/(<TableDataSource Name="Table0"[^>]*>)/, '$1<Column Name="LineDiscountText" DataType="System.String"/>');
    return xml;
  }
  return xml.replace(/<TableObject\b[^>]*>[\s\S]*?<\/TableObject>/g, table => {
    const columns = [...table.matchAll(/<TableColumn\b[^>]*\/>/g)].map(match => match[0]);
    if (!columns.length) return table;
    let discountIndex = -1;
    for (const match of table.matchAll(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g)) {
      const cells = [...match[0].matchAll(/<TableCell\b[^>]*\/>/g)].map(cell => cell[0]);
      const index = cells.findIndex(cell => /Text="(?:CK\s*%|Chiết khấu(?:\s*%)?|[^"\r\n]*\[Table0\.(?:LineDiscountRate|TILEGIAMGIA)\][^"\r\n]*)"/i.test(cell));
      if (index >= 0 && cells.length === columns.length) { discountIndex = index; break; }
    }
    if (discountIndex < 0) return table;
    // Keep the receipt width; use the freed space for the amount column.
    const removedWidth = Number(columns[discountIndex].match(/Width="([^"]+)"/)?.[1] || 0);
    const amountIndex = discountIndex === columns.length - 1 ? discountIndex - 1 : columns.length - 1;
    table = table.replace(columns[amountIndex], columns[amountIndex].replace(/Width="([^"]+)"/, (_, width) => `Width="${Number(width) + removedWidth}"`));
    table = table.replace(columns[discountIndex], '');
    return table.replace(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g, row => {
      const cells = [...row.matchAll(/<TableCell\b[^>]*\/>/g)].map(cell => cell[0]);
      if (cells.length !== columns.length) return row;
      row = row.replace(cells[discountIndex], '');
      return row.replace(/ColSpan="(\d+)"/g, (attribute, span) => Number(span) === columns.length ? `ColSpan="${Number(span) - 1}"` : attribute);
    });
  });
}
function fitMoneyColumns(xml, rows) {
  if (!rows.length) return xml;
  const widthFor = values => Math.max(34, ...values.map(value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }).length * 4.9 + 4));
  const priceWidth = widthFor(rows.map(row => row.DONGIA));
  const amountWidth = widthFor(rows.map(row => row.LineNetAmount ?? row.THANHTIEN));
  let layout;
  xml.replace(/<TableObject\b[^>]*Name="detail"[^>]*>[\s\S]*?<\/TableObject>/g, table => {
    const columns = [...table.matchAll(/<TableColumn\b[^>]*\/>/g)].map(match => match[0]);
    for (const match of table.matchAll(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g)) {
      const cells = [...match[0].matchAll(/<TableCell\b[^>]*\/>/g)].map(cell => cell[0]);
      const nameIndex = cells.findIndex(cell => /Text="\[Table0.DMATHANG_NAME\]"/.test(cell) && !/ColSpan=/.test(cell));
      const priceIndex = cells.findIndex(cell => /Text="\[Table0.(?:DONGIA|LineNetPrice)\]"/.test(cell));
      const amountIndex = cells.findIndex(cell => /Text="\[Table0.(?:LineNetAmount|THANHTIEN)\]"/.test(cell));
      if (nameIndex < 0 || priceIndex < 0 || amountIndex < 0 || cells.length !== columns.length) continue;
      const widths = columns.map(column => Number(column.match(/Width="([^"]+)"/)?.[1] || 0));
      const total = widths.reduce((sum, width) => sum + width, 0);
      const available = total - widths.reduce((sum, width, index) => [nameIndex, priceIndex, amountIndex].includes(index) ? sum : sum + width, 0);
      if (available - priceWidth - amountWidth < 40) continue;
      widths[priceIndex] = priceWidth;
      widths[amountIndex] = amountWidth;
      widths[nameIndex] = Math.round((available - priceWidth - amountWidth) * 100) / 100;
      layout = { widths, nameIndex };
      break;
    }
    return table;
  });
  if (!layout) return xml;
  xml = xml.replace(/<TableObject\b[^>]*Name="(?:detail|colHeader)"[^>]*>[\s\S]*?<\/TableObject>/g, table => {
    let index = 0;
    return table.replace(/<TableColumn\b[^>]*\/>/g, column => column.replace(/Width="[^"]*"/, `Width="${layout.widths[index++]}"`));
  });
  // The quantity total must follow the resized SL column.
  const detail = xml.match(/<TableObject\b[^>]*Name="detail"[^>]*>[\s\S]*?<\/TableObject>/)?.[0] || '';
  const cells = [...detail.matchAll(/<TableCell\b[^>]*\/>/g)].map(match => match[0]);
  const sl = cells.findIndex(cell => cell.includes('[Table0.SLXUATCHUAQUYDOI]'));
  if (sl >= 0) {
    const left = Number(detail.match(/\bLeft="([^"]+)"/)?.[1] || 0);
    const offset = layout.widths.slice(0, sl).reduce((sum, width) => sum + width, 0);
    xml = xml.replace(/<TextObject\b[^>]*Name="VariantTotalQuantity"[^>]*\/>/, tag => tag.replace(/Left="[^"]*"/, `Left="${left + offset}"`).replace(/Width="[^"]*"/, `Width="${layout.widths[sl]}"`));
    xml = xml.replace(/<TextObject\b[^>]*Name="VariantTotalQuantityLabel"[^>]*\/>/, tag => tag.replace(/Width="[^"]*"/, `Width="${offset}"`));
    xml = xml.replace(/<TableObject\b[^>]*Name="AlignedTotalQuantity"[^>]*>[\s\S]*?<\/TableObject>/, table => table.replace(/(<TableColumn Name="AlignedQuantityLabelColumn" Width=")[^"]*/, `$1${offset}`).replace(/(<TableColumn Name="AlignedQuantityEmptyColumn" Width=")[^"]*/, `$1${layout.widths.slice(sl + 1).reduce((sum, width) => sum + width, 0)}`));
  }
  return xml;
}
module.exports = { prepare, template, hideUnusedDiscountColumns, fitMoneyColumns };
