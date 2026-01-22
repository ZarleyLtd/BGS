// Next Outing Component
// Loads the current "next outing" index from Google Sheet and renders the corresponding outing
// Uses index-based approach: Google Sheet contains a single number (1-10) that references the outing array

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
      const url = SheetsConfig.getSheetUrl('nextOuting');
      if (!url) {
        console.error('Invalid next outing sheet URL');
        this.renderFallback(container);
        return;
      }
      
      console.log('Loading next outing index from:', url);
      
      // Load CSV with headers - Column A = Key, Column B = CSV data
      const data = await CsvLoader.load(url, { header: true, skipEmptyLines: true, delimiter: ',' });
      
      console.log('Next outing data loaded:', data);
      console.log('Sample row structure:', data[0]);
      
      if (!data || data.length === 0) {
        console.warn('No data received from sheet');
        this.renderFallback(container);
        return;
      }
      
      // Find the row where Key column (Column A) is "NextOuting"
      const nextOutingRow = data.find(row => {
        const key = row['Key'] || row['key'] || row[Object.keys(row)[0]];
        return key && key.toString().trim().toLowerCase() === 'nextouting';
      });
      
      if (!nextOutingRow) {
        console.warn('No "NextOuting" row found in sheet');
        this.renderFallback(container);
        return;
      }
      
      // Get the value from Column B (Value column) - it's just a number
      // Since Column B might be split by PapaParse, get the first value after Key
      const rowKeys = Object.keys(nextOutingRow);
      const keyIndex = rowKeys.findIndex(k => (k.toLowerCase() === 'key'));
      
      let valueColumn = '';
      if (keyIndex >= 0 && keyIndex < rowKeys.length - 1) {
        // Get the first column after Key (should be the number)
        valueColumn = nextOutingRow[rowKeys[keyIndex + 1]] || '';
      } else {
        // Fallback: try to get Value column directly
        valueColumn = nextOutingRow['Value'] || nextOutingRow['value'] || nextOutingRow[Object.keys(nextOutingRow)[1]] || '';
      }
      
      const indexValue = valueColumn ? valueColumn.toString().trim() : '';
      const outingIndex = parseInt(indexValue, 10);
      
      if (isNaN(outingIndex) || outingIndex < 1 || outingIndex > OutingsConfig.OUTINGS_2026.length) {
        console.error(`Invalid outing index: ${outingIndex}. Must be between 1 and ${OutingsConfig.OUTINGS_2026.length}`);
        this.renderFallback(container);
        return;
      }
      
      // Convert 1-based index to 0-based array index
      const outing = OutingsConfig.OUTINGS_2026[outingIndex - 1];
      this.render(container, outing);
    } catch (error) {
      console.error('Failed to load next outing:', error);
      this.renderFallback(container);
    }
  },
  
  /**
   * Render the next outing HTML
   * @param {HTMLElement} container - Container element to render into
   * @param {Object} outing - Outing data object
   */
  render: function(container, outing) {
    const html = `
      <div style="text-align: center; margin: 2em 0;">
        <div style="position: relative; display: inline-block; max-width: 100%;">
          <a href="${this.escapeHtml(outing.clubUrl)}" target="_blank" rel="noreferrer noopener" style="display: block;">
            <img
              src="${this.escapeHtml(outing.imagePath)}"
              alt="${this.escapeHtml(outing.clubName)}"
              style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"
            />
          </a>
          <a href="${this.escapeHtml(outing.mapsUrl)}" target="_blank" rel="noreferrer noopener" style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="View on Google Maps">
            <span style="font-size: 20px;">📍</span>
          </a>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },
  
  /**
   * Render fallback content if loading fails
   * @param {HTMLElement} container - Container element to render into
   */
  renderFallback: function(container) {
    // Default to first outing if sheet loading fails
    const defaultOuting = OutingsConfig.OUTINGS_2026[0];
    this.render(container, defaultOuting);
    console.warn('Using default (first) outing as fallback');
  },
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
