// Under Development Page — league grid retired.

const UnderDevelopmentPage = {
  init: async function() {
    const msg =
      '<p class="loading" style="text-align:center;padding:1em;">League standings are not available on this data source.</p>';
    ['league-a', 'league-b'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
  }
};
