// Next outing: upcoming date from theGolfApp outings (society botanic), with course image/URLs from `courses`.

const NextOuting = {

  /** Same default as outings-2026.html when course image is missing or fails to load */
  defaultImage: 'assets/images/golfBanner.jpg',

  titleOverlayStyle:
    'position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75em 1em; ' +
    'background: linear-gradient(to top, rgba(0,0,0,0.75), transparent); color: #fff; ' +
    'font-size: 1.4em; font-weight: 600; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.8);',

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
    const staticRow = this.getStaticOutingForCourse(outing.courseName);
    let mapsUrl = (outing.courseMaploc || '').toString().trim();
    if (staticRow && !mapsUrl && staticRow.mapsUrl) {
      mapsUrl = staticRow.mapsUrl.toString().trim();
    }

    container.innerHTML = this.buildOutingCardHtml({
      imageUrl: this.resolveImageSrc(outing.courseImage, outing.courseName),
      courseName: outing.courseName || outing.clubName || 'Outing',
      clubUrl: (outing.courseUrl || '').toString().trim(),
      mapsUrl: mapsUrl,
      date: outing.date,
      time: outing.time,
      alt: outing.clubName || outing.courseName || 'Course',
    });
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
    container.innerHTML = this.buildOutingCardHtml({
      imageUrl: (defaultOuting.imagePath || this.defaultImage).toString().trim(),
      courseName: defaultOuting.courseName || defaultOuting.clubName || 'Outing',
      clubUrl: (defaultOuting.clubUrl || '').toString().trim(),
      mapsUrl: (defaultOuting.mapsUrl || '').toString().trim(),
      date: '',
      time: '',
      alt: defaultOuting.clubName || defaultOuting.courseName || 'Course',
    });
    console.warn('Using static OutingsConfig fallback for next outing');
  },

  /**
   * Outing card markup — matches outings-2026.html (title overlay on image, date/time below).
   * @param {Object} opts
   * @returns {string}
   */
  buildOutingCardHtml: function(opts) {
    const imageUrl = (opts.imageUrl || this.defaultImage).toString().trim();
    const courseName = this.escapeHtml(opts.courseName || opts.alt || 'Outing');
    const alt = this.escapeHtml(opts.alt || opts.courseName || 'Course');
    const clubUrl = (opts.clubUrl || '').toString().trim();
    const mapsUrl = (opts.mapsUrl || '').toString().trim();
    const fallbackSrc = this.escapeHtml(this.defaultImage);
    const dateTime = this.formatDateTime(opts.date, opts.time);

    const wrapStart = clubUrl
      ? `<a href="${this.escapeHtml(clubUrl)}" target="_blank" rel="noreferrer noopener" style="display: block;">`
      : '<div style="display: block;">';
    const wrapEnd = clubUrl ? '</a>' : '</div>';

    const mapsBtn = mapsUrl
      ? `<a href="${this.escapeHtml(mapsUrl)}" target="_blank" rel="noreferrer noopener" style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="View on map">
            <span style="font-size: 20px;">📍</span>
          </a>`
      : '';

    const dateTimeHtml = dateTime
      ? `<div style="color: #666; margin-top: 0.5em; margin-bottom: 0.5em;">${this.escapeHtml(dateTime)}</div>`
      : '';

    return `
      <div style="text-align: center; margin: 2em 0;">
        <div style="position: relative; display: inline-block; max-width: 100%;">
          ${wrapStart}
            <img
              src="${this.escapeHtml(imageUrl)}"
              alt="${alt}"
              style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
              onerror="this.onerror=null; this.src='${fallbackSrc}';"
            />
            <span style="${this.titleOverlayStyle}">${courseName}</span>
          ${wrapEnd}
          ${mapsBtn}
        </div>
        ${dateTimeHtml}
      </div>
    `;
  },

  formatDateTime: function(dateStr, timeStr) {
    if (typeof Formatters !== 'undefined' && Formatters.formatOutingDateTime) {
      return Formatters.formatOutingDateTime(dateStr, timeStr);
    }
    const d = dateStr ? String(dateStr).trim() : '';
    const t = timeStr ? String(timeStr).trim() : '';
    if (d && t) return d + ' @ ' + t;
    return d || t || '';
  },

  /**
   * Resolve course image URL — same rules as outings-2026.html.
   * @param {string} courseImage — filename from API or full path
   * @param {string} courseName — for static OutingsConfig fallback
   * @returns {string}
   */
  resolveImageSrc: function(courseImage, courseName) {
    const imgFile = (courseImage || '').toString().trim();
    if (imgFile) {
      if (/^(https?:|\/|assets\/)/i.test(imgFile)) return imgFile;
      return 'assets/images/clubs/' + imgFile;
    }
    const staticRow = this.getStaticOutingForCourse(courseName);
    if (staticRow && staticRow.imagePath) {
      return staticRow.imagePath.toString().trim();
    }
    return this.defaultImage;
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
