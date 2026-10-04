const imageError=()=>Object.assign(new Error('Logo công ty phải là ảnh PNG hoặc JPG, tối đa 2 MB.'),{status:400});
function validateLogo(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>2*1024*1024)throw imageError();
 const png=buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=buffer.length>3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
 if(!png&&!jpeg)throw imageError();return buffer;
}
function applyCompanyLogo(xml,buffer,{insertMissing=true}={}){
 if(!buffer?.length)return xml;const base64=validateLogo(buffer).toString('base64');let found=false;
 xml=xml.replace(/<PictureObject\b[^>]*>/g,tag=>{if(!/\bName="[^"]*logo[^"]*"/i.test(tag))return tag;found=true;tag=tag.replace(/\sImage="[^"]*"/g,'').replace(/\sSizeMode="[^"]*"/g,'');return tag.replace(/\s*\/?>$/,match=>` Image="${base64}" SizeMode="Zoom"${match}`);});
 if(found||!insertMissing)return xml;
 // Native GARA A4 templates reserve the left of the company header for a logo.
 xml=xml.replace(/<TextObject Name="T([12])"[^>]*>/g,tag=>tag.replace(/Left="[^"]*"/,'Left="120"').replace(/Width="[^"]*"/,'Width="598"'));
 return xml.replace(/(<ReportTitleBand\b[^>]*>)/,`$1<PictureObject Name="CompanyLogo" Width="110" Height="55" Image="${base64}" SizeMode="Zoom"/>`);
}
module.exports={validateLogo,applyCompanyLogo};
