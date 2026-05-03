// Fixtures Page — retired (no API fixtures on this data source).

const FixturesPage = {
  init: async function() {
    const container = document.getElementById('fixtures-list');
    if (!container) return;
    container.innerHTML =
      '<p><em>Fixtures are not published here. Use the main society app for draws and match schedules.</em></p>';
  }
};
