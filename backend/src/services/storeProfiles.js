async function initializeStoreProfiles(db) {
  const columns=await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?',['DCUAHANG','EMAIL']);
  if(!columns.length) await db.execute('ALTER TABLE DCUAHANG ADD EMAIL VARCHAR(255) CHARACTER SET UTF8');
}
module.exports={initializeStoreProfiles};
