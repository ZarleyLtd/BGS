// Scorecard Page - Golf Scorecard Calculator
// Calculates Stableford points based on handicap and stroke inputs

// Scorecard Page - Golf Scorecard Calculator
// Calculates Stableford points based on handicap and stroke inputs

const ScorecardPage = {
  // Course data - pars and stroke indexes
  courses: {
    Ardee: {
      pars: [4,3,4,5,4,4,4,4,3,4,4,4,3,5,4,4,4,4],
      indexes: [8,14,4,18,2,12,10,6,16,9,15,5,17,1,11,13,7,3]
    },
    DonabateYR: {
      pars: [3,5,4,3,4,5,4,3,5,4,3,4,4,4,4,4,5,4],
      indexes: [9,7,3,17,1,5,15,13,11,4,10,16,6,12,8,18,14,2]
    },
    DeerPark: {
      pars: [4,3,4,4,4,3,5,4,5,4,3,4,4,5,3,4,4,5],
      indexes: [10,2,14,16,9,18,5,6,12,1,15,11,17,8,13,7,4,3]
    },
    Balcarrick: {
      pars: [4,4,4,4,3,5,3,5,4,4,4,4,4,4,5,3,5,4],
      indexes: [17,7,3,13,11,5,15,9,1,18,2,12,10,4,8,16,14,6]
    },
    Elmgreen: {
      pars: [4,5,4,4,3,4,3,4,4,4,3,4,4,4,4,5,3,4],
      indexes: [3,11,15,5,13,17,9,7,1,10,18,12,2,8,14,4,16,6]
    },
    HeadfortNew: {
      pars: [4,5,4,3,4,5,3,4,4,4,3,4,4,5,4,5,3,4],
      indexes: [6,18,10,14,2,8,16,4,12,9,11,5,1,15,3,17,13,7]
    },
    HeadfortOld: {
      pars: [5,3,4,5,4,4,5,3,4,3,5,4,4,3,4,4,4,4],
      indexes: [17,12,5,8,1,3,18,14,10,16,13,4,6,11,15,2,7,9]
    },
    HollywoodLakes: {
      pars: [4,4,4,3,5,3,4,4,5,4,3,4,4,5,5,4,3,4],
      indexes: [8,4,12,14,18,10,2,6,16,3,11,17,9,1,15,5,13,7]
    },
    KilkeaCastle: {
      pars: [4,5,4,3,5,3,4,4,4,3,4,5,4,3,4,3,4,4],
      indexes: [11,4,12,6,13,18,2,3,15,17,10,14,8,16,7,5,1,9]
    },
    Killeen: {
      pars: [5,4,4,4,4,3,4,3,5,5,4,4,4,3,4,5,4,3],
      indexes: [14,4,12,8,2,16,6,18,10,15,7,3,11,9,1,17,5,13]
    },
    KilleenCastle: {
      pars: [4,5,4,4,4,3,5,3,4,4,4,5,4,3,5,3,4,4],
      indexes: [3,9,12,13,4,11,15,17,1,5,7,16,8,14,18,10,6,2]
    },
    Moyvalley: {
      pars: [4,3,4,4,3,5,4,5,4,4,4,4,5,3,4,4,3,5],
      indexes: [10,16,4,8,18,6,2,14,12,15,7,5,9,13,17,3,11,1]
    },
    Newbridge: {
      pars: [5,4,3,5,4,3,4,4,5,4,3,4,4,3,4,4,4,5],
      indexes: [16,10,12,6,8,18,2,4,14,1,11,17,3,9,13,7,5,15]
    },
    Roganstown: {
      pars: [4,3,4,5,5,3,4,4,3,5,4,3,4,4,4,4,3,5],
      indexes: [4,18,6,16,14,8,2,10,12,11,7,15,1,13,9,3,17,5]
    },
    Rosslare: {
      pars: [4,3,5,4,4,4,5,3,4,3,4,5,4,3,4,4,4,5],
      indexes: [10,9,14,8,2,13,6,12,3,11,1,17,16,15,7,5,4,18]
    },
    Sillogue: {
      pars: [4,3,5,4,5,4,3,4,3,4,4,5,3,4,4,4,4,4],
      indexes: [4,10,7,12,5,16,15,1,17,2,8,3,13,14,11,9,18,6]
    },
    RoyalCurragh: {
      pars: [5,4,4,3,4,4,5,4,4,4,3,5,5,3,4,3,4,4],
      indexes: [14,6,17,4,16,8,12,3,10,7,13,5,2,15,11,18,1,9]
    },
    Rathcore: {
      pars: [5,4,4,3,4,4,4,4,3,5,3,4,5,4,4,3,4,5],
      indexes: [5,9,7,11,3,17,15,1,13,18,14,2,12,10,4,6,16,8]
    },
    StMargarets: {
      pars: [4,3,5,4,3,4,4,5,4,4,4,5,3,4,3,5,5,4],
      indexes: [13,17,11,1,15,3,5,9,7,10,6,18,12,4,14,16,8,2]
    },
    Trim: {
      pars: [3,5,5,4,4,4,3,4,5,4,4,3,4,4,4,4,4,5],
      indexes: [10,4,6,14,2,12,16,8,18,17,7,15,5,13,11,3,1,9]
    },
    Tulfarris: {
      pars: [5,3,4,4,4,3,4,4,5,4,3,4,5,4,5,3,4,4],
      indexes: [12,16,4,2,14,10,18,8,6,1,17,7,15,9,13,11,5,3]
    },
    Rathsllagh: {
      pars: [5,4,4,3,4,5,3,4,4,4,5,4,3,4,4,5,3,4],
      indexes: [13,2,15,11,9,6,17,4,7,1,10,12,18,14,8,5,16,3]
    },
    ConcraWood: {
      pars: [5,4,4,5,4,3,4,4,3,4,4,3,5,3,5,4,4,4],
      indexes: [13,3,17,5,1,15,11,7,9,6,4,16,12,18,14,2,8,10]
    },
    Royal_Tara: {
      pars: [5,4,5,4,3,4,4,3,5,4,3,4,3,5,3,4,4,5],
      indexes: [12,4,6,16,18,14,2,10,8,1,17,5,15,11,13,3,7,9]
    },
    Font: {
      pars: [4,4,3,4,5,4,4,3,5,4,5,3,4,4,5,3,3,5],
      indexes: [17,5,6,7,15,2,18,11,1,10,8,12,16,3,14,13,9,4]
    },
    Alicante: {
      pars: [5,4,3,5,4,3,4,3,5,5,4,3,4,5,3,5,3,4],
      indexes: [17,5,15,13,1,9,3,7,11,18,6,16,2,12,8,14,4,10]
    },
    Millicent: {
      pars: [5,5,4,3,4,4,4,4,3,4,4,4,5,4,3,5,3,5],
      indexes: [2,18,10,16,12,4,6,8,14,5,7,13,17,15,11,3,9,1]
    }
  },

  currentCourse: null,
  pars: null,
  indexes: null,

  init: function() {
    const scorecardForm = document.getElementById('scorecard-form');
    if (!scorecardForm) {
      return;
    }

    // Set default course to Millicent
    this.currentCourse = 'Millicent';
    this.updateCourseData();

    // Populate course dropdown
    this.populateCourseDropdown();

    // Set up event listeners
    this.setupEventListeners();
  },

  updateCourseData: function() {
    const course = this.courses[this.currentCourse];
    if (course) {
      this.pars = course.pars;
      this.indexes = course.indexes;
      this.updateScorecardDisplay();
    }
  },

  populateCourseDropdown: function() {
    const select = document.getElementById('course-select');
    if (!select) {
      return;
    }

    select.innerHTML = '<option value="">Select Course</option>';
    
    const courseKeys = Object.keys(this.courses).sort();
    
    courseKeys.forEach(courseName => {
      const option = document.createElement('option');
      option.value = courseName;
      option.textContent = courseName;
      if (courseName === this.currentCourse) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  updateScorecardDisplay: function() {
    if (!this.pars || !this.indexes) return;

    // Update par and index displays for all holes
    for (let i = 0; i < 18; i++) {
      const holeNum = i + 1;
      const parEl = document.getElementById(`par-${holeNum}`);
      const indexEl = document.getElementById(`index-${holeNum}`);
      
      if (parEl) parEl.textContent = this.pars[i];
      if (indexEl) indexEl.textContent = this.indexes[i];
    }
    
    // Update par totals
    this.updateParTotals();
  },

  updateParTotals: function() {
    if (!this.pars) return;
    
    let OUTtotPar = 0, INtotPar = 0;
    
    // Calculate front 9 par total
    for (let i = 0; i < 9; i++) {
      OUTtotPar += this.pars[i] || 0;
    }
    
    // Calculate back 9 par total
    for (let i = 9; i < 18; i++) {
      INtotPar += this.pars[i] || 0;
    }
    
    const totPar = OUTtotPar + INtotPar;
    
    const outParEl = document.getElementById('out-par');
    const inParEl = document.getElementById('in-par');
    const totalParEl = document.getElementById('total-par');
    
    if (outParEl) outParEl.textContent = OUTtotPar || '0';
    if (inParEl) inParEl.textContent = INtotPar || '0';
    if (totalParEl) totalParEl.textContent = 'Par ' + (totPar || '0');
  },

  setupEventListeners: function() {
    // Course selection change
    const courseSelect = document.getElementById('course-select');
    if (courseSelect) {
      courseSelect.addEventListener('change', (e) => {
        this.currentCourse = e.target.value;
        if (this.currentCourse) {
          this.updateCourseData();
          // Clear all inputs and recalculate
          this.clearInputs();
        }
      });
    }

    // Handle input field changes (auto-tab and calculation)
    for (let i = 1; i <= 18; i++) {
      const input = document.getElementById(`hole-${i}`);
      if (input) {
        input.addEventListener('input', (e) => {
          this.handleInput(e.target, i);
        });
        
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') {
            this.autotab(e.target, i);
          }
        });
      }
    }

    // Handicap input change
    const hcInput = document.getElementById('handicap');
    if (hcInput) {
      hcInput.addEventListener('input', () => {
        this.calculateScores();
      });
    }

    // Player name input - tab to handicap
    const playerInput = document.getElementById('player-name');
    if (playerInput) {
      playerInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('handicap')?.focus();
        }
      });
    }

    // Save score button
    const saveBtn = document.getElementById('save-score-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveScore();
      });
    }

    // Load scores button
    const loadBtn = document.getElementById('load-scores-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.loadSavedScores();
      });
    }
  },

  handleInput: function(input, holeNum) {
    // Validate input (0-9 for strokes)
    if (input.value && (parseInt(input.value) < 0 || parseInt(input.value) > 9)) {
      input.value = '';
    }
    
    // Auto-tab only if max length reached AND next field is empty
    if (input.value.length >= 1 && parseInt(input.value) >= 0) {
      this.autotab(input, holeNum);
    }
    
    // Recalculate scores
    this.calculateScores();
  },

  autotab: function(currentInput, currentHole) {
    // Only auto-tab if we've reached max length (1 digit) and value is valid
    const maxLength = currentInput.getAttribute('maxlength');
    if (!maxLength || currentInput.value.length < parseInt(maxLength)) {
      return;
    }
    
    // Only proceed if we have a valid digit (0-9)
    const value = parseInt(currentInput.value);
    if (isNaN(value) || value < 0 || value > 9) {
      return;
    }
    
    // Focus next hole input (wrap around at hole 18)
    const nextHole = currentHole === 18 ? 1 : currentHole + 1;
    const nextInput = document.getElementById(`hole-${nextHole}`);
    
    // Always advance to next input, whether it has a value or not
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  },

  ifZero: function(value, defaultValue) {
    return value === 0 || value === '' || value === null ? defaultValue : value;
  },

  calculateScores: function() {
    if (!this.pars || !this.indexes) return;

    const hc = parseInt(document.getElementById('handicap')?.value) || 0;
    if (hc === 0) {
      this.resetAllPoints();
      return;
    }

    const strokes = [];
    const shots = [];
    const points = [];

    // Get stroke inputs
    for (let i = 0; i < 18; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      strokes[i] = input && input.value ? parseInt(input.value) : 0;
      shots[i] = 0;
      points[i] = 0;
    }

    // Calculate shots received per hole
    for (let i = 0; i < 18; i++) {
      if (this.indexes[i] <= hc) {
        shots[i] = Math.floor((hc - this.indexes[i]) / 18) + 1;
      } else {
        shots[i] = Math.floor(Math.max((hc - this.indexes[i]), 0) / 18);
      }
    }

    // Calculate stableford points
    for (let i = 0; i < 18; i++) {
      // If strokes is 0, points are 0
      if (strokes[i] === 0) {
        points[i] = 0;
      } else {
        const netStrokes = strokes[i] - shots[i];
        const netVsPar = this.pars[i] - netStrokes;
        points[i] = Math.max(netVsPar + 2, 0);
      }
    }

    // Calculate totals
    let OUTtotScore = 0, INtotScore = 0;
    let OUTtotPts = 0, INtotPts = 0;
    let OUTtotPar = 0, INtotPar = 0;

    // Calculate front 9 totals
    for (let i = 0; i < 9; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      if (input && input.value !== '') {
        OUTtotScore += strokes[i] || 0;
        OUTtotPts += points[i] || 0;
      }
      OUTtotPar += this.pars[i] || 0;
    }

    // Calculate back 9 totals
    for (let i = 9; i < 18; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      if (input && input.value !== '') {
        INtotScore += strokes[i] || 0;
        INtotPts += points[i] || 0;
      }
      INtotPar += this.pars[i] || 0;
    }

    const totScore = OUTtotScore + INtotScore;
    const totPoints = OUTtotPts + INtotPts;
    const totPar = OUTtotPar + INtotPar;

    // Update point displays
    for (let i = 0; i < 18; i++) {
      const pointsEl = document.getElementById(`points-${i + 1}`);
      const input = document.getElementById(`hole-${i + 1}`);
      if (pointsEl) {
        // Show points if input has a value (including 0), otherwise show 0
        if (input && input.value !== '') {
          pointsEl.textContent = points[i];
        } else {
          pointsEl.textContent = '0';
        }
      }
    }

    // Update totals
    document.getElementById('out-score').textContent = OUTtotScore || '0';
    document.getElementById('out-points').textContent = OUTtotPts || '0';
    document.getElementById('out-par').textContent = OUTtotPar || '0';
    document.getElementById('in-score').textContent = INtotScore || '0';
    document.getElementById('in-points').textContent = INtotPts || '0';
    document.getElementById('in-par').textContent = INtotPar || '0';
    document.getElementById('total-score').textContent = totScore || '0';
    document.getElementById('total-points').textContent = totPoints || '0';
    document.getElementById('total-par').textContent = 'Par ' + (totPar || '0');
  },

  resetAllPoints: function() {
    for (let i = 1; i <= 18; i++) {
      const pointsEl = document.getElementById(`points-${i}`);
      if (pointsEl) pointsEl.textContent = '0';
    }
    
    document.getElementById('out-score').textContent = '0';
    document.getElementById('out-points').textContent = '0';
    document.getElementById('out-par').textContent = '0';
    document.getElementById('in-score').textContent = '0';
    document.getElementById('in-points').textContent = '0';
    document.getElementById('in-par').textContent = '0';
    document.getElementById('total-score').textContent = '0';
    document.getElementById('total-points').textContent = '0';
    document.getElementById('total-par').textContent = 'Par 0';
  },

  clearInputs: function() {
    // Clear all stroke inputs
    for (let i = 1; i <= 18; i++) {
      const input = document.getElementById(`hole-${i}`);
      if (input) input.value = '';
    }
    this.resetAllPoints();
  },

  // Save/Load functionality
  saveScore: function() {
    const playerName = document.getElementById('player-name')?.value.trim();
    const handicap = parseInt(document.getElementById('handicap')?.value) || 0;
    const course = this.currentCourse;
    
    if (!playerName) {
      alert('Please enter your name');
      return;
    }
    
    if (!course) {
      alert('Please select a course');
      return;
    }
    
    if (handicap === 0) {
      alert('Please enter your handicap');
      return;
    }
    
    // Get all hole scores
    const holes = [];
    let hasScores = false;
    for (let i = 1; i <= 18; i++) {
      const input = document.getElementById(`hole-${i}`);
      const value = input && input.value ? parseInt(input.value) : '';
      holes.push(value);
      if (value !== '') hasScores = true;
    }
    
    if (!hasScores) {
      alert('Please enter at least one hole score');
      return;
    }
    
    // Get totals
    const totalScore = parseInt(document.getElementById('total-score')?.textContent) || 0;
    const totalPoints = parseInt(document.getElementById('total-points')?.textContent) || 0;
    const outScore = parseInt(document.getElementById('out-score')?.textContent) || 0;
    const outPoints = parseInt(document.getElementById('out-points')?.textContent) || 0;
    const inScore = parseInt(document.getElementById('in-score')?.textContent) || 0;
    const inPoints = parseInt(document.getElementById('in-points')?.textContent) || 0;
    
    // Get current date
    const date = new Date().toISOString().split('T')[0];
    
    const scoreData = {
      playerName: playerName,
      course: course,
      date: date,
      handicap: handicap,
      holes: holes,
      totalScore: totalScore,
      totalPoints: totalPoints,
      outScore: outScore,
      outPoints: outPoints,
      inScore: inScore,
      inPoints: inPoints
    };
    
    // Show loading state
    const saveBtn = document.getElementById('save-score-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    
    ApiClient.post('saveScore', scoreData)
      .then(result => {
        alert('Score saved successfully!');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Score';
        }
        // Refresh saved scores list
        this.loadSavedScores();
      })
      .catch(error => {
        alert('Error saving score: ' + error.message);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Score';
        }
      });
  },

  loadSavedScores: function() {
    const playerName = document.getElementById('player-name')?.value.trim();
    const course = this.currentCourse || '';
    
    const loadBtn = document.getElementById('load-scores-btn');
    if (loadBtn) {
      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading...';
    }
    
    ApiClient.post('loadScores', {
      playerName: playerName || '',
      course: course || '',
      limit: 20
    })
      .then(result => {
        this.displaySavedScores(result.scores || []);
        if (loadBtn) {
          loadBtn.disabled = false;
          loadBtn.textContent = 'Load My Scores';
        }
      })
      .catch(error => {
        console.error('Error loading scores:', error);
        if (loadBtn) {
          loadBtn.disabled = false;
          loadBtn.textContent = 'Load My Scores';
        }
        // Don't show error if API is not configured
        if (error.message.includes('API URL not configured')) {
          return;
        }
        alert('Error loading scores: ' + error.message);
      });
  },

  displaySavedScores: function(scores) {
    const container = document.getElementById('saved-scores-container');
    if (!container) return;
    
    if (scores.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray, #57585a);">No saved scores found</p>';
      return;
    }
    
    let html = '<div style="margin-top: 1em;"><h3 style="margin-bottom: 0.5em;">Saved Scores</h3>';
    html += '<div style="max-height: 400px; overflow-y: auto;">';
    
    scores.forEach((score, index) => {
      const date = new Date(score.date).toLocaleDateString();
      html += `<div style="padding: 0.75em; margin-bottom: 0.5em; background: var(--lighter, #F3F3F3); border-radius: 3px; border: 1px solid var(--light, #CACBCF);">`;
      html += `<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5em;">`;
      html += `<div>`;
      html += `<strong>${score.course}</strong> - ${date}`;
      html += `<br><small>Score: ${score.totalScore} | Points: ${score.totalPoints}</small>`;
      html += `</div>`;
      html += `<div style="display: flex; gap: 0.5em; align-items: baseline; flex-shrink: 0;">`;
      html += `<button class="load-score-btn" data-index="${index}" style="margin: 0; background: var(--color, #D73A42); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9rem; font-weight: 600; line-height: 2.2em; height: 2.2em; padding: 0 0.8em; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; white-space: nowrap; vertical-align: baseline;">Load</button>`;
      html += `<button class="delete-score-btn" data-index="${index}" data-player="${score.playerName}" data-course="${score.course}" data-date="${score.date}" data-timestamp="${score.timestamp}" style="margin: 0; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9rem; font-weight: 600; line-height: 2.2em; height: 2.2em; padding: 0 0.8em; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; white-space: nowrap; vertical-align: baseline;">Delete</button>`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
    
    // Store scores for later use
    this.savedScores = scores;
    
    // Add event listeners
    container.querySelectorAll('.load-score-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this.loadScoreIntoForm(scores[index]);
      });
    });
    
    container.querySelectorAll('.delete-score-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Are you sure you want to delete this score?')) {
          const playerName = e.target.getAttribute('data-player');
          const course = e.target.getAttribute('data-course');
          let date = e.target.getAttribute('data-date');
          const timestamp = e.target.getAttribute('data-timestamp');
          // Decode URL-encoded date (browser should do this automatically, but be safe)
          if (date) {
            date = decodeURIComponent(date.replace(/\+/g, ' '));
          }
          this.deleteScore({ playerName, course, date, timestamp });
        }
      });
    });
  },

  loadScoreIntoForm: function(score) {
    // Set player name
    const playerInput = document.getElementById('player-name');
    if (playerInput) playerInput.value = score.playerName;
    
    // Set handicap
    const handicapInput = document.getElementById('handicap');
    if (handicapInput) handicapInput.value = score.handicap;
    
    // Set course
    this.currentCourse = score.course;
    const courseSelect = document.getElementById('course-select');
    if (courseSelect) {
      courseSelect.value = score.course;
      this.updateCourseData();
    }
    
    // Set hole scores
    for (let i = 0; i < 18; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      if (input && score.holes[i] !== '' && score.holes[i] !== null) {
        input.value = score.holes[i];
      } else if (input) {
        input.value = '';
      }
    }
    
    // Recalculate scores
    this.calculateScores();
    
    // Scroll to top of form
    document.getElementById('scorecard-form')?.scrollIntoView({ behavior: 'smooth' });
  },

  deleteScore: function(data) {
    ApiClient.post('deleteScore', data)
      .then(result => {
        alert('Score deleted successfully');
        this.loadSavedScores();
      })
      .catch(error => {
        alert('Error deleting score: ' + error.message);
      });
  },

  savedScores: []
};
