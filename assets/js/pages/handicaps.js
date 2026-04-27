// Handicaps Page - Handicaps Table

const HandicapsPage = {
  init: async function() {
    const table = document.getElementById('handicaps');
    if (!table) return;
    
    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.error('BgsData / AppConfig.apiUrl not configured');
        return;
      }
      const res = await BgsData.getHandicaps();
      const data = res.handicaps || [];
      
      // Filter valid rows
      const rows = data.filter(r => 
        r['Player Name'] && r['Handicap'] && r['Handicap Date']
      );
      
      // Get latest handicap per player
      const latestByPlayer = {};
      rows.forEach(r => {
        const name = r['Player Name'].trim();
        const date = new Date(r['Handicap Date']);
        if (!latestByPlayer[name] || date > new Date(latestByPlayer[name]['Handicap Date'])) {
          latestByPlayer[name] = r;
        }
      });
      
      // Sort alphabetically
      const sortedPlayers = Object.values(latestByPlayer).sort((a, b) =>
        a['Player Name'].localeCompare(b['Player Name'])
      );
      
      // Render table
      let tbody = table.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
      tbody.innerHTML = '';
      
      sortedPlayers.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r['Player Name']}</td>
          <td>${r['Handicap']}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Failed to load handicaps:', error);
    }
  }
};