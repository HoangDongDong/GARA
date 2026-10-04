const db = require('./src/db');
(async () => {
  try {
    const rows = await db.query('SELECT ID, NAME FROM STEMPLATE WHERE ID = ?', ['190263eb-bc79-4ad2-9cee-ecd5d0470426']);
    if (!rows.length) return console.log('Template not found');
    const template = rows[0];
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [template.ID], 'TEMPLATE');
    const xml = content.toString('utf8');
    const SYSTEM_VARIABLES = new Set(['Date', 'Page', 'PageN', 'TotalPages', 'PageNofM', 'Row#', 'AbsRow#', 'CopyName#', 'HierarchyLevel', 'HierarchyRow#']);
    const names = new Set();
    for (const match of xml.matchAll(/\[([^\[\]\r\n]+)\]/g)) {
      const name = match[1].trim();
      if (!name || name.includes('.') || SYSTEM_VARIABLES.has(name) || /[=<>!+\-*/|&()"]/.test(name)) continue;
      names.add(name);
    }
    console.log(Array.from(names).join(', '));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
