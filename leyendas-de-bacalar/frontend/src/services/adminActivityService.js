import { getRecentAdminActivity } from './adminService.js';

export async function getAdminAuditLogs() {
  return getRecentAdminActivity(50);
}
