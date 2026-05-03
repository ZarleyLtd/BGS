// League leader placeholders — retired (no league grid).

const LeagueLeadersPlaceholder = {
  init: async function() {
    const hasPlaceholders =
      document.body.innerHTML.includes('[aleader]') || document.body.innerHTML.includes('[bleader]');
    if (!hasPlaceholders) return;
    document.querySelectorAll('p, h3, div, span').forEach(function(el) {
      el.innerHTML = el.innerHTML.replace(/\[aleader\]/g, '—').replace(/\[bleader\]/g, '—');
    });
  }
};
