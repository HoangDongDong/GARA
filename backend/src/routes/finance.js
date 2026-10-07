const router = require('express').Router();
router.get('/vouchers/options',async(req,res)=>{
  try{res.json({data:await require('../services/cashVoucher').options()});}catch(e){res.status(500).json({error:e.message});}
});
router.post('/vouchers',async(req,res)=>{
  try{res.status(201).json({data:await require('../services/cashVoucher').create(req.body,req.accessUser.ID)});}catch(e){res.status(e.statusCode||500).json({error:e.message});}
});
router.get('/cashbook',async(req,res)=>{
  try {
    const [data,accounts]=await Promise.all([
      require('../services/cashbook').load(),
      require('../db').query('SELECT ID,NAME,SOTAIKHOAN,TENNGANHANG FROM DTAIKHOANNGANHANG WHERE STATUS=1 ORDER BY NAME'),
    ]);
    res.set('Cache-Control','no-store').json({data,accounts});
  }
  catch(error){res.status(500).json({error:error.message});}
});
router.get('/payment-options', async (req,res)=>{
  try {
    const [categories,accounts]=await Promise.all([
      require('../db').query('SELECT ID,NAME,LOAI FROM DLYDOTHUCHI WHERE STATUS=1 ORDER BY NAME'),
      require('../services/bankBalances').load(),
    ]);
    res.set('Cache-Control','no-store').json({data:{categories,accounts}});
  } catch(error){res.status(500).json({error:error.message});}
});
router.post('/debts/payments', async (req, res) => {
  try {
    const data = await require('../services/debtPayment').create(req.body, req.accessUser.ID);
    res.status(201).json({data});
  } catch (error) { res.status(error.statusCode || 500).json({error:error.message}); }
});
router.get('/debts/ledger', async (req, res) => {
  try { res.json({ data: await require('../services/debts').ledger() }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/debts', async (req, res) => {
  try { res.json({ data: await require('../services/debts').load() }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
module.exports = router;
