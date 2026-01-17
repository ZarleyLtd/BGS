# Golf Scorecard Backend Setup

This backend uses Google Apps Script to store and retrieve golf scores in a Google Sheet.

## Setup Instructions

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "Golf Scores" (the name doesn't matter)

### 2. Create the Apps Script

1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any default code that appears
3. Copy the entire contents of `backend/code.gs` and paste it into the Apps Script editor
4. Save the project (click the floppy disk icon or press Ctrl+S / Cmd+S)
5. Give it a name like "Golf Scorecard API"

### 3. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Configure the deployment:
   - **Description**: "Golf Scorecard API" (or any description)
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (or "Anyone with Google account" for more security)
4. Click **Deploy**
5. **Copy the Web App URL** that appears - you'll need this in the next step
6. Click **Done**

### 4. Update Frontend Configuration

1. Open `assets/js/config/sheets-config.js`
2. Find the line: `apiUrl: "", // TODO: Add your Google Apps Script Web App URL here`
3. Replace the empty string with your Web App URL from step 3
4. Save the file

Example:
```javascript
apiUrl: "https://script.google.com/macros/s/AKfycby.../exec",
```

### 5. Authorize the Script (First Time Only)

1. When you first access the scorecard page and try to save a score, Google will ask for authorization
2. Click **Review Permissions**
3. Choose your Google account
4. Click **Advanced** → **Go to [Project Name] (unsafe)**
5. Click **Allow**

The script needs permission to:
- Read and write to your Google Sheet (to store scores)

## Testing

1. Open `scorecard.html` in your browser
2. Enter a player name, handicap, and select a course
3. Enter some hole scores
4. Click **Save Score**
5. Click **Load My Scores** to see your saved scores

## Data Structure

The backend creates a sheet called "Scores" with the following columns:

- Player Name
- Course
- Date
- Handicap
- Hole1 through Hole18
- Total Score
- Total Points
- Out Score
- Out Points
- In Score
- In Points
- Timestamp

## API Endpoints

The backend supports the following actions:

### Save Score
- **Action**: `saveScore`
- **Method**: POST
- **Data**: Score data object with player name, course, date, handicap, holes array, and totals

### Load Scores
- **Action**: `loadScores`
- **Method**: POST or GET
- **Parameters**: 
  - `playerName` (optional) - Filter by player name
  - `course` (optional) - Filter by course
  - `limit` (optional) - Maximum number of results (default: 50)

### Delete Score
- **Action**: `deleteScore`
- **Method**: POST
- **Data**: Object with playerName, course, date, and timestamp

## Troubleshooting

### "API URL not configured" error
- Make sure you've added your Web App URL to `sheets-config.js`
- Check that the URL is correct and includes the full path

### 404 (Not Found) error
A 404 means the Web App URL does not exist or is wrong. Fix it as follows:

1. **Get a fresh Web App URL**:
   - Open your Google Sheet
   - Go to **Extensions** → **Apps Script**
   - Click **Deploy** → **Manage deployments**
   - If there is no deployment, click **Deploy** → **New deployment** → choose **Web app**
   - If a deployment exists, click the **pencil icon (edit)** next to it
   - Set **Execute as**: Me, **Who has access**: Anyone
   - Click **Deploy**
   - **Copy the full Web App URL** (it ends with `/exec`)

2. **Update the config**:
   - Open `assets/js/config/sheets-config.js`
   - Replace the `apiUrl` value with the URL you copied
   - Save the file

3. **Check the URL**:
   - It must start with `https://script.google.com/macros/s/`
   - It must end with `/exec`
   - There should be no spaces or line breaks

### "Failed to fetch" or "Network error" message
This is usually a CORS or deployment configuration issue. Try these steps:

1. **Verify Deployment Settings**:
   - Go to your Apps Script project
   - Click **Deploy** → **Manage deployments**
   - Click the pencil icon (edit) on your deployment
   - Ensure **Execute as** is set to **Me**
   - Ensure **Who has access** is set to **Anyone** (not "Anyone with Google account")
   - Click **Deploy** to create a new version
   - Copy the new Web App URL and update `sheets-config.js`

2. **Authorize the Script**:
   - The script must be authorized before it can run
   - Try accessing the Web App URL directly in your browser
   - You should see a JSON response or an authorization prompt
   - Complete the authorization process

3. **Check Browser Console**:
   - Open browser developer tools (F12)
   - Go to the Console tab
   - Look for detailed error messages
   - Check the Network tab to see if the request is being sent

4. **Test the Web App URL Directly**:
   - Open the Web App URL in a new browser tab
   - You should see a JSON response (even if it's an error)
   - If you see an HTML error page, the deployment may not be correct

### "Error saving score" message
- Check that you've authorized the script (step 5)
- Verify the Web App URL is correct
- Check the browser console for detailed error messages
- Ensure the Google Sheet exists and the script has permission to access it

### Scores not appearing
- Make sure you've clicked "Deploy" after creating the script
- Verify the Web App URL in `sheets-config.js` matches your deployment URL
- Check that the script has permission to access your Google Sheet
- Try refreshing the page and clicking "Load My Scores" again