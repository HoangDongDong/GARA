const router=require('express').Router();
const {definitions,previewNumber}=require('../services/documentNumbers');
const permissions={TiepNhan:['REPAIR'],LenhSuaChua:['REPAIR'],BaoGia:['REPAIR'],HoaDonSuaChua:['REPAIR','FINANCE','SALES'],BanPhuTung:['SALES'],NhapKho:['INVENTORY'],BaoHanh:['WARRANTY'],Thu:['FINANCE'],Chi:['FINANCE'],BangLuong:['EMPLOYEES']};
router.get('/:type/next',async(req,res)=>{
  try{
    const key=req.params.type,user=req.accessUser;
    if(!definitions.some(type=>type.key===key))return res.status(400).json({error:'Loại số phiếu không hợp lệ.'});
    if(Number(user?.ISADMIN)!==1&&!permissions[key].some(code=>(Number(user?.permissions?.[code]||0)&1)===1))return res.status(403).json({error:'Bạn chưa có quyền xem nghiệp vụ này.'});
    res.set('Cache-Control','no-store').json({code:await previewNumber(key),provisional:true});
  }catch(e){res.status(e.status||500).json({error:e.message});}
});
module.exports=router;
