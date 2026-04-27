// Read helpers for bgs-api (public GET actions).

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

  getFixtures: function() {
    return this.fetchJson("getFixtures");
  },

  getHandicaps: function() {
    return this.fetchJson("getHandicaps");
  },

  /** @returns {Promise<{ success: boolean, data: unknown[][] }>} */
  getLeagueCells: function() {
    return this.fetchJson("getLeagueCells");
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
   * Key/value rows as { Key, Value } (matches published CSV shape).
   * @returns {Promise<{ success: boolean, rows: Array<{Key: string, Value: string}> }>}
   */
  getConfigKvRows: function() {
    return this.fetchJson("getConfigKvRows");
  },
};
