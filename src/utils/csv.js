/**
 * CSV parser utility.
 * Parses a CSV string into an array of objects using the header row as keys.
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  }).filter(row => row.uuid); // Only include rows with a UUID
}

/**
 * Converts parsed CSV rows into a participants map keyed by UUID.
 */
export function buildParticipantsMap(csvRows) {
  const participants = {};
  csvRows.forEach(row => {
    participants[row.uuid] = {
      name: row.name || 'Unknown',
      uuid: row.uuid,
      meals: {
        breakfast: false,
        lunch: false,
        dinner: false,
        snacks: false
      }
    };
  });
  return participants;
}

/**
 * Exports attendance data as a downloadable CSV file.
 * @param {Object} participants - Participants map (current or archived)
 * @param {string} dateLabel - Date label for the filename (e.g. "2026-04-08")
 */
export function exportAttendanceCSV(participants, dateLabel) {
  const now = new Date();
  const dateStr = dateLabel || now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '').slice(0, 4);

  const headers = ['Name', 'UUID', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Total Meals', 'Date'];
  const rows = Object.values(participants)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => {
      const totalMeals = ['breakfast', 'lunch', 'dinner', 'snacks']
        .filter(m => p.meals[m]).length;
      return [
        `"${p.name}"`,
        p.uuid,
        p.meals.breakfast ? 'Yes' : 'No',
        p.meals.lunch ? 'Yes' : 'No',
        p.meals.dinner ? 'Yes' : 'No',
        p.meals.snacks ? 'Yes' : 'No',
        totalMeals,
        dateStr
      ].join(',');
    });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, `attendance_${dateStr}_${timeStr}.csv`);
}

/**
 * Exports all historical data as a single combined CSV.
 * @param {Object} history - History object keyed by date
 * @param {Object} currentParticipants - Today's live participants
 * @param {string} todayDate - Today's date string
 */
export function exportFullHistoryCSV(history, currentParticipants, todayDate) {
  const headers = ['Date', 'Name', 'UUID', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Total Meals'];
  const rows = [];

  // Add archived days
  const sortedDates = Object.keys(history).sort();
  for (const date of sortedDates) {
    const dayData = history[date];
    if (!dayData.participants) continue;
    Object.values(dayData.participants)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(p => {
        const total = ['breakfast', 'lunch', 'dinner', 'snacks'].filter(m => p.meals[m]).length;
        rows.push([
          date, `"${p.name}"`, p.uuid,
          p.meals.breakfast ? 'Yes' : 'No',
          p.meals.lunch ? 'Yes' : 'No',
          p.meals.dinner ? 'Yes' : 'No',
          p.meals.snacks ? 'Yes' : 'No',
          total
        ].join(','));
      });
  }

  // Add today's data
  Object.values(currentParticipants)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(p => {
      const total = ['breakfast', 'lunch', 'dinner', 'snacks'].filter(m => p.meals[m]).length;
      rows.push([
        todayDate, `"${p.name}"`, p.uuid,
        p.meals.breakfast ? 'Yes' : 'No',
        p.meals.lunch ? 'Yes' : 'No',
        p.meals.dinner ? 'Yes' : 'No',
        p.meals.snacks ? 'Yes' : 'No',
        total
      ].join(','));
    });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, `full_attendance_history.csv`);
}

/** Helper to trigger CSV download */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
