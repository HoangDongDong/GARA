const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { definitions } = require('./documentNumbers');
const { documentTypes } = require('./garagePrintCatalog');
const functions = [
  ['DASHBOARD','Tổng quan'],['REPAIR','Sửa chữa - Dịch vụ'],['SALES','Bán hàng'],['INVENTORY','Nhập kho'],['SUPPLIERS','Nhà cung cấp'],['CUSTOMERS','Khách hàng'],['VEHICLES','Hồ sơ xe'],['WARRANTY','Bảo hành'],['FINANCE','Thu - Chi / Công nợ'],['EMPLOYEES','Nhân viên'],['REPORTS','Báo cáo'],['ADMIN','Quản trị - Phân quyền'],['SETTINGS','Cấu hình'],['CATALOG','Danh mục'],['COST','Giá nhập / Giá vốn'],['PAYROLL','Lương'],['COMMISSIONS','Hoa hồng'],['PAYMENTS','Thanh toán'],['PRICING','Điều chỉnh giá'],['EXPORT','Xuất dữ liệu'],['APPROVE_QUOTE','Duyệt báo giá'],['APPROVE_SUPPLEMENT','Duyệt phát sinh'],['ASSIGN_REPAIR','Phân công'],['HANDOVER','Giao xe'],
];
async function initialize(db) {
  await db.transaction(async (q, x) => {
    const group = crypto.randomUUID();
    await x("INSERT INTO SCONFIGGROUP (ID,NAME,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,'Cấu hình cửa hàng',30,1,'SYSTEM',CURRENT_TIMESTAMP)", [group]);
    async function setting(name, caption, value = '', type = 1) {
      await x("INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,DATATYPE,CONTROLTYPE,SCONFIGGROUPID,TEXTVALUE,INTVALUE,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,?,?,30,?,?,?, ?,?,1,'SYSTEM',CURRENT_TIMESTAMP)", [crypto.randomUUID(), name, caption, type, type === 3 ? '3' : '1', group, type === 1 ? value : null, type === 3 ? Number(value) : null]);
    }
    for (const [name, caption] of [['CompanyName','Tên cửa hàng'],['CompanyAddress','Địa chỉ'],['CompanyPhone','Điện thoại'],['CompanyEmail','Email']]) await setting(name, caption);
    for (const item of definitions) {
      await setting(item.name, item.label, item.pattern);
      await x("INSERT INTO SNUMBERCOUNTER (CODE,PERIODKEY,SEQ) VALUES (?,'ALL',0)", [item.key]);
    }
    await setting('PaymentAllowDebt', 'Cho phép công nợ', 30, 3);
    await setting('PaymentRequireBill', 'Bắt buộc in bill', 0, 3);
    await setting('CompanyLogo','Logo cửa hàng');
    await setting('LoiCamOn','Lời cảm ơn','Cảm ơn quý khách và hẹn gặp lại!');
    for (const [code, name] of functions) await x("INSERT INTO SFUNCTION (ID,CODE,NAME,NOTE,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,1,1,'SYSTEM',CURRENT_TIMESTAMP)", [crypto.randomUUID(), code, name, 'Nghiệp vụ']);
    const states=[[0,'Tiếp nhận & Báo giá','blue','inbox',1,2,0,0,1],[1,'Xác nhận sửa chữa','yellow','thumbs-up',1,3,1,0,2],[2,'Đang sửa','red','wrench',1,3,1,0,3],[3,'Giao xe','purple','check-double',3,4,5,0,4],[4,'Hoàn tất','green','check-circle',2,4,3,1,null]];
    for (const state of states) await x("INSERT INTO TWORKFLOWMAP (ID,STT_WORKFLOW,TEN,MAU,ICON,TRANGTHAI_TN,TRANGTHAI_CD,TRANGTHAI_LSC,IS_TERMINAL,NEXT_STT,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,?,?,?,?,?,?,1,'SYSTEM',CURRENT_TIMESTAMP)", [crypto.randomUUID(),...state]);
    const warehouse = crypto.randomUUID();
    await x("INSERT INTO DKHOHANG (ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,'Kho chính',1,'SYSTEM',CURRENT_TIMESTAMP)", [warehouse]);
    for (const type of documentTypes) {
      await setting(type.key, type.label || type.key);
      // Only repository-owned templates are seeded, never a customer's BLOBs.
      const directory = path.resolve(__dirname, '../../templates/business', type.key);
      const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => file.endsWith('.frx')).map(file=>path.join(directory,file)) : [];
      const fallback = path.resolve(__dirname,'../../templates/gara',type.key+'.frx');
      if(fs.existsSync(fallback))files.push(fallback);
      if(!files.length && type.key==='MauPhieuTamTinh')files.push(path.resolve(__dirname,'../../templates/gara/MauPhieuSuaChua.frx'));
      const ids = [];
      for (const file of files) {
        const id = crypto.randomUUID(); ids.push(id);
        await x("INSERT INTO STEMPLATE (ID,NAME,STATUS,TEMPLATE,REPORTBASE,USERCREATEDID,TIMECREATED) VALUES (?,?,30,?,0,'SYSTEM',CURRENT_TIMESTAMP)", [id, path.basename(file, '.frx'), fs.readFileSync(file)]);
      }
      if (ids.length) await x('UPDATE SCONFIG SET TEXTVALUE=?,OTHERCONFIG=? WHERE NAME=?', [ids[0], JSON.stringify(ids), type.key]);
    }
  });
  // Assert every table outside the explicit seed allowlist is empty.
  const allowed = new Set(['SCONFIGGROUP','SCONFIG','SNUMBERCOUNTER','SFUNCTION','TWORKFLOWMAP','DKHOHANG','STEMPLATE']);
  const tables = await db.query('SELECT TRIM(RDB$RELATION_NAME) AS NAME FROM RDB$RELATIONS WHERE COALESCE(RDB$SYSTEM_FLAG,0)=0 AND RDB$VIEW_BLR IS NULL');
  for (const table of tables) {
    const name = table.NAME;
    if (!/^[A-Z0-9_]+$/.test(name)) throw Error('Tên bảng cần được kiểm tra: ' + name);
    if (!allowed.has(name) && (await db.query(`SELECT FIRST 1 1 AS FOUND FROM ${name}`)).length) throw Error('Template có dữ liệu ngoài danh sách cho phép: ' + name);
  }
}
async function owner(db, tenant) {
  await db.transaction(async (q, x) => {
    // Fixed generated ID makes provisioning retry safe after a committed transaction.
    if (!(await q("SELECT ID FROM SUSER WHERE ID='SAAS_OWNER'")).length) await x("INSERT INTO SUSER (ID,NAME,USERNAME,PASSWORD,EMAIL,ISADMIN,STATUS,USERCREATEDID,TIMECREATED) VALUES ('SAAS_OWNER',?,?,?,?,1,1,'PROVISIONING',CURRENT_TIMESTAMP)", [tenant.OWNERNAME, tenant.OWNERLOGIN || 'owner', tenant.PASSWORDHASH, tenant.EMAIL]);
    await x("UPDATE SCONFIG SET TEXTVALUE=? WHERE NAME='CompanyName'", [tenant.NAME]);
    await x("UPDATE SCONFIG SET TEXTVALUE=? WHERE NAME='CompanyEmail'", [tenant.EMAIL]);
    await x("UPDATE SCONFIG SET TEXTVALUE=? WHERE NAME='CompanyPhone'", [tenant.PHONE || '']);
  });
}
module.exports = { initialize, owner, functions };
