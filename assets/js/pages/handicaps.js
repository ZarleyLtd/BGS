// Handicaps Page — retired (no handicap table on this data source).

const HandicapsPage = {
  init: async function() {
    const table = document.getElementById('handicaps');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
    const wrap = table.parentElement;
    const note = document.createElement('p');
    note.innerHTML = '<em>Handicap listings are not published on this site. Use the main society app for handicaps.</em>';
    if (wrap && !wrap.querySelector('.handicaps-retired-note')) {
      note.className = 'handicaps-retired-note';
      wrap.insertBefore(note, table);
    }
  }
};
