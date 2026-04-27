// Leagues Page - League Standings

const LeaguesPage = {
  init: async function() {
    const hasLeagueContainers = 
      document.getElementById('league-one') || 
      document.getElementById('league-two');
    
    if (!hasLeagueContainers) return;
    
    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.error('BgsData / AppConfig.apiUrl not configured');
        return;
      }
      const res = await BgsData.getLeagueCells();
      const data = res.data || [];
      
      const { leagueOne, leagueTwo } = LeagueStandings.processData(data);
      
      const sortedOne = LeagueStandings.sort(leagueOne);
      const sortedTwo = LeagueStandings.sort(leagueTwo);
      
      LeagueStandings.render('league-one', sortedOne);
      LeagueStandings.render('league-two', sortedTwo);
    } catch (error) {
      console.error('Failed to load league standings:', error);
    }
  }
};