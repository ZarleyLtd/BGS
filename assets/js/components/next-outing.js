// Next outing: upcoming date from theGolfApp outings (society botanic), with course image/URLs from `courses`.

const NextOuting = {

  /**
   * Initialize and load next outing
   */
  init: async function() {
    const container = document.getElementById('next-outing-content');
    if (!container) {
      console.warn('Next outing container not found');
      return;
    }

    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.error('BgsData / AppConfig.apiUrl not configured');
        this.renderFallback(container);
        return;
      }

      const res = await BgsData.getNextOuting();
      const outing = res.outing;

      if (!outing || !outing.courseName) {
        console.warn('No upcoming outing from API');
        this.renderFallback(container);
        return;
      }

      this.render(container, outing);
    } catch (error) {
      console.error('Failed to load next outing:', error);
      this.renderFallback(container);
    }
  },

  /**
   * @param {HTMLElement} container
   * @param {Object} outing — from bgs-api getNextOuting
   */
  render: function(container, outing) {
    let imageUrl = (outing.courseImage || '').toString().trim();
    const clubUrl = (outing.courseUrl || '').toString().trim();
    let mapsUrl = (outing.courseMaploc || '').toString().trim();
    const alt = (outing.clubName || outing.courseName || 'Course').toString();

    const staticRow = !imageUrl ? this.getStaticOutingForCourse(outing.courseName) : null;
    if (staticRow) {
      if (!imageUrl && staticRow.imagePath) imageUrl = staticRow.imagePath.toString().trim();
      if (!mapsUrl && staticRow.mapsUrl) mapsUrl = staticRow.mapsUrl.toString().trim();
    }

    const imgHtml = imageUrl
      ? `<img
              src="${this.escapeHtml(imageUrl)}"
              alt="${this.escapeHtml(alt)}"
              style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
            />`
      : `<div style="padding: 2em; text-align: center; color: #666;">${this.escapeHtml(alt)}</div>`;

    const wrapStart = clubUrl
      ? `<a href="${this.escapeHtml(clubUrl)}" target="_blank" rel="noreferrer noopener" style="display: block;">`
      : '<div style="display: block;">';
    const wrapEnd = clubUrl ? '</a>' : '</div>';

    const mapsBtn = mapsUrl
      ? `<a href="${this.escapeHtml(mapsUrl)}" target="_blank" rel="noreferrer noopener" style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Map / location">
            <span style="font-size: 20px;">📍</span>
          </a>`
      : '';

    const html = `
      <div style="text-align: center; margin: 2em 0;">
        <div style="position: relative; display: inline-block; max-width: 100%;">
          ${wrapStart}
            ${imgHtml}
          ${wrapEnd}
          ${mapsBtn}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Render fallback using static OutingsConfig when API has no future outing or missing assets.
   * @param {HTMLElement} container
   */
  renderFallback: function(container) {
    const defaultOuting = OutingsConfig.OUTINGS_2026[0];
    if (!defaultOuting) {
      container.innerHTML = '<p><em>No outing information available.</em></p>';
      return;
    }
    const html = `
      <div style="text-align: center; margin: 2em 0;">
        <div style="position: relative; display: inline-block; max-width: 100%;">
          <a href="${this.escapeHtml(defaultOuting.clubUrl)}" target="_blank" rel="noreferrer noopener" style="display: block;">
            <img
              src="${this.escapeHtml(defaultOuting.imagePath)}"
              alt="${this.escapeHtml(defaultOuting.clubName)}"
              style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
            />
          </a>
          <a href="${this.escapeHtml(defaultOuting.mapsUrl)}" target="_blank" rel="noreferrer noopener" style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="View on Google Maps">
            <span style="font-size: 20px;">📍</span>
          </a>
        </div>
      </div>
    `;
    container.innerHTML = html;
    console.warn('Using static OutingsConfig fallback for next outing');
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Match `OUTINGS_2026` by course name when API `course_image` is empty.
   * @param {string} courseName
   * @returns {typeof OutingsConfig.OUTINGS_2026[0] | null}
   */
  getStaticOutingForCourse: function(courseName) {
    if (!courseName || typeof OutingsConfig === 'undefined' || !OutingsConfig.OUTINGS_2026) return null;
    const target = courseName.toString().trim().toLowerCase();
    const list = OutingsConfig.OUTINGS_2026;
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      if ((row.courseName || '').toString().trim().toLowerCase() === target) return row;
    }
    return null;
  }
};
