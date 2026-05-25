import { getUser } from './db';
import { notifyAdminReport } from './telegramService';

/**
 * Checks if the current user has already reported this target on this browser/session.
 * Zero database load!
 */
export const hasUserReportedTarget = (targetId) => {
  if (!targetId) return false;
  try {
    return localStorage.getItem(`reported_${targetId}`) === 'true';
  } catch (err) {
    console.warn('[ReportService] Error reading from localStorage:', err.message);
    return false;
  }
};

/**
 * Dispatches a professional community report alert directly to the Admin Telegram Bot
 * and saves the reported state locally.
 * Zero database load!
 */
export const submitReport = async ({
  reporterId,
  reporterUsername,
  reporterEmail,
  targetType,
  targetId,
  targetOwnerId,
  comment
}) => {
  // 1. Fetch fresh target owner details (email & username) from RTDB using getUser()
  let targetOwnerUsername = 'unknown';
  let targetOwnerEmail = 'unknown';
  
  if (targetOwnerId) {
    try {
      const ownerData = await getUser(targetOwnerId);
      if (ownerData) {
        targetOwnerUsername = ownerData.username || 'unknown';
        targetOwnerEmail = ownerData.email || 'unknown';
      }
    } catch (err) {
      console.warn('[ReportService] Could not fetch target owner details:', err.message);
    }
  }

  // 2. Dispatch rich diagnostic Telegram alert directly via Admin Bot
  await notifyAdminReport({
    reporterUsername,
    reporterId,
    reporterEmail: reporterEmail || 'N/A',
    targetType,
    targetId,
    targetOwnerUsername,
    targetOwnerId,
    targetOwnerEmail,
    comment
  });

  // 3. Persist the report status locally to prevent duplicates
  try {
    localStorage.setItem(`reported_${targetId}`, 'true');
  } catch (err) {
    console.warn('[ReportService] Error writing to localStorage:', err.message);
  }

  return true;
};
