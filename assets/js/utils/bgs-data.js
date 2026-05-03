// Read helpers for bgs-api (public GET actions). Backend uses Supabase `thegolfapp` schema, society botanic.

const BgsData = {
  /**
   * @param {string} action
   * @param {Record<string, string>} [extraQuery]
   * @returns {Promise<Object>}
   */
  fetchJson: async function(action, extraQuery) {
    const apiUrl = typeof AppConfig !== "undefined" ? AppConfig.apiUrl : "";
    if (!apiUrl) {
      throw new Error("AppConfig.apiUrl is not set. Update assets/js/config/app-config.js");
    }
    const params = new URLSearchParams({ action });
    if (extraQuery) {
      Object.keys(extraQuery).forEach((k) => {
        if (extraQuery[k] != null && extraQuery[k] !== "") params.set(k, String(extraQuery[k]));
      });
    }
    const res = await fetch(`${apiUrl}?${params.toString()}`, { redirect: "follow" });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON from bgs-api");
    }
    if (!json.success) {
      throw new Error(json.error || "Request failed");
    }
    return json;
  },

  /** @returns {Promise<{ success: boolean, rows: unknown[][] }>} */
  getEditorNotesRows: function() {
    return this.fetchJson("getEditorNotesRows");
  },

  /**
   * Course definitions for scorecard / leaderboard: { [courseName]: { pars, indexes } }
   * @returns {Promise<{ success: boolean, courses: Object }>}
   */
  getCourseDefs: function() {
    return this.fetchJson("getCourseDefs");
  },

  /**
   * Players for society botanic (theGolfApp `players` table).
   * @returns {Promise<{ success: boolean, players: Array<{ playerId: string, playerName: string }> }>}
   */
  getSocietyPlayers: function() {
    return this.fetchJson("getSocietyPlayers");
  },

  /**
   * Next upcoming outing (date >= today) with course URLs from `courses`.
   * @returns {Promise<{ success: boolean, outing: Object | null }>}
   */
  getNextOuting: function() {
    return this.fetchJson("getNextOuting");
  },

  /**
   * Society row for botanic (`status` drives leaderboard overall: O10 / OAP when set).
   * @returns {Promise<{ success: boolean, society: Object }>}
   */
  getSociety: function() {
    return this.fetchJson("getSociety");
  },

  /**
   * All scheduled outings (date, time, course, comps).
   * @returns {Promise<{ success: boolean, outings: Array<{ outingId, date, time, courseName, comps }> }>}
   */
  getOutings: function() {
    return this.fetchJson("getOutings");
  },

  /**
   * All course rows (URLs, images, par_indx) for outings UI.
   * @returns {Promise<{ success: boolean, courses: Object[] }>}
   */
  getCourses: function() {
    return this.fetchJson("getCourses");
  },
};
