/**
 * dateUtils.js
 * User-local timezone date formatting, validation, and calendar arithmetic
 * for Discuss Memories.
 *
 * Guarantees:
 * - memoryDate is canonical YYYY-MM-DD derived in user-local context
 * - createdAt is canonical UTC epoch milliseconds
 * - Never infers memoryDate from createdAt or vice-versa
 */

/**
 * Returns today's date in local YYYY-MM-DD format.
 * @param {Date} [d]
 * @returns {string} YYYY-MM-DD
 */
export function getTodayDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates a YYYY-MM-DD string.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const lastDay = new Date(y, m, 0).getDate();
  return d >= 1 && d <= lastDay;
}

/**
 * Extracts YYYY-MM from YYYY-MM-DD
 * @param {string} dateStr
 * @returns {string}
 */
export function getYearMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return getTodayDateStr().slice(0, 7);
  return dateStr.slice(0, 7);
}

/**
 * Formats a canonical date string for display (e.g. "October 4, 2026")
 * @param {string} dateStr YYYY-MM-DD
 * @returns {string}
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a canonical date string into month & year (e.g. "October 2026")
 * @param {string} yearMonth YYYY-MM
 * @returns {string}
 */
export function formatMonthYear(yearMonth) {
  if (!yearMonth) return '';
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns days of a month including prefix padding from previous month
 * for clean 7-column calendar grid presentation.
 * @param {number} year
 * @param {number} monthIndex 0-indexed (0 = Jan, 11 = Dec)
 * @returns {Array<{ dateStr: string, dayNumber: number, isCurrentMonth: boolean }>}
 */
export function getCalendarGrid(year, monthIndex) {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const grid = [];

  // Prefix days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = monthIndex === 0 ? 12 : monthIndex;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    grid.push({ dateStr, dayNumber: day, isCurrentMonth: false });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({ dateStr, dayNumber: d, isCurrentMonth: true });
  }

  // Suffix days to complete the last week (multiples of 7)
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = monthIndex === 11 ? 1 : monthIndex + 2;
    const nextYear = monthIndex === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({ dateStr, dayNumber: d, isCurrentMonth: false });
  }

  return grid;
}

/**
 * Checks if dateStr is in the future.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isFutureDate(dateStr) {
  if (!isValidDateStr(dateStr)) return false;
  return dateStr > getTodayDateStr();
}
