const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const policy = require('../src/services/pricingPolicy');
const catalog = require('../src/services/catalogData');
const printing = require('../src/services/documentPrint');
const supplements = require('../src/services/repairSupplements');
const routers = { sales:require('../src/routes/sales'),repairs:require('../src/routes/repairOrders'),invoices:require('../src/routes/invoices'),
  customers:require('../src/routes/customers'),parts:require('../src/routes/parts') };
async function call(router, method, path, body, params={}) {
  const fn=router.stack.find(layer=>layer.route?.path===path && layer.route.methods[method]).route.stack[0].handle;
  let status=200,result;
  await fn({body,params,get:()=> 'TEST'}, {status(value){status=value;return this;},json(value){result=value;}});
  assert.equal(status,200,result?.error);
  return result;
}
test('Firebird policies: grouped VAT, customer discounts, snapshot preservation, supplements, invoices and FRX', {skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const original={query:db.query,execute:db.execute,transaction:db.transaction,queryBlob:db.queryBlob};
  const logo=process.env.RENDER_POLICIES==='1' ? await db.queryBlob("SELECT BLOBVALUE FROM SCONFIG WHERE NAME='CompanyLogo' AND STATUS=30",[],'BLOBVALUE') : null;
  const rollback=new Error('POLICY_ROLLBACK');
  let saleId,repairId;
  await assert.rejects(original.transaction(async(query,execute,uuid)=>{
    Object.assign(db,{query,execute,transaction:callback=>callback(query,execute,uuid)});
    if(process.env.RENDER_POLICIES==='1')db.queryBlob=(sql,...args)=>sql.includes('CompanyLogo')?Promise.resolve(logo):original.queryBlob(sql,...args);
    try {
      const products=await query(`SELECT M.ID,COALESCE((SELECT SUM(NC.SOLUONG) FROM TNHAPKHOCHITIET NC WHERE NC.DMATHANGID=M.ID),0)
        -COALESCE((SELECT SUM(XP.SOLUONG) FROM TXUATPHUTUNG XP WHERE XP.DMATHANGID=M.ID),0)
        -COALESCE((SELECT SUM(CT.SLXUAT) FROM TDONHANGCHITIET CT WHERE CT.DMATHANGID=M.ID AND CT.STATUS=1),0) AS STOCK
        FROM DMATHANG M WHERE M.STATUS=1 AND COALESCE(M.TAMKHOA,0)=0`);
      const available=products.filter(row=>Number(row.STOCK)>=5);assert.ok(available.length>=2);
      const [work]=await query('SELECT FIRST 1 ID FROM DDICHVU WHERE STATUS=1');
      const [customer]=await query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
      const group=await catalog.save('categories',null,{NAME:`TEST-VAT-${uuid()}`,THUESUATRIENG:10},'TEST');
      const customerGroup=await catalog.save('customer_groups',null,{NAME:`TEST-VIP-${uuid()}`,GIAMGIARIENG:5},'TEST');
      const customerBody={NAME:'POLICY-ROLLBACK',MAKHACH:uuid().slice(0,12),DNHOMKHACHHANGID:customerGroup.id,GIAMGIARIENG:7};
      const createdCustomer=await call(routers.customers,'post','/',customerBody);
      await call(routers.customers,'put','/:id',{...customerBody,GIAMGIARIENG:0},{id:createdCustomer.id});
      assert.equal(Number((await query('SELECT GIAMGIARIENG FROM DKHACHHANG WHERE ID=?',[createdCustomer.id]))[0].GIAMGIARIENG),0);
      await call(routers.customers,'put','/:id',{...customerBody,GIAMGIARIENG:null},{id:createdCustomer.id});
      assert.equal((await query('SELECT GIAMGIARIENG FROM DKHACHHANG WHERE ID=?',[createdCustomer.id]))[0].GIAMGIARIENG,null);
      const partBody={NAME:'POLICY-ROLLBACK',CODE:uuid().slice(0,12),DNHOMMATHANGID:group.id,THUESUATRIENG:8};
      const createdPart=await call(routers.parts,'post','/',partBody);
      await call(routers.parts,'put','/:id',{...partBody,THUESUATRIENG:0},{id:createdPart.id});
      assert.equal(Number((await query('SELECT THUESUATRIENG FROM DMATHANG WHERE ID=?',[createdPart.id]))[0].THUESUATRIENG),0);
      await call(routers.parts,'put','/:id',{...partBody,THUESUATRIENG:null},{id:createdPart.id});
      assert.equal((await query('SELECT THUESUATRIENG FROM DMATHANG WHERE ID=?',[createdPart.id]))[0].THUESUATRIENG,null);
      await execute('UPDATE DMATHANG SET DNHOMMATHANGID=?,THUESUATRIENG=NULL WHERE ID=?',[group.id,available[0].ID]);
      await execute('UPDATE DMATHANG SET DNHOMMATHANGID=?,THUESUATRIENG=8 WHERE ID=?',[group.id,available[1].ID]);
      await execute('UPDATE DKHACHHANG SET DNHOMKHACHHANGID=?,GIAMGIARIENG=NULL WHERE ID=?',[customerGroup.id,customer.ID]);
      await execute('UPDATE DDICHVU SET THUESUATRIENG=8 WHERE ID=?',[work.ID]);
      await execute("UPDATE SCONFIG SET DECIMALVALUE=20 WHERE NAME='MacDinhThueSuat'");
      await execute("UPDATE SCONFIG SET DECIMALVALUE=0 WHERE NAME='MacDinhPhiDichVu'");
      await execute("UPDATE SCONFIG SET INTVALUE=30 WHERE NAME IN ('BanHangTinhThue','BanHangTinhPhiDichVu','SalesPrintShow_tax','SalesPrintShow_discount')");
      const cart=available.slice(0,2).map(row=>({DMATHANGID:row.ID,SOLUONG:1,DONGIA:1000000}));
      const sale=await call(routers.sales,'post','/',{DKHACHHANGID:customer.ID,items:cart});saleId=sale.id;
      assert.equal(sale.discountRate,5);assert.equal(sale.discount,100000);assert.equal(sale.tax,171000);assert.equal(sale.total,2071000);
      const [saleRow]=await query('SELECT * FROM TDONHANG WHERE ID=?',[sale.id]);
      assert.equal(saleRow.CHARGEVERSION,1);assert.equal(Number(saleRow.TONGCONG),2071000);
      assert.deepEqual(policy.summary(saleRow.TAXSUMMARY).map(group=>group.rate),[8,10]);
      const detail=await query('SELECT TILETHUE,TIENTHUE,TIENGIAMGIA FROM TDONHANGCHITIET WHERE TDONHANGID=?',[sale.id]);
      assert.deepEqual(detail.map(row=>Number(row.TILETHUE)).sort((a,b)=>a-b),[8,10]);
      assert.equal(detail.reduce((sum,row)=>sum+Number(row.TIENGIAMGIA),0),100000);
      // Explicit zero is a real override, not inheritance.
      await execute('UPDATE DKHACHHANG SET GIAMGIARIENG=0 WHERE ID=?',[customer.ID]);
      const zero=await call(routers.sales,'post','/',{DKHACHHANGID:customer.ID,items:[{...cart[0],TILETHUE:0}]});
      assert.equal(zero.discountRate,0);assert.equal(zero.tax,0);assert.equal(zero.total,1000000);
      await execute('UPDATE DKHACHHANG SET GIAMGIARIENG=7 WHERE ID=?',[customer.ID]);
      const own=await call(routers.sales,'post','/',{DKHACHHANGID:customer.ID,items:[cart[0]]});assert.equal(own.discountRate,7);
      await execute('UPDATE DKHACHHANG SET GIAMGIARIENG=NULL WHERE ID=?',[customer.ID]);
      const vehicle=uuid();
      await execute("INSERT INTO DXE (ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID) VALUES (?,'POLICY TEST','POLICY-TEST',?,1,'TEST')",[vehicle,customer.ID]);
      const repair=await call(routers.repairs,'post','/',{DXEID:vehicle,DKHACHHANGID:customer.ID,items:[
        {LOAI:0,DMATHANGID:available[0].ID,SOLUONG:1,DONGIA:1000000},
        {LOAI:1,DDICHVUID:work.ID,SOLUONG:1,DONGIA:1000000},
      ]});repairId=repair.id;
      let order=(await call(routers.repairs,'get','/:id',{}, {id:repair.id})).data;
      assert.equal(Number(order.TONGCONG),2071000);assert.equal(Number(order.TILEGIAMGIA),5);
      const outputs=[['MauHoaDonBanHang',sale.id],['MauPhieuSuaChua',repair.id]];
      // Later master edits must not change the quote or original sale.
      await catalog.save('customer_groups',customerGroup.id,{GIAMGIARIENG:30},'TEST');
      await catalog.save('categories',group.id,{THUESUATRIENG:20},'TEST');
      await execute('UPDATE DDICHVU SET THUESUATRIENG=20 WHERE ID=?',[work.ID]);
      await execute("UPDATE SCONFIG SET DECIMALVALUE=0 WHERE NAME='MacDinhThueSuat'");
      for(const [key,id] of outputs){
        const data=await printing.payload(printing.typeByKey(key),id,{},'TEST');
        assert.equal(Number(data.parameters.TONGCONG),2071000);assert.equal(Number(data.parameters.TIENTHUE),171000);
        assert.match(data.parameters.TaxBreakdownText,/VAT 8%/);assert.match(data.parameters.TaxBreakdownText,/VAT 10%/);
        if(process.env.RENDER_POLICIES==='1'){
          const rendered=await printing.render(printing.typeByKey(key),id,{},'TEST');
          assert.equal(rendered.pdf.subarray(0,4).toString(),'%PDF');
          const fs=require('node:fs'),path=require('node:path');const folder=path.resolve(__dirname,'../tmp/pdfs');fs.mkdirSync(folder,{recursive:true});
          fs.writeFileSync(path.join(folder,`${key}-policies-check.pdf`),rendered.pdf);
        }
      }
      // New supplements inherit current item tax, while original lines and the
      // customer's approved 5% quote discount stay frozen.
      await execute('UPDATE TTRANGTHAIXE SET TRANGTHAI=2 WHERE ID=?',[repair.workflowId]);
      const proposal=await supplements.create(query,execute,uuid,repair.id,{LYDO:'Kiểm thử bổ sung',items:[{LOAI:0,DMATHANGID:available[0].ID,SOLUONG:1,DONGIA:100000}]},'TEST');
      const [supplement]=await query('SELECT ID FROM TPHATSINHSUACHUACT WHERE TPHATSINHSUACHUAID=?',[proposal.id]);
      await supplements.decide(query,execute,uuid,repair.id,proposal.id,{action:'decide',NGUOIXACNHAN:'TEST',BANGCHUNG:'Rollback test',approvedItemIds:[supplement.ID]},'TEST');
      order=(await call(routers.repairs,'get','/:id',{}, {id:repair.id})).data;
      assert.equal(Number(order.TILEGIAMGIA),5);assert.equal(Number(order.TIENGIAMGIA),105000);
      assert.equal(Number(order.TIENTHUE),190000);assert.equal(Number(order.TONGCONG),2185000);
      await execute('UPDATE TTRANGTHAIXE SET TRANGTHAI=3 WHERE ID=?',[repair.workflowId]);
      const invoice=await call(routers.invoices,'post','/',{TLENHSUACHUAID:repair.id,TIENMAT:2185000});
      assert.equal(invoice.total,2185000);assert.equal(invoice.paid,true);
      // Disabled switches suppress item/group/manual VAT and service fees on new repairs.
      await execute("UPDATE SCONFIG SET INTVALUE=0 WHERE NAME IN ('BanHangTinhThue','BanHangTinhPhiDichVu')");
      await execute("UPDATE SCONFIG SET DECIMALVALUE=20 WHERE NAME='MacDinhThueSuat'");
      await execute("UPDATE SCONFIG SET DECIMALVALUE=10 WHERE NAME='MacDinhPhiDichVu'");
      await execute('UPDATE DKHACHHANG SET GIAMGIARIENG=0 WHERE ID=?',[customer.ID]);
      const newVehicle=uuid();
      await execute("INSERT INTO DXE (ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID) VALUES (?,'NO TAX TEST','NO-TAX-TEST',?,1,'TEST')",[newVehicle,customer.ID]);
      const disabled=await call(routers.repairs,'post','/',{DXEID:newVehicle,DKHACHHANGID:customer.ID,TILETHUE:20,TILEPHIDICHVU:10,items:[
        {LOAI:0,DMATHANGID:available[0].ID,SOLUONG:1,DONGIA:600000,TILETHUE:15},
        {LOAI:1,DDICHVUID:work.ID,SOLUONG:1,DONGIA:500000},
      ]});
      const disabledOrder=(await call(routers.repairs,'get','/:id',{}, {id:disabled.id})).data;
      assert.equal(Number(disabledOrder.TONGCONG),1100000);
      assert.equal(Number(disabledOrder.TIENTHUE),0);
      assert.equal(Number(disabledOrder.PHIDICHVU),0);
      assert.ok(disabledOrder.details.every(line=>Number(line.TILETHUE)===0 && Number(line.TIENTHUE)===0));
      await execute('UPDATE TTRANGTHAIXE SET TRANGTHAI=2 WHERE ID=?',[disabled.workflowId]);
      const noTaxProposal=await supplements.create(query,execute,uuid,disabled.id,{LYDO:'Bổ sung không thuế',items:[{LOAI:1,DDICHVUID:work.ID,SOLUONG:1,DONGIA:100000}]},'TEST');
      const [noTaxLine]=await query('SELECT ID FROM TPHATSINHSUACHUACT WHERE TPHATSINHSUACHUAID=?',[noTaxProposal.id]);
      await supplements.decide(query,execute,uuid,disabled.id,noTaxProposal.id,{action:'decide',NGUOIXACNHAN:'TEST',BANGCHUNG:'Rollback test',approvedItemIds:[noTaxLine.ID]},'TEST');
      const afterSupplement=(await call(routers.repairs,'get','/:id',{}, {id:disabled.id})).data;
      assert.equal(Number(afterSupplement.TONGCONG),1200000);
      assert.equal(Number(afterSupplement.TIENTHUE),0);
      await execute('UPDATE TTRANGTHAIXE SET TRANGTHAI=3 WHERE ID=?',[disabled.workflowId]);
      const noTaxInvoice=await call(routers.invoices,'post','/',{TLENHSUACHUAID:disabled.id,TIENMAT:1200000});
      assert.equal(noTaxInvoice.total,1200000);
      assert.equal(noTaxInvoice.tax,0);
      assert.equal(noTaxInvoice.serviceFee,0);
      const [saved]=await query('SELECT CHARGEVERSION,TILEGIAMGIA,TAXSUMMARY,TONGCONG FROM THOADONSUACHUA WHERE ID=?',[invoice.id]);
      assert.equal(saved.CHARGEVERSION,1);assert.equal(Number(saved.TILEGIAMGIA),5);
      const data=await printing.payload(printing.typeByKey('MauHoaDonSuaChua'),invoice.id,{},'TEST');assert.equal(Number(data.parameters.TONGCONG),2185000);
      throw rollback;
    } finally {Object.assign(db,original);}
  }),error=>error===rollback);
  assert.equal((await db.query('SELECT ID FROM TDONHANG WHERE ID=?',[saleId])).length,0);
  assert.equal((await db.query('SELECT ID FROM TLENHSUACHUA WHERE ID=?',[repairId])).length,0);
});
