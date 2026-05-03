// Leagues Page — league grid retired.

const LeaguesPage = {
  init: async function() {
    const msg =
      '<p class="loading" style="text-align:center;padding:1em;">League standings are not available on this data source.</p>';
    ['league-one', 'league-two'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
  }
};
