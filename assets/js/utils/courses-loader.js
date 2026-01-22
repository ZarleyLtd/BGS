// Courses Loader Utility
// Loads course data (pars and indexes) from Google Sheet and converts to scorecard format

const CoursesLoader = {
  /**
   * Load courses from Google Sheet and convert to scorecard format
   * @param {string} url - CSV URL from Google Sheet
   * @returns {Promise<Object>} Promise that resolves with courses object
   */
  load: async function(url) {
    try {
      if (!url) {
        throw new Error('Courses sheet URL is required');
      }
      
      // Load CSV with headers - Column A = Key, Column B = CSV data string
      const data = await CsvLoader.load(url, { header: true, skipEmptyLines: true });
      
      if (!data || data.length === 0) {
        throw new Error('No course data received from sheet');
      }
      
      console.log('Raw CSV data sample (first 3 rows):', data.slice(0, 3));
      
      // Convert CSV rows to courses object
      // Filter for rows where Key column (Column A) is "Course"
      const courses = {};
      
      data.forEach(row => {
        // Check if this is a Course row
        const key = row['Key'] || row['key'] || row[Object.keys(row)[0]];
        if (!key || key.toString().trim().toLowerCase() !== 'course') {
          return; // Skip non-course rows
        }
        
        // Get the CSV data string from Column B (Value column)
        // Since Column B contains commas, PapaParse may have split it into multiple columns
        // We need to reconstruct it by joining all columns after Key
        const rowKeys = Object.keys(row);
        const keyIndex = rowKeys.findIndex(k => (k.toLowerCase() === 'key'));
        
        // Join all values after the Key column to reconstruct the CSV string
        let valueColumn = '';
        if (keyIndex >= 0 && keyIndex < rowKeys.length - 1) {
          // Get all columns after Key and join them with commas
          const valueParts = [];
          for (let i = keyIndex + 1; i < rowKeys.length; i++) {
            const val = row[rowKeys[i]];
            if (val !== undefined && val !== null && val !== '') {
              valueParts.push(val.toString());
            }
          }
          valueColumn = valueParts.join(',');
        } else {
          // Fallback: try to get Value column directly
          valueColumn = row['Value'] || row['value'] || row[Object.keys(row)[1]] || '';
        }
        
        if (!valueColumn) {
          console.warn('Skipping row with no value data:', row);
          return;
        }
        
        // Parse the CSV string: CourseName,Par1,Par2,...,Par18,Index1,Index2,...,Index18
        const csvData = valueColumn.toString().split(',');
        
        if (csvData.length < 37) { // 1 course name + 18 pars + 18 indexes = 37
          console.warn(`Course row has insufficient data (${csvData.length} values, expected 37):`, valueColumn);
          return;
        }
        
        // First value is the course name
        const courseName = csvData[0].trim();
        if (!courseName) {
          console.warn('Skipping row with no course name:', row);
          return;
        }
        
        // Next 18 values are pars (indices 1-18)
        const pars = [];
        for (let i = 1; i <= 18; i++) {
          const parValue = csvData[i];
          if (parValue !== undefined && parValue !== '') {
            pars.push(parseInt(parValue.trim(), 10));
          } else {
            console.warn(`Missing Par${i} for course ${courseName}`);
            pars.push(0); // Default to 0 if missing
          }
        }
        
        // Next 18 values are indexes (indices 19-36)
        const indexes = [];
        for (let i = 19; i <= 36; i++) {
          const indexValue = csvData[i];
          if (indexValue !== undefined && indexValue !== '') {
            indexes.push(parseInt(indexValue.trim(), 10));
          } else {
            console.warn(`Missing Index${i - 18} for course ${courseName}`);
            indexes.push(0); // Default to 0 if missing
          }
        }
        
        // Validate that we have 18 pars and 18 indexes
        if (pars.length !== 18 || indexes.length !== 18) {
          console.warn(`Course ${courseName} has invalid data (pars: ${pars.length}, indexes: ${indexes.length})`);
          return;
        }
        
        courses[courseName] = {
          pars: pars,
          indexes: indexes
        };
      });
      
      console.log(`Loaded ${Object.keys(courses).length} courses from sheet`);
      return courses;
    } catch (error) {
      console.error('Failed to load courses from sheet:', error);
      throw error;
    }
  }
};
