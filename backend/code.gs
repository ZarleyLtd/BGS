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
    } else if (action === 'checkExistingScore') {
      return checkExistingScore(requestData.data);
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

// Normalize name for comparison (case-insensitive, ignore spaces)
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '');
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

function saveScore(data) {
  try {
    const sheet = getOrCreateSheet('Scores');
    
    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Player Name', 'Course', 'Date', 'Handicap',
        'Hole1', 'Hole2', 'Hole3', 'Hole4', 'Hole5', 'Hole6', 'Hole7', 'Hole8', 'Hole9',
        'Hole10', 'Hole11', 'Hole12', 'Hole13', 'Hole14', 'Hole15', 'Hole16', 'Hole17', 'Hole18',
        'Points1', 'Points2', 'Points3', 'Points4', 'Points5', 'Points6', 'Points7', 'Points8', 'Points9',
        'Points10', 'Points11', 'Points12', 'Points13', 'Points14', 'Points15', 'Points16', 'Points17', 'Points18',
        'Total Score', 'Total Points', 'Out Score', 'Out Points', 'In Score', 'In Points',
        'Back 6 Score', 'Back 6 Points', 'Back 3 Score', 'Back 3 Points', 'Timestamp'
      ];
      sheet.appendRow(headers);
    }
    
    // Check if a record already exists for this course/name/date
    const playerName = String(data.playerName || '').trim();
    const course = String(data.course || '').trim();
    const date = String(data.date || new Date().toISOString().split('T')[0]).trim();
    
    const normalizedPlayerName = normalizeName(playerName);
    
    let existingRowIndex = -1;
    if (sheet.getLastRow() > 1) {
      const rows = sheet.getDataRange().getValues();
      // Start from row 1 (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowPlayerName = String(row[0] || '').trim();
        const rowCourse = String(row[1] || '').trim();
        const rowDate = normalizeDate(row[2] || '');
        
        // Compare with normalized names (case-insensitive, ignore spaces)
        if (normalizeName(rowPlayerName) === normalizedPlayerName &&
            rowCourse === course &&
            rowDate === date) {
          existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }
    }
    
    // Prepare row data
    const holePoints = data.holePoints || [];
    const row = [
      data.playerName || '',
      data.course || '',
      data.date || new Date().toISOString().split('T')[0],
      data.handicap || 0,
      // Strokes for each hole (18 holes)
      data.holes[0] || '', data.holes[1] || '', data.holes[2] || '', data.holes[3] || '',
      data.holes[4] || '', data.holes[5] || '', data.holes[6] || '', data.holes[7] || '',
      data.holes[8] || '', data.holes[9] || '', data.holes[10] || '', data.holes[11] || '',
      data.holes[12] || '', data.holes[13] || '', data.holes[14] || '', data.holes[15] || '',
      data.holes[16] || '', data.holes[17] || '',
      // Points for each hole (18 holes)
      holePoints[0] || 0, holePoints[1] || 0, holePoints[2] || 0, holePoints[3] || 0,
      holePoints[4] || 0, holePoints[5] || 0, holePoints[6] || 0, holePoints[7] || 0,
      holePoints[8] || 0, holePoints[9] || 0, holePoints[10] || 0, holePoints[11] || 0,
      holePoints[12] || 0, holePoints[13] || 0, holePoints[14] || 0, holePoints[15] || 0,
      holePoints[16] || 0, holePoints[17] || 0,
      // Totals
      data.totalScore || 0,
      data.totalPoints || 0,
      data.outScore || 0,
      data.outPoints || 0,
      data.inScore || 0,
      data.inPoints || 0,
      data.back6Score || 0,
      data.back6Points || 0,
      data.back3Score || 0,
      data.back3Points || 0,
      new Date().toISOString()
    ];
    
    if (existingRowIndex > 0) {
      // Update existing row
      sheet.getRange(existingRowIndex, 1, 1, row.length).setValues([row]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Score updated successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Append new row
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Score saved successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function checkExistingScore(data) {
  try {
    const sheet = getOrCreateSheet('Scores');
    
    if (sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        exists: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const playerName = String(data.playerName || '').trim();
    const course = String(data.course || '').trim();
    const date = String(data.date || new Date().toISOString().split('T')[0]).trim();
    
    const normalizedPlayerName = normalizeName(playerName);
    
    const rows = sheet.getDataRange().getValues();
    
    // Start from row 1 (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowPlayerName = String(row[0] || '').trim();
      const rowCourse = String(row[1] || '').trim();
      const rowDate = normalizeDate(row[2] || '');
      
      // Compare with normalized names (case-insensitive, ignore spaces)
      if (normalizeName(rowPlayerName) === normalizedPlayerName &&
          rowCourse === course &&
          rowDate === date) {
        // Found existing score - return it
        let timestamp = row[46] || '';
        if (timestamp instanceof Date) {
          timestamp = timestamp.toISOString();
        } else if (timestamp) {
          timestamp = String(timestamp);
        }
        
        let dateValue = row[2] || '';
        if (dateValue instanceof Date) {
          dateValue = dateValue.toISOString().split('T')[0];
        } else if (dateValue) {
          const str = String(dateValue);
          if (str.includes('T') && str.length > 10) {
            dateValue = str.split('T')[0];
          } else {
            dateValue = str;
          }
        }
        
        const score = {
          playerName: row[0] || '',
          course: row[1] || '',
          date: dateValue,
          handicap: row[3] || 0,
          holes: [
            row[4] || '', row[5] || '', row[6] || '', row[7] || '',
            row[8] || '', row[9] || '', row[10] || '', row[11] || '',
            row[12] || '', row[13] || '', row[14] || '', row[15] || '',
            row[16] || '', row[17] || '', row[18] || '', row[19] || '',
            row[20] || '', row[21] || ''
          ],
          holePoints: [
            row[22] || 0, row[23] || 0, row[24] || 0, row[25] || 0,
            row[26] || 0, row[27] || 0, row[28] || 0, row[29] || 0,
            row[30] || 0, row[31] || 0, row[32] || 0, row[33] || 0,
            row[34] || 0, row[35] || 0, row[36] || 0, row[37] || 0,
            row[38] || 0, row[39] || 0
          ],
          totalScore: row[40] || 0,
          totalPoints: row[41] || 0,
          outScore: row[42] || 0,
          outPoints: row[43] || 0,
          inScore: row[44] || 0,
          inPoints: row[45] || 0,
          back6Score: row[46] || 0,
          back6Points: row[47] || 0,
          back3Score: row[48] || 0,
          back3Points: row[49] || 0,
          timestamp: row[50] || ''
        };
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          exists: true,
          score: score
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      exists: false
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
      
      // Filter by player name if provided (case-insensitive, ignore spaces)
      if (data.playerName) {
        const normalizedSearchName = normalizeName(data.playerName);
        const normalizedRowName = normalizeName(row[0] || '');
        if (normalizedRowName !== normalizedSearchName) {
          continue;
        }
      }
      
      // Filter by course if provided
      if (data.course && row[1] !== data.course) {
        continue;
      }
      
      // Normalize timestamp - convert Date objects to ISO strings
      let timestamp = row[50] || '';
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
        holePoints: [
          row[22] || 0, row[23] || 0, row[24] || 0, row[25] || 0,
          row[26] || 0, row[27] || 0, row[28] || 0, row[29] || 0,
          row[30] || 0, row[31] || 0, row[32] || 0, row[33] || 0,
          row[34] || 0, row[35] || 0, row[36] || 0, row[37] || 0,
          row[38] || 0, row[39] || 0
        ],
        totalScore: row[40] || 0,
        totalPoints: row[41] || 0,
        outScore: row[42] || 0,
        outPoints: row[43] || 0,
        inScore: row[44] || 0,
        inPoints: row[45] || 0,
        back6Score: row[46] || 0,
        back6Points: row[47] || 0,
        back3Score: row[48] || 0,
        back3Points: row[49] || 0,
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
      const rowTimestamp = normalizeValue(row[50] || '');
      
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
