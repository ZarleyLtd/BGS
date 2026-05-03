// Results Page — fixture-driven results retired.

const ResultsPage = {
  init: async function() {
    const container = document.getElementById('results-list');
    if (!container) return;
    container.innerHTML =
      '<p><em>Match results are not available on this site. Use the main society app for fixtures and results.</em></p>';
  }
};
