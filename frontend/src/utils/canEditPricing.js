export default function canEditPricing(code) {
  try {
    const user = JSON.parse(localStorage.getItem('garage_user') || '{}');
    return Number(user.ISADMIN) === 1 || (Number(user.PERMISSIONS?.[code] || 0) & 4) === 4;
  } catch { return false; }
}
