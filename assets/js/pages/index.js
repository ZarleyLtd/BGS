// Home Page - Knockout Tournament Display

const IndexPage = {
  init: async function() {
    const hasKnockoutContainers = 
      document.getElementById('champ-semis') ||
      document.getElementById('champ-final') ||
      document.getElementById('plate-qf') ||
      document.getElementById('plate-sf') ||
      document.getElementById('plate-final');
    
    if (!hasKnockoutContainers) return;
    
    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.error('BgsData / AppConfig.apiUrl not available for fixtures');
        return;
      }
      const res = await BgsData.getFixtures();
      const fixtures = res.fixtures || [];
      
      const gameWeekMap = {
        'champ-semis': 'CS',
        'champ-final': 'CF',
        'plate-qf': 'PQ',
        'plate-sf': 'PS',
        'plate-final': 'PF'
      };
      
      Object.entries(gameWeekMap).forEach(([containerId, code]) => {
        const matches = KnockoutRenderer.filterByGameWeek(fixtures, code);
        KnockoutRenderer.render(containerId, matches);
      });
    } catch (error) {
      console.error('Failed to load knockout data:', error);
    }
  }
};