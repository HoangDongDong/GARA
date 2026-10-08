// Add the fee beside VAT in legacy receipt tables without changing saved templates.
function applyServiceFeeRow(xml, parameters) {
  if (!Number(parameters.PHIDICHVU) || /\[(?:PHIDICHVU|ServiceFeeText|SummaryText|AdditionalChargesText)\]/.test(xml)) return xml;
  let inserted = false;
  return xml.replace(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g, row => {
    if (inserted || !row.includes('[TIENTHUE]')) return row;
    inserted = true;
    const fee = row.replace(/\bName="([^"]+)"/g, (_, name) => `Name="ChargeFee_${name}"`)
      .replace(/\bVisibleExpression="[^"]*"/g, 'VisibleExpression="[PrintShow_serviceFee]"')
      .replace(/\[TILETHUE\]/g, '[TILEPHIDICHVU]').replace(/\[TIENTHUE\]/g, '[PHIDICHVU]')
      .replace(/Text="[^"]*\[TILEPHIDICHVU\][^"]*"/, 'Text="Phí dịch vụ ([TILEPHIDICHVU]%):"');
    return fee + row;
  });
}
function formatSalesTotal(xml) {
  return xml.replace(/<(?:TableCell|TextObject)\b[^>]*>/g, tag => {
    if (!/\bText="\[(?:TONGCONG|TotalNumberText)\]"/.test(tag)) return tag;
    return tag.replace(/\bText="\[(?:TONGCONG|TotalNumberText)\]"/, 'Text="[TotalCommaText]"')
      .replace(/\sFormat(?:\.[\w]+)?="[^"]*"/g, '');
  });
}
function applyTaxBreakdown(xml, parameters) {
  const groups = require('./pricingPolicy').summary(parameters.TAXSUMMARY).filter(group => Number(group.amount) !== 0);
  if (!groups.length || parameters.PrintShow_tax === false) return xml;
  groups.forEach((group, index) => {
    parameters[`TaxGroupRate${index}`] = group.rate;
    parameters[`TaxGroupAmount${index}`] = group.amount;
    parameters[`TaxGroupAmountText${index}`] = Number(group.amount).toLocaleString('en-US');
  });
  // Receipt tables are expanded in memory; the user's saved FRX stays intact.
  let changed = false;
  xml = xml.replace(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g, row => {
    if (changed || !row.includes('[TIENTHUE]')) return row;
    changed = true;
    return groups.map((group, index) => row.replace(/\bName="([^"]+)"/g, (_, name) => `Name="TaxGroup${index}_${name}"`)
      .replace(/\[TILETHUE\]/g, `[TaxGroupRate${index}]`).replace(/\[TIENTHUE\]/g, `[TaxGroupAmount${index}]`)
      .replace(/<TableCell\b[^>]*>/g, tag => {
        // Conditions must keep the numeric amount; only displayed text is formatted.
        const amount = `[TaxGroupAmount${index}]`;
        if (!/\bText="[^"]*"/.test(tag) || !tag.match(/\bText="[^"]*"/)[0].includes(amount)) return tag;
        return tag.replace(/\bText="[^"]*"/, text => text.split(amount).join(`[TaxGroupAmountText${index}]`))
          .replace(/\sFormat(?:\.[\w]+)?="[^"]*"/g, '');
      })).join('');
  });
  if (!changed) {
    xml = xml.replace(/<(?:TextObject|TableCell)\b[^>]*>/g, tag => {
      if (!/Text="[^"]*\[TILETHUE\]/.test(tag)) return tag;
      return tag.replace(/Text="[^"]*"/, 'Text="VAT:"');
    });
  }
  return xml;
}
module.exports = { applyServiceFeeRow, formatSalesTotal, applyTaxBreakdown };
