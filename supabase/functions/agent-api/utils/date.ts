export function getMonthRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getWeekRanges(
  month: number,
  year: number
): Array<{ week: number; start: string; end: string }> {
  const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
  const weekDefs = [
    { week: 1, startDay: 1, endDay: 7 },
    { week: 2, startDay: 8, endDay: 14 },
    { week: 3, startDay: 15, endDay: 21 },
    { week: 4, startDay: 22, endDay: 28 },
    { week: 5, startDay: 29, endDay: 31 },
  ];

  const weeks = [];
  for (const w of weekDefs) {
    if (w.startDay > lastDay) break;
    const endDay = Math.min(w.endDay, lastDay);
    weeks.push({
      week: w.week,
      start: `${year}-${String(month).padStart(2, '0')}-${String(w.startDay).padStart(2, '0')}`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    });
  }
  return weeks;
}

export function getMonthLabel(month: number, year: number): string {
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[month - 1]}/${String(year).slice(2)}`;
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
