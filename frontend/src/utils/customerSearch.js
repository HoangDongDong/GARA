const normalize = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();

export function filterCustomers(customers, search = '', groupId = '') {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const phoneQuery = String(search).replace(/[\s().+-]/g, '');
  return customers.filter((customer) => {
    if (groupId && String(customer.DNHOMKHACHHANGID) !== String(groupId)) return false;
    const text = normalize([customer.NAME, customer.MAKHACH, customer.DIENTHOAI, customer.EMAIL, customer.DIACHI].filter(Boolean).join(' '));
    const phone = String(customer.DIENTHOAI || '').replace(/\D/g, '');
    return terms.every((term) => text.includes(term))
      || (/^\d+$/.test(phoneQuery) && phone.includes(phoneQuery));
  });
}
