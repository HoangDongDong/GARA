// Direct STEMPLATE IDs only. OTHERCONFIG is a JSON array (or a single UUID).
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function templateFilter(otherConfig) {
  const text = String(otherConfig || '').trim();
  if (uuid.test(text)) return { ids: [text.toLowerCase()] };
  if (text.startsWith('[')) {
    let ids;
    try { ids = JSON.parse(text); } catch { throw new Error('Danh sách ID mẫu in trong OTHERCONFIG không hợp lệ.'); }
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !uuid.test(id))) throw new Error('OTHERCONFIG chỉ chấp nhận danh sách ID STEMPLATE.');
    return { ids: [...new Set(ids.map(id => id.toLowerCase()))] };
  }
  if (/^(SFORMID|STABLEDESCID)\b/i.test(text)) throw new Error('Cần chuyển OTHERCONFIG sang danh sách ID STEMPLATE trực tiếp.');
  return null;
}

async function templateOptions(query, filter) {
  if (!filter.ids.length) return [];
  const rows = await query(`SELECT ID, NAME FROM STEMPLATE WHERE ID IN (${filter.ids.map(() => '?').join(',')})
    AND STATUS IN (0,30) ORDER BY SORTORDER, AUTOID, NAME`, filter.ids);
  return rows.map(row => ({ value: row.ID, label: row.NAME }));
}

module.exports = { templateFilter, templateOptions };
