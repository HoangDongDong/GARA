const test=require('node:test');const assert=require('node:assert/strict');const {validateLogo,applyCompanyLogo}=require('../src/services/companyLogo');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
test('company logo accepts PNG/JPEG and rejects incompatible or oversized images',()=>{assert.equal(validateLogo(png),png);assert.throws(()=>validateLogo(Buffer.from('<svg/>')));assert.throws(()=>validateLogo(Buffer.alloc(2*1024*1024+1)));});
test('configured logo replaces supplied logos while empty setting keeps original FRX',()=>{const xml='<PictureObject Name="ptLogo" Image="original" SizeMode="Normal"/>';assert.equal(applyCompanyLogo(xml,null),xml);const result=applyCompanyLogo(xml,png);assert.ok(result.includes(png.toString('base64')));assert.ok(!result.includes('original'));assert.ok(result.includes('SizeMode="Zoom"'));assert.ok(!result.includes('SizeMode="Normal"'));});
test('native report adds a logo and leaves space for company text',()=>{const xml='<ReportTitleBand Name="Title"><TextObject Name="T1" Left="0" Width="718"/></ReportTitleBand>';const result=applyCompanyLogo(xml,png);assert.ok(result.includes('Name="CompanyLogo"'));assert.ok(result.includes('Left="120"'));assert.ok(result.includes('Width="598"'));});
test('database FRX retains layout and unrelated pictures while using configured logo slots',()=>{
 const xml='<ReportTitleBand><PictureObject Name="ptLogo" Left="9.45" Top="-9.45" Width="198.45" Height="75.6" Image="old"/><PictureObject Name="VehiclePhoto" Image="vehicle"/></ReportTitleBand>';
 const result=applyCompanyLogo(xml,png,{insertMissing:false});
 assert.ok(result.includes('Left="9.45" Top="-9.45" Width="198.45" Height="75.6"'));
 assert.ok(result.includes(png.toString('base64')));
 assert.ok(result.includes('Name="VehiclePhoto" Image="vehicle"'));
 const noSlot='<ReportTitleBand><TextObject Name="T1" Left="0" Width="718"/></ReportTitleBand>';
 assert.equal(applyCompanyLogo(noSlot,png,{insertMissing:false}),noSlot);
});
