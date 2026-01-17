/**
 * Golf Scorecard Backend - Google Apps Script
 * Handles saving and loading golf scores
 * 
 * Setup Instructions:
 * 1. Create a new Google Sheet
 * 2. In the sheet, go to Extensions → Apps Script
 * 3. Paste this code
 * 4. Deploy as Web App (Execute as: Me, Who has access: Anyone)
 * 5. Copy the Web App URL and update sheets-config.js
 */

// Sheet structure:
// - Scores: Player Name | Course | Date | Handicap | Hole1 | Hole2 | ... | Hole18 | Total Score | Total Points | Timestamp

function doPost(e) {
  try {
    // Handle both JSON (e.postData.contents) and form-encoded data
    let requestData;
    if (e.postData && e.postData.contents) {
      const contents = e.postData.contents;
      if (contents.trim().startsWith('{')) {
        // JSON format
        requestData = JSON.parse(contents);
      } else {
        // Form-encoded format: "data=..." - parse manually
        // Google Apps Script doesn't have URLSearchParams, so parse manually
        const dataMatch = contents.match(/data=([^&]*)/);
        if (dataMatch && dataMatch[1]) {
          const decodedData = decodeURIComponent(dataMatch[1]);
          requestData = JSON.parse(decodedData);
        } else {
          throw new Error('No data parameter found in form data: ' + contents.substring(0, 100));
        }
      }
    } else if (e.parameter && e.parameter.data) {
      // Form-encoded via parameters (Google Apps Script auto-parses form data)
      requestData = JSON.parse(e.parameter.data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No data received. postData: ' + (e.postData ? 'exists' : 'null') + ', parameter: ' + (e.parameter ? 'exists' : 'null')
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = requestData.action;
    
    if (action === 'saveScore') {
      return saveScore(requestData.data);
    } else if (action === 'loadScores') {
      return loadScores(requestData.data);
    } else if (action === 'deleteScore') {
      return deleteScore(requestData.data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Unknown action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle GET requests for loading scores
  try {
    const playerName = e.parameter.playerName || '';
    const course = e.parameter.course || '';
    const limit = parseInt(e.parameter.limit || '50');
    
    return loadScores({ playerName, course, limit });
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveScore(data) {
  try {
    const sheet = getOrCreateSheet('Scores');
    
    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Player Name', 'Course', 'Date', 'Handicap',
        'Hole1', 'Hole2', 'Hole3', 'Hole4', 'Hole5', 'Hole6', 'Hole7', 'Hole8', 'Hole9',
        'Hole10', 'Hole11', 'Hole12', 'Hole13', 'Hole14', 'Hole15', 'Hole16', 'Hole17', 'Hole18',
        'Total Score', 'Total Points', 'Out Score', 'Out Points', 'In Score', 'In Points', 'Timestamp'
      ];
      sheet.appendRow(headers);
    }
    
    // Prepare row data
    const row = [
      data.playerName || '',
      data.course || '',
      data.date || new Date().toISOString().split('T')[0],
      data.handicap || 0,
      data.holes[0] || '', data.holes[1] || '', data.holes[2] || '', data.holes[3] || '',
      data.holes[4] || '', data.holes[5] || '', data.holes[6] || '', data.holes[7] || '',
      data.holes[8] || '', data.holes[9] || '', data.holes[10] || '', data.holes[11] || '',
      data.holes[12] || '', data.holes[13] || '', data.holes[14] || '', data.holes[15] || '',
      data.holes[16] || '', data.holes[17] || '',
      data.totalScore || 0,
      data.totalPoints || 0,
      data.outScore || 0,
      data.outPoints || 0,
      data.inScore || 0,
      data.inPoints || 0,
      new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Score saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function loadScores(data) {
  try {
    const sheet = getOrCreateSheet('Scores');
    
    if (sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        scores: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const scores = [];
    
    // Start from row 1 (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Filter by player name if provided
      if (data.playerName && row[0] !== data.playerName) {
        continue;
      }
      
      // Filter by course if provided
      if (data.course && row[1] !== data.course) {
        continue;
      }
      
      // Normalize timestamp - convert Date objects to ISO strings
      let timestamp = row[28] || '';
      if (timestamp instanceof Date) {
        timestamp = timestamp.toISOString();
      } else if (timestamp) {
        timestamp = String(timestamp);
      }
      
      // Normalize date - convert Date objects to strings
      let date = row[2] || '';
      if (date instanceof Date) {
        date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else if (date) {
        const str = String(date);
        // If it's an ISO date string (e.g., "2026-01-17T00:00:00.000Z"), extract just the date part
        if (str.includes('T') && str.length > 10) {
          date = str.split('T')[0];
        } else {
          date = str;
        }
      }
      
      const score = {
        playerName: row[0] || '',
        course: row[1] || '',
        date: date,
        handicap: row[3] || 0,
        holes: [
          row[4] || '', row[5] || '', row[6] || '', row[7] || '',
          row[8] || '', row[9] || '', row[10] || '', row[11] || '',
          row[12] || '', row[13] || '', row[14] || '', row[15] || '',
          row[16] || '', row[17] || '', row[18] || '', row[19] || '',
          row[20] || '', row[21] || ''
        ],
        totalScore: row[22] || 0,
        totalPoints: row[23] || 0,
        outScore: row[24] || 0,
        outPoints: row[25] || 0,
        inScore: row[26] || 0,
        inPoints: row[27] || 0,
        timestamp: timestamp
      };
      
      scores.push(score);
    }
    
    // Sort by timestamp (newest first) and limit results
    scores.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    const limit = data.limit || 50;
    const limitedScores = scores.slice(0, limit);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      scores: limitedScores
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteScore(data) {
  try {
    const sheet = getOrCreateSheet('Scores');
    
    if (sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No scores to delete'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const rows = sheet.getDataRange().getValues();
    let deleted = false;
    
    // Helper function to normalize values for comparison
    // Handles Date objects, strings, and other types
    function normalizeValue(value) {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) {
        // Convert Date to ISO string for comparison
        return value.toISOString();
      }
      const str = String(value).trim();
      // If it's already an ISO string, ensure it's properly formatted
      // Remove any extra whitespace or formatting
      return str;
    }
    
    // Helper function to normalize date values (YYYY-MM-DD format)
    function normalizeDate(value) {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) {
        // Convert Date to YYYY-MM-DD format
        return value.toISOString().split('T')[0];
      }
      let str = String(value).trim();
      
      // Decode URL encoding (e.g., "Sat+Jan+17+2026" -> "Sat Jan 17 2026")
      str = str.replace(/\+/g, ' ');
      
      // Try to parse as Date if it's a human-readable format
      // (e.g., "Sat Jan 17 2026 00:00:00 GM" or "Sat Jan 17 2026 00:00:00 GMT")
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        // Valid date - convert to YYYY-MM-DD
        return parsedDate.toISOString().split('T')[0];
      }
      
      // If it's an ISO date string (e.g., "2026-01-17T00:00:00.000Z"), extract just the date part
      if (str.includes('T') && str.length > 10) {
        return str.split('T')[0];
      }
      
      // If it's already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      
      return str;
    }
    
    // Normalize the search criteria
    const searchPlayerName = String(data.playerName || '').trim();
    const searchCourse = String(data.course || '').trim();
    const searchDate = normalizeDate(data.date || '');
    const searchTimestamp = normalizeValue(data.timestamp || '');
    
    // Find and delete matching row (by player, course, date, and timestamp)
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      
      // Normalize row values for comparison
      const rowPlayerName = String(row[0] || '').trim();
      const rowCourse = String(row[1] || '').trim();
      const rowDate = normalizeDate(row[2] || '');
      const rowTimestamp = normalizeValue(row[28] || '');
      
      // Compare normalized values
      if (rowPlayerName === searchPlayerName &&
          rowCourse === searchCourse &&
          rowDate === searchDate &&
          rowTimestamp === searchTimestamp) {
        sheet.deleteRow(i + 1); // +1 because sheet rows are 1-indexed
        deleted = true;
        break;
      }
    }
    
    if (!deleted) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Score not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Score deleted successfully'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  return sheet;
}
