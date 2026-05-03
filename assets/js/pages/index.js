// Home Page — knockout display retired (fixtures no longer loaded from API).

const IndexPage = {
  init: async function() {
    const hasKnockoutContainers =
      document.getElementById('champ-semis') ||
      document.getElementById('champ-final') ||
      document.getElementById('plate-qf') ||
      document.getElementById('plate-sf') ||
      document.getElementById('plate-final');

    if (!hasKnockoutContainers) return;

    const msg =
      '<p class="loading" style="text-align:center;padding:1em;">Knockout draws are not published on this data source.</p>';
    ['champ-semis', 'champ-final', 'plate-qf', 'plate-sf', 'plate-final'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
  }
};
