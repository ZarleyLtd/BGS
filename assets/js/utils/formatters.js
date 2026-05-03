// Data Formatting Utilities
// Common formatting functions used across the application

const Formatters = {
  /**
   * Safely convert to integer with fallback
   * @param {any} value - Value to convert
   * @param {number} fallback - Fallback value if conversion fails (default: -Infinity)
   * @returns {number} Integer value or fallback
   */
  toInt: function(value, fallback = -Infinity) {
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  },
  
  /**
   * Safely get string value
   * @param {any} value - Value to convert to string
   * @returns {string} Trimmed string or empty string
   */
  safeString: function(value) {
    return (value == null || value === undefined) ? '' : String(value).trim();
  },
  
  /**
   * Pad string left
   * @param {string} str - String to pad
   * @param {number} width - Target width
   * @returns {string} Left-padded string
   */
  padLeft: function(str, width) {
    str = this.safeString(str);
    return str.length >= width ? str : ' '.repeat(width - str.length) + str;
  },
  
  /**
   * Pad string right
   * @param {string} str - String to pad
   * @param {number} width - Target width
   * @returns {string} Right-padded string
   */
  padRight: function(str, width) {
    str = this.safeString(str);
    return str.length >= width ? str : str + ' '.repeat(width - str.length);
  },
  
  /**
   * Truncate name to max length
   * @param {string} name - Name to truncate
   * @param {number} maxLength - Maximum length (default: 16)
   * @returns {string} Truncated name with '..' suffix if needed
   */
  truncateName: function(name, maxLength = 16) {
    name = this.safeString(name);
    return name.length > maxLength ? name.slice(0, maxLength - 2) + '..' : name;
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml: function(text) {
    if (text == null || text === '') return '';
    const s = String(text);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Format time as "11:30 am"
   * @param {string} timeStr
   * @returns {string}
   */
  formatTimeSimple: function(timeStr) {
    if (!timeStr) return '';
    const m = String(timeStr).trim().match(/(\d{1,2}):(\d{2})/);
    if (!m) return timeStr;
    const h = parseInt(m[1], 10);
    return (h % 12 || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'pm' : 'am');
  },

  /**
   * Format outing date + time as "Tue Feb 17 2026 @ 11:30 am"
   * @param {string} dateStr
   * @param {string} [timeStr]
   * @returns {string}
   */
  formatOutingDateTime: function(dateStr, timeStr) {
    if (!dateStr) return timeStr ? (' @ ' + this.formatTimeSimple(timeStr)).trim() : '';
    let raw = String(dateStr).trim();
    const gmtIdx = raw.search(/\s(00:00:00|GMT|\d{2}:\d{2}:\d{2})/);
    if (gmtIdx !== -1) raw = raw.substring(0, gmtIdx).trim();
    let dateOnly = raw.split('T')[0];
    if (dateOnly.indexOf('-') === -1) dateOnly = raw;
    let d = new Date(dateOnly + (timeStr ? 'T' + timeStr : ''));
    if (isNaN(d.getTime())) d = new Date(dateOnly);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100) {
      return (dateOnly.indexOf('-') !== -1 ? dateOnly : raw) + (timeStr ? ' @ ' + this.formatTimeSimple(timeStr) : '');
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let s = days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
    if (timeStr) s += ' @ ' + this.formatTimeSimple(timeStr);
    return s;
  }
};