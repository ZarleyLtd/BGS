// Scorecard Page - Golf Scorecard Calculator
// Calculates Stableford points based on handicap and stroke inputs

// Scorecard Page - Golf Scorecard Calculator
// Calculates Stableford points based on handicap and stroke inputs

const ScorecardPage = {
  // Course data - pars and stroke indexes
  // Will be loaded from Google Sheet, fallback to hardcoded data if sheet fails
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

  /** When an existing score is loaded (loadScoreIntoForm), store it here for "Already recorded" check and delete. */
  _loadedExistingScore: null,

  // Track the last name we applied/loaded so we can clear the card when the user changes it.
  _lastPlayerNameKey: '',

  init: async function() {
    const scorecardForm = document.getElementById('scorecard-form');
    if (!scorecardForm) {
      return;
    }

    // Load courses from Google Sheet first
    await this.loadCoursesFromSheet();

    // Try to set default course based on next outing
    await this.setDefaultCourseFromNextOuting();

    // Load player names from Config sheet (Key="Player") for Name combobox
    await this.loadPlayersFromConfig();

    // If no default was set, try to use Millicent, or fall back to first available course
    if (!this.currentCourse) {
      const availableCourses = Object.keys(this.courses);
      if (availableCourses.length > 0) {
        // Try Millicent first if it exists
        if (this.courses['Millicent']) {
          this.currentCourse = 'Millicent';
        } else {
          // Otherwise use the first available course (sorted alphabetically)
          this.currentCourse = availableCourses.sort()[0];
          console.log(`No default course found, using first available: ${this.currentCourse}`);
        }
      }
    }

    // Populate course dropdown with the default course already set
    this.populateCourseDropdown();
    
    // Update course data and display
    this.updateCourseData();
    
    // Ensure dropdown reflects the selected course (in case populateCourseDropdown didn't set it)
    const courseSelect = document.getElementById('course-select');
    if (courseSelect && this.currentCourse) {
      // Verify the course exists in the dropdown before setting it
      if (courseSelect.querySelector(`option[value="${this.currentCourse}"]`)) {
        courseSelect.value = this.currentCourse;
        // Trigger change event to ensure any listeners are notified
        courseSelect.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.warn(`Course "${this.currentCourse}" not found in dropdown, selecting first available`);
        // Select first non-empty option
        const firstOption = courseSelect.querySelector('option:not([value=""])');
        if (firstOption) {
          this.currentCourse = firstOption.value;
          courseSelect.value = this.currentCourse;
          this.updateCourseData();
        }
      }
    }

    // Set up event listeners
    this.setupEventListeners();

    // Focus Name field when page is first presented (desktop only)
    // On touch devices, skip auto-focus so the mobile keyboard doesn't open until the user taps the field
    requestAnimationFrame(() => {
      const playerInput = document.getElementById('player-name');
      const isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      if (playerInput && !isTouchDevice) playerInput.focus();
    });

    // If user came from sidescroll with partly filled data, restore it (no submit)
    this.applyDraftFromSidescroll();
  },

  /**
   * Load courses from Google Sheet, fallback to hardcoded data if sheet fails
   */
  loadCoursesFromSheet: async function() {
    try {
      if (typeof AppConfig === 'undefined' || !AppConfig.apiUrl || typeof CoursesLoader.loadFromApi !== 'function') {
        console.warn('bgs-api not configured, using hardcoded courses');
        return;
      }

      console.log('Loading courses from bgs-api');
      const loadedCourses = await CoursesLoader.loadFromApi();
      
      if (loadedCourses && Object.keys(loadedCourses).length > 0) {
        // Replace hardcoded courses with loaded courses
        this.courses = loadedCourses;
        console.log(`Successfully loaded ${Object.keys(this.courses).length} courses from sheet`);
      } else {
        console.warn('No courses loaded from sheet, using hardcoded courses');
      }
    } catch (error) {
      console.warn('Failed to load courses from sheet, using hardcoded courses:', error);
      // Keep existing hardcoded courses as fallback
    }
  },

  /**
   * Set default course from next upcoming outing (theGolfApp / botanic outings).
   */
  setDefaultCourseFromNextOuting: async function() {
    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.warn('bgs-api not configured, using default course');
        return;
      }

      const res = await BgsData.getNextOuting();
      const outing = res.outing;
      if (!outing || !outing.courseName) {
        console.warn('No upcoming outing from API, using default course');
        return;
      }

      const possibleCourseName = outing.courseName;
      const courseKey = this.resolveCourseKeyFromPossibleName(possibleCourseName);

      if (!courseKey || !this.courses[courseKey]) {
        console.warn(
          `Course "${possibleCourseName}" not found in courses list. Available courses:`,
          Object.keys(this.courses).join(', ')
        );
        return;
      }

      this.currentCourse = courseKey;
      console.log(`Default course set to "${courseKey}" based on next outing: ${outing.courseName}`);
    } catch (error) {
      console.warn('Failed to load next outing for default course:', error);
    }
  },

  /**
   * Load player names from theGolfApp `players` (society botanic) into the Name combobox datalist.
   */
  loadPlayersFromConfig: async function() {
    try {
      if (typeof BgsData === 'undefined' || !AppConfig.apiUrl) {
        console.warn('bgs-api not configured, player list will be empty');
        return;
      }
      const res = await BgsData.getSocietyPlayers();
      const players = res.players || [];
      const names = new Set();
      players.forEach(function(p) {
        const n = (p.playerName || '').toString().trim();
        if (n) names.add(n);
      });

      const list = document.getElementById('player-datalist');
      if (!list) return;
      list.innerHTML = '';
      [...names].sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        list.appendChild(opt);
      });
      if (names.size > 0) {
        console.log(`Loaded ${names.size} player(s) from society players`);
      }
    } catch (e) {
      console.warn('Failed to load players from API:', e);
    }
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

    const courseKeysAll = Object.keys(this.courses || {});

    // Only include courses that appear in the 2026 outings list.
    // (Course is treated as the unique identifier for an outing.)
    const courseKeysFromOutings2026 = new Set();
    if (typeof OutingsConfig !== 'undefined' && Array.isArray(OutingsConfig.OUTINGS_2026)) {
      const courseKeyByNorm = {};
      for (const ck of courseKeysAll) {
        courseKeyByNorm[this.normalizeCourseKey(ck)] = ck;
      }

      OutingsConfig.OUTINGS_2026.forEach(outing => {
        if (!outing) return;

        const candidates = [];
        if (outing.courseName) candidates.push(outing.courseName);
        if (outing.clubName && typeof OutingsConfig.mapClubNameToCourseKey === 'function') {
          const mapped = OutingsConfig.mapClubNameToCourseKey(outing.clubName);
          if (mapped) candidates.push(mapped);
        }

        for (let i = 0; i < candidates.length; i++) {
          const cand = candidates[i];
          const resolved = courseKeyByNorm[this.normalizeCourseKey(cand)];
          if (resolved) courseKeysFromOutings2026.add(resolved);
        }
      });
    }

    const courseKeys =
      courseKeysFromOutings2026.size > 0 ? [...courseKeysFromOutings2026].sort() : courseKeysAll.sort();

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
    if (totalParEl) totalParEl.textContent = totPar || '0';
  },

  setupEventListeners: function() {
    // Course selection change
    const courseSelect = document.getElementById('course-select');
    if (courseSelect) {
      courseSelect.addEventListener('change', (e) => {
        this.currentCourse = e.target.value;
        if (this.currentCourse) {
          this.updateCourseData();
          this.clearInputs();
        } else {
          this._loadedExistingScore = null;
          this.updateDeleteButtonVisibility();
        }
      });
      
      // Check for existing score when course loses focus
      courseSelect.addEventListener('blur', () => {
        this.checkForExistingScore();
      });
    }

    // Handle input field changes (auto-tab and calculation); track last-focused hole for draft
    for (let i = 1; i <= 18; i++) {
      const input = document.getElementById(`hole-${i}`);
      if (input) {
        input.addEventListener('focus', () => {
          this._lastFocusedHole = i;
        });
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
      hcInput.addEventListener('input', (e) => {
        // Limit to 2 digits
        const value = e.target.value;
        if (value.length > 2) {
          e.target.value = value.slice(0, 2);
        }
        
        this.calculateScores();
        
        // Auto-tab to hole 1 when 2 digits are entered
        if (e.target.value.length >= 2) {
          const hole1Input = document.getElementById('hole-1');
          if (hole1Input) {
            hole1Input.focus();
            hole1Input.select();
          }
        }
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
      
      // Check for existing score when name loses focus
      playerInput.addEventListener('blur', () => {
        const newNameKey = this.normalizeName(playerInput.value.trim());

        // If the user changed the name (including selecting from the dropdown),
        // blank out any hole scores currently on the card before checking.
        if (newNameKey !== this._lastPlayerNameKey) {
          this._lastPlayerNameKey = newNameKey;
          this.clearInputs();
        }

        this.checkForExistingScore();
      });
    }

    // Save score button
    const saveBtn = document.getElementById('save-score-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveScore();
      });
    }

    // Delete score button (shown when an existing score is loaded)
    const deleteBtn = document.getElementById('delete-score-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteLoadedScore();
      });
    }

    // Transfer to side-scroll view: save draft and navigate
    const sidescrollLink = document.querySelector('.scorecard-view-toggle[href*="scorecard-sidescroll"]');
    if (sidescrollLink) {
      sidescrollLink.addEventListener('click', (e) => {
        e.preventDefault();
        const courseSelect = document.getElementById('course-select');
        const playerInput = document.getElementById('player-name');
        const handicapInput = document.getElementById('handicap');
        const holes = [];
        for (let i = 1; i <= 18; i++) {
          const input = document.getElementById('hole-' + i);
          holes.push(input ? (input.value || '') : '');
        }
        let focusedHole = null;
        const active = document.activeElement;
        if (active && active.id && /^hole-\d+$/.test(active.id)) {
          const n = parseInt(active.id.replace('hole-', ''), 10);
          if (n >= 1 && n <= 18) focusedHole = n;
        }
        if (focusedHole == null && this._lastFocusedHole >= 1 && this._lastFocusedHole <= 18) {
          focusedHole = this._lastFocusedHole;
        }
        const draft = {
          course: courseSelect ? courseSelect.value || '' : '',
          playerName: playerInput ? (playerInput.value || '').trim() : '',
          handicap: handicapInput ? (handicapInput.value || '').trim() : '',
          holes: holes,
          focusedHole: focusedHole
        };
        try {
          sessionStorage.setItem('bgs_scorecard_draft', JSON.stringify(draft));
        } catch (err) {}
        window.location.href = sidescrollLink.getAttribute('href') || 'scorecard-sidescroll.html';
      });
    }
  },

  updateDeleteButtonVisibility: function() {
    const btn = document.getElementById('delete-score-btn');
    if (btn) {
      btn.style.display = this._loadedExistingScore ? 'inline-flex' : 'none';
    }
  },

  deleteLoadedScore: function() {
    const score = this._loadedExistingScore;
    if (!score || !score.playerName || !score.course || !score.date) {
      this.showMessage('No score loaded to delete.', false);
      return;
    }
    const deleteBtn = document.getElementById('delete-score-btn');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting…';
    }
    const payload = {
      playerName: score.playerName,
      course: score.course,
      date: score.date,
      timestamp: score.timestamp || ''
    };
    ApiClient.post('deleteScore', payload)
      .then(() => {
        this._loadedExistingScore = null;
        this.updateDeleteButtonVisibility();
        this.clearInputs();
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete score';
        }
        this.showMessage('Score deleted.', false);
      })
      .catch((err) => {
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete score';
        }
        this.showMessage(err.message || 'Unable to delete score.', true);
      });
  },

  handleInput: function(input, holeNum) {
    // Ignore decimal point - strokes are integers only
    if (input.value.includes('.')) {
      input.value = input.value.replace(/\./g, '');
    }
    // Validate input (0-9 for strokes)
    if (input.value && (parseInt(input.value, 10) < 0 || parseInt(input.value, 10) > 9)) {
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
    
    // If on hole 18, go to Submit Score button instead of wrapping to hole 1
    if (currentHole === 18) {
      const submitBtn = document.getElementById('save-score-btn');
      if (submitBtn) {
        submitBtn.focus();
      }
      return;
    }
    
    // Focus next hole input
    const nextHole = currentHole + 1;
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

    // Update totals (use optional checks for par elements - not present on side-scroll page)
    const outScoreEl = document.getElementById('out-score');
    const outPtsEl = document.getElementById('out-points');
    const outParEl = document.getElementById('out-par');
    const inScoreEl = document.getElementById('in-score');
    const inPtsEl = document.getElementById('in-points');
    const inParEl = document.getElementById('in-par');
    const totalScoreEl = document.getElementById('total-score');
    const totalPtsEl = document.getElementById('total-points');
    const totalParEl = document.getElementById('total-par');
    const outScoreVal = OUTtotScore || '0';
    const outPtsVal = OUTtotPts || '0';
    const inScoreVal = INtotScore || '0';
    const inPtsVal = INtotPts || '0';
    const totalScoreVal = totScore || '0';
    const totalPtsVal = totPoints || '0';
    if (outScoreEl) outScoreEl.textContent = outScoreVal;
    if (outPtsEl) outPtsEl.textContent = outPtsVal;
    if (outParEl) outParEl.textContent = OUTtotPar || '0';
    if (inScoreEl) inScoreEl.textContent = inScoreVal;
    if (inPtsEl) inPtsEl.textContent = inPtsVal;
    if (inParEl) inParEl.textContent = INtotPar || '0';
    if (totalScoreEl) totalScoreEl.textContent = totalScoreVal;
    if (totalPtsEl) totalPtsEl.textContent = totalPtsVal;
    if (totalParEl) totalParEl.textContent = totPar || '0';
    // Update header labels (side-scroll page: "Holes 1-9  Strokes [x] Points [y]")
    document.querySelectorAll('.out-score-header').forEach(el => { el.textContent = outScoreVal; });
    document.querySelectorAll('.out-points-header').forEach(el => { el.textContent = outPtsVal; });
    document.querySelectorAll('.in-score-header').forEach(el => { el.textContent = inScoreVal; });
    document.querySelectorAll('.in-points-header').forEach(el => { el.textContent = inPtsVal; });
  },

  resetAllPoints: function() {
    for (let i = 1; i <= 18; i++) {
      const pointsEl = document.getElementById(`points-${i}`);
      if (pointsEl) pointsEl.textContent = '0';
    }
    
    const totals = ['out-score','out-points','out-par','in-score','in-points','in-par','total-score','total-points','total-par'];
    totals.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    document.querySelectorAll('.out-score-header, .out-points-header, .in-score-header, .in-points-header').forEach(el => { el.textContent = '0'; });
  },

  clearInputs: function() {
    this._loadedExistingScore = null;
    this.updateDeleteButtonVisibility();
    for (let i = 1; i <= 18; i++) {
      const input = document.getElementById(`hole-${i}`);
      if (input) input.value = '';
    }
    this.resetAllPoints();
  },

  // Normalize name for comparison (case-insensitive, ignore spaces)
  normalizeName: function(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '');
  },

  // Normalize course names for matching between:
  // - outing configuration values
  // - scorecard course keys (as stored in dropdown & sheet)
  normalizeCourseKey: function(courseName) {
    if (courseName == null) return '';
    return String(courseName)
      .replace(/\+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  },

  // Resolve an outing's course name to the actual key in `this.courses`.
  resolveCourseKeyFromPossibleName: function(possibleCourseName) {
    if (!possibleCourseName) return null;
    const trimmed = String(possibleCourseName).trim();
    if (!trimmed) return null;

    // Exact match first
    if (this.courses && this.courses[trimmed]) return trimmed;

    // Otherwise try normalized match (e.g. removing spaces)
    const norm = this.normalizeCourseKey(trimmed);
    if (!this.courses || !norm) return null;
    for (const k of Object.keys(this.courses)) {
      if (this.normalizeCourseKey(k) === norm) return k;
    }
    return null;
  },

  // Show subtle loading message (non-blocking, auto-dismisses)
  showLoadingMessage: function(message) {
    // Remove any existing loading message
    const existing = document.querySelector('.scorecard-loading-message');
    if (existing) {
      existing.remove();
    }

    // Find the scorecard header to position message below name field
    const header = document.querySelector('.scorecard-header');
    if (!header) {
      // Fallback to body if header not found
      console.warn('scorecard-header not found, using body');
      return;
    }

    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'scorecard-loading-message';
    loadingMsg.innerHTML = `
      <div class="spinner"></div>
      <span>${message}</span>
    `;
    header.appendChild(loadingMsg);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      loadingMsg.classList.add('fade-out');
      setTimeout(() => {
        if (loadingMsg.parentNode) {
          loadingMsg.remove();
        }
      }, 300);
    }, 3000);

    return loadingMsg;
  },

  // Hide loading message
  hideLoadingMessage: function() {
    const loadingMsg = document.querySelector('.scorecard-loading-message');
    if (loadingMsg) {
      loadingMsg.classList.add('fade-out');
      setTimeout(() => {
        if (loadingMsg.parentNode) {
          loadingMsg.remove();
        }
      }, 300);
    }
  },

  // Show user-friendly message (blocking, requires acknowledgment)
  showMessage: function(message, isError = false) {
    // Remove any existing message
    const existing = document.querySelector('.scorecard-message-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'scorecard-message-overlay';
    
    const messageBox = document.createElement('div');
    messageBox.className = 'scorecard-message';
    if (isError) {
      messageBox.style.background = '#b82e35';
    }
    
    messageBox.innerHTML = `
      <div>${message}</div>
      <button type="button" class="scorecard-message-close">OK</button>
    `;
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Close on button click
    const closeBtn = messageBox.querySelector('.scorecard-message-close');
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });

    // Close on overlay click (outside message box)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus the button for accessibility
    closeBtn.focus();
  },

  // Check for existing score when course or name changes
  checkForExistingScore: function() {
    const playerName = document.getElementById('player-name')?.value.trim();
    const courseSelect = document.getElementById('course-select');
    // Use the actual select value, not this.currentCourse which might be out of sync
    const course = courseSelect ? courseSelect.value : this.currentCourse;
    
    // Only check if both course and name are provided
    if (!playerName || !course) {
      return;
    }
    
    // Show loading message
    this.showLoadingMessage('Checking for existing score...');

    // Check for existing score:
    // keying is based on course + player only (date/time ignored).
    ApiClient.post('checkExistingScore', {
      playerName: playerName,
      course: course
    })
      .then(result => {
        this.hideLoadingMessage();
        if (result.exists && result.score) {
          // Load the existing score into the form
          this.loadScoreIntoForm(result.score);
        }
      })
      .catch(error => {
        this.hideLoadingMessage();
        // Silently fail - API might not be configured
        if (!error.message.includes('API URL not configured')) {
          console.error('Error checking for existing score:', error);
        }
      });
  },

  // Save/Load functionality
  saveScore: function() {
    const saveBtn = document.getElementById('save-score-btn');
    const playerName = document.getElementById('player-name')?.value.trim();
    const handicap = parseInt(document.getElementById('handicap')?.value) || 0;
    const course = this.currentCourse;

    if (!playerName) {
      this.showMessage('Please enter your name', false);
      return;
    }

    if (!course) {
      this.showMessage('Please select a course', false);
      return;
    }

    if (handicap === 0) {
      this.showMessage('Please enter your handicap', false);
      return;
    }

    if (!this.pars || !this.indexes) {
      this.showMessage('Please select a course', false);
      return;
    }

    const holes = [];
    const holePoints = [];
    let hasScores = false;

    const shots = [];
    for (let i = 0; i < 18; i++) {
      if (this.indexes[i] <= handicap) {
        shots[i] = Math.floor((handicap - this.indexes[i]) / 18) + 1;
      } else {
        shots[i] = Math.floor(Math.max((handicap - this.indexes[i]), 0) / 18);
      }
    }

    for (let i = 0; i < 18; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      const strokes = input && input.value ? parseInt(input.value) : 0;
      holes.push(strokes);

      let points = 0;
      if (strokes > 0) {
        const netStrokes = strokes - shots[i];
        const netVsPar = this.pars[i] - netStrokes;
        points = Math.max(netVsPar + 2, 0);
      }
      holePoints.push(points);

      if (strokes > 0) hasScores = true;
    }

    if (!hasScores) {
      if (typeof BriefMessage === 'function' && saveBtn) {
        BriefMessage('No Score entered', saveBtn);
      } else {
        this.showMessage('Please enter at least one hole score', false);
      }
      return;
    }

    // Already recorded: form matches loaded score
    if (this._loadedExistingScore) {
      const sameHc = Number(this._loadedExistingScore.handicap) === handicap;
      let sameHoles = true;

      // Historical data may store empty holes inconsistently ('' vs '0' vs 0).
      // Treat all zero-like values as blank for the "already recorded" comparison.
      const normalizeHoleForCompare = (val) => {
        if (val === '' || val === null || val === undefined) return '';
        const s = String(val).trim();
        return s === '' || s === '0' ? '' : s;
      };

      for (let i = 0; i < 18; i++) {
        const existingVal = this._loadedExistingScore.holes[i];
        const existing = normalizeHoleForCompare(existingVal);
        const current = normalizeHoleForCompare(holes[i]);
        if (current !== existing) {
          sameHoles = false;
          break;
        }
      }
      if (sameHc && sameHoles) {
        if (typeof BriefMessage === 'function' && saveBtn) {
          BriefMessage('Score already recorded', saveBtn);
        } else {
          this.showMessage('Already recorded.', false);
        }
        return;
      }
    }
    
    // Calculate totals
    let OUTtotScore = 0, INtotScore = 0;
    let OUTtotPts = 0, INtotPts = 0;
    let BACK6totScore = 0, BACK6totPts = 0;
    let BACK3totScore = 0, BACK3totPts = 0;
    
    // Calculate front 9 totals (holes 1-9, indices 0-8)
    for (let i = 0; i < 9; i++) {
      if (holes[i] > 0) {
        OUTtotScore += holes[i];
        OUTtotPts += holePoints[i];
      }
    }
    
    // Calculate back 9 totals (holes 10-18, indices 9-17)
    for (let i = 9; i < 18; i++) {
      if (holes[i] > 0) {
        INtotScore += holes[i];
        INtotPts += holePoints[i];
      }
    }
    
    // Calculate back 6 totals (holes 13-18, indices 12-17)
    for (let i = 12; i < 18; i++) {
      if (holes[i] > 0) {
        BACK6totScore += holes[i];
        BACK6totPts += holePoints[i];
      }
    }
    
    // Calculate back 3 totals (holes 16-18, indices 15-17)
    for (let i = 15; i < 18; i++) {
      if (holes[i] > 0) {
        BACK3totScore += holes[i];
        BACK3totPts += holePoints[i];
      }
    }
    
    const totalScore = OUTtotScore + INtotScore;
    const totalPoints = OUTtotPts + INtotPts;
    
    // When editing an existing score, preserve the originally recorded date.
    const date = (this._loadedExistingScore && this._loadedExistingScore.date)
      ? this._loadedExistingScore.date
      : new Date().toISOString().split('T')[0];
    
    const scoreData = {
      playerName: playerName,
      course: course,
      date: date,
      handicap: handicap,
      holes: holes,  // Strokes for each hole
      holePoints: holePoints,  // Points for each hole
      totalScore: totalScore,
      totalPoints: totalPoints,
      outScore: OUTtotScore,
      outPoints: OUTtotPts,
      inScore: INtotScore,
      inPoints: INtotPts,
      back6Score: BACK6totScore,
      back6Points: BACK6totPts,
      back3Score: BACK3totScore,
      back3Points: BACK3totPts
    };

    const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Submit Score';
    
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = 'Saving<span class="scorecard-saving-indicator"><span class="spinner"></span></span>';
    }
    
    ApiClient.post('saveScore', scoreData)
      .then(result => {
        // Restore button
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
        }

        // Update in-memory loaded score so a second submit (no changes)
        // is recognized as "already recorded".
        // Normalize empty holes to '' (backend may store blanks as '').
        const normalizedHoles = holes.map(v => (v === 0 ? '' : v));
        this._loadedExistingScore = {
          playerName: playerName,
          course: course,
          date: date,
          handicap: handicap,
          holes: normalizedHoles,
          holePoints: holePoints,
          totalScore: totalScore,
          totalPoints: totalPoints,
          outScore: OUTtotScore,
          outPoints: OUTtotPts,
          inScore: INtotScore,
          inPoints: INtotPts,
          back6Score: BACK6totScore,
          back6Points: BACK6totPts,
          back3Score: BACK3totScore,
          back3Points: BACK3totPts,
          // Preserve timestamp from previously loaded score (if any),
          // since backend update preserves date/time for that record.
          timestamp: (this._loadedExistingScore && this._loadedExistingScore.timestamp) ? this._loadedExistingScore.timestamp : ''
        };
        this.updateDeleteButtonVisibility();
        
        // Show user-friendly success message with points score
        const pointsMessage = `Your points score of ${totalPoints} was successfully recorded`;
        this.showMessage(pointsMessage, false);
      })
      .catch(error => {
        // Restore button
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
        }
        
        // Show user-friendly error message
        let errorMessage = 'Unable to save your score.';
        if (error.message) {
          // Make error messages more user-friendly
          if (error.message.includes('404')) {
            errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
          } else if (error.message.includes('Network') || error.message.includes('CORS')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = `Unable to save your score: ${error.message}`;
          }
        }
        this.showMessage(errorMessage, true);
      });
  },


  loadScoreIntoForm: function(score) {
    this._loadedExistingScore = score;
    this._lastPlayerNameKey = this.normalizeName(score && score.playerName ? score.playerName : '');
    this.updateDeleteButtonVisibility();

    const handicapInput = document.getElementById('handicap');
    if (handicapInput) handicapInput.value = score.handicap;

    for (let i = 0; i < 18; i++) {
      const input = document.getElementById(`hole-${i + 1}`);
      if (input && score.holes[i] !== '' && score.holes[i] !== null) {
        input.value = score.holes[i];
      } else if (input) {
        input.value = '';
      }
    }

    this.calculateScores();
    document.getElementById('scorecard-form')?.scrollIntoView({ behavior: 'smooth' });
  },

  /**
   * If user navigated from the other scorecard view with partly filled data, restore it.
   * Runs on both standard and side-scroll pages when bgs_scorecard_draft is in sessionStorage. Does not submit.
   */
  applyDraftFromSidescroll: function() {
    let raw;
    try {
      raw = sessionStorage.getItem('bgs_scorecard_draft');
    } catch (err) {
      return;
    }
    if (!raw) return;

    try {
      sessionStorage.removeItem('bgs_scorecard_draft');
    } catch (err) {
      // continue to apply draft
    }

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch (err) {
      return;
    }
    if (!draft || !draft.holes || draft.holes.length !== 18) return;

    const courseSelect = document.getElementById('course-select');
    if (courseSelect && draft.course) {
      courseSelect.value = draft.course;
      if (courseSelect.value === draft.course) {
        this.currentCourse = draft.course;
        this.updateCourseData();
      }
    }

    const playerInput = document.getElementById('player-name');
    if (playerInput && draft.playerName !== undefined) playerInput.value = draft.playerName;
    this._lastPlayerNameKey = this.normalizeName(draft.playerName);

    const handicapInput = document.getElementById('handicap');
    if (handicapInput && draft.handicap !== undefined) handicapInput.value = draft.handicap;

    for (let i = 0; i < 18; i++) {
      const input = document.getElementById('hole-' + (i + 1));
      if (input) {
        const v = draft.holes[i];
        input.value = (v !== undefined && v !== null && v !== '') ? String(v) : '';
      }
    }

    this.calculateScores();
    document.getElementById('scorecard-form')?.scrollIntoView({ behavior: 'smooth' });

    const holeNum = (draft.focusedHole >= 1 && draft.focusedHole <= 18) ? draft.focusedHole : null;
    const toFocus = holeNum
      ? document.getElementById('hole-' + holeNum)
      : (function() {
          const playerEl = document.getElementById('player-name');
          const handicapEl = document.getElementById('handicap');
          if (playerEl && (!draft.playerName || String(draft.playerName).trim() === '')) return playerEl;
          if (handicapEl && (!draft.handicap || String(draft.handicap).trim() === '')) return handicapEl;
          for (let i = 0; i < 18; i++) {
            const v = draft.holes[i];
            if (v === undefined || v === null || String(v).trim() === '') {
              const input = document.getElementById('hole-' + (i + 1));
              if (input) return input;
            }
          }
          return null;
        })();
    if (toFocus) {
      requestAnimationFrame(function() {
        toFocus.focus();
        if (toFocus.select) toFocus.select();
      });
    }
  },

};
