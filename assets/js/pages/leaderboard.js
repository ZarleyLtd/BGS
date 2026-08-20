const LeaderboardPage = {
  init: async function(input) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    const renderInput = input || {};
    const hasProvidedTeams =
      renderInput.teamsByOuting != null ||
      renderInput.teams != null ||
      this.teamsByOuting != null ||
      this.teams != null;
    let teamsInput =
      renderInput.teamsByOuting != null ? renderInput.teamsByOuting :
      renderInput.teams != null ? renderInput.teams :
      this.teamsByOuting != null ? this.teamsByOuting :
      this.teams != null ? this.teams : {};

    container.innerHTML = '<p class="loading">Loading leaderboard...</p>';

    try {
      // Load par/index data needed for the 18-hole detail panels.
      // If this fails, the page still renders but par/index may show '-' and P3s may be disabled.
      const courseParMap = {};
      try {
        if (typeof AppConfig !== 'undefined' && AppConfig.apiUrl && typeof CoursesLoader.loadFromApi === 'function') {
          const loadedCourses = await CoursesLoader.loadFromApi();
          if (loadedCourses && typeof loadedCourses === 'object') {
            for (const courseName of Object.keys(loadedCourses)) {
              const c = loadedCourses[courseName];
              const pars = (c && c.pars) ? c.pars : [];
              const indexes = (c && c.indexes) ? c.indexes : [];
              if (Array.isArray(pars) && Array.isArray(indexes) && pars.length === 18 && indexes.length === 18) {
                const parIndexPairs = [];
                for (let i = 0; i < 18; i++) {
                  parIndexPairs.push({ par: pars[i], index: indexes[i] });
                }
                courseParMap[this.normalizeCourseKey(String(courseName))] = {
                  pars,
                  parIndexPairs,
                  par3Indices: this.getPar3Indices(pars)
                };
              }
            }
          }
        }
      } catch (e) {
        // Non-fatal: we'll render without par/index support.
        console.warn('Leaderboard: failed to load courses/par data:', e);
      }

      const scoresRes = await ApiClient.post('loadScores', { limit: 500 });
      const scores = (scoresRes && scoresRes.scores) ? scoresRes.scores : [];

      if (!scores.length) {
        container.innerHTML = '<div class="no-scores"><p>No scores found.</p></div>';
        return;
      }

      let outings = [];
      let societyRow = null;
      let players = [];
      if (typeof BgsData !== 'undefined') {
        try {
          if (BgsData.getOutings) {
            const outRes = await BgsData.getOutings();
            outings = (outRes && outRes.outings) ? outRes.outings : [];
          }
        } catch (e) {
          console.warn('Leaderboard: getOutings failed:', e);
        }
        try {
          if (BgsData.getSociety) {
            const socRes = await BgsData.getSociety();
            societyRow = (socRes && socRes.society) ? socRes.society : null;
          }
        } catch (e) {
          console.warn('Leaderboard: getSociety failed:', e);
        }
        try {
          if (BgsData.getSocietyPlayers) {
            const plRes = await BgsData.getSocietyPlayers();
            players = (plRes && plRes.players) ? plRes.players : [];
          }
        } catch (e) {
          console.warn('Leaderboard: getSocietyPlayers failed:', e);
        }
        if (!hasProvidedTeams) {
          try {
            if (BgsData.getOutingTeams) {
              const teamRes = await BgsData.getOutingTeams();
              teamsInput = (teamRes && teamRes.teamsByOuting) ? teamRes.teamsByOuting : {};
            }
          } catch (e) {
            console.warn('Leaderboard: getOutingTeams failed:', e);
          }
        }
      }

      // Society Overall mode + visitor policy. `excludeVisitorsOverall` is gated by
      // Overall being on; if no OAP/O10 mode, no visitor filtering applies to Overall.
      const overallStatusInfo = this.parseSocietyOverallStatus(societyRow && societyRow.status);
      const overallStatus = overallStatusInfo.overallMode;
      const overallBestN = overallStatusInfo.overallBestN || 0;
      const overallExcludeVisitors =
        (overallStatus === 'OAP' || overallStatus === 'O10') &&
        overallStatusInfo.excludeVisitorsOverall;
      const isVisitorScore = this.buildIsVisitorFromPlayers(players);

      const blurredOutingKeys = {};
      const outingOrderKeys = [];
      const outingKeyToOutingId = {};
      const dbKeyOrder = {};
      if (outings.length) {
        const sorted = outings.slice().sort((a, b) => {
          const dA = new Date(this.safeString(a.date) + (a.time ? 'T' + a.time : ''));
          const dB = new Date(this.safeString(b.date) + (b.time ? 'T' + b.time : ''));
          return dA - dB;
        });
        for (let oi = 0; oi < sorted.length; oi++) {
          const o = sorted[oi];
          const k = this.outingKeyFromParts(o.courseName, o.date);
          if (!k) continue;
          outingOrderKeys.push(k);
          dbKeyOrder[k] = oi;
          if (o.outingId != null && o.outingId !== '') outingKeyToOutingId[k] = String(o.outingId);
          if (o.blurLeaderboard) blurredOutingKeys[k] = true;
        }
      }
      const isOutingBlurred = oKey => !!blurredOutingKeys[oKey];

      const scoresByOuting = {};
      const outingMeta = {};

      for (let i = 0; i < scores.length; i++) {
        const sc = scores[i];
        const course = this.safeString(sc && sc.course);
        const date = this.safeString(sc && sc.date);
        if (!course || !date) continue;

        const courseNorm = course.toLowerCase().trim();
        const dateNorm = date.trim();
        const key = `${courseNorm}|${dateNorm}`;

        if (!scoresByOuting[key]) scoresByOuting[key] = [];
        scoresByOuting[key].push(sc);

        if (!outingMeta[key]) {
          outingMeta[key] = {
            courseNameDisplay: this.displayText(course),
            outingDateStr: dateNorm
          };
        }
      }

      const outingKeysSorted = Object.keys(scoresByOuting).sort((a, b) => {
        const ia = dbKeyOrder[a];
        const ib = dbKeyOrder[b];
        if (ia !== undefined && ib !== undefined) return ia - ib;
        if (ia !== undefined) return -1;
        if (ib !== undefined) return 1;
        const [, da] = a.split('|');
        const [, db] = b.split('|');
        const dA = new Date((da || '').trim() + 'T00:00:00');
        const dB = new Date((db || '').trim() + 'T00:00:00');
        return dA - dB;
      });

      const panelParts = [];

      if (overallStatus === 'O10' || overallStatus === 'OAP') {
        const bestNSubtitle = overallBestN > 0
          ? 'Best ' + overallBestN + (overallBestN === 1 ? ' outing' : ' outings') + ' count'
          : '';
        const overallSubtitle = overallStatus === 'O10'
          ? ('1st to 10th points' + (bestNSubtitle ? ' — ' + bestNSubtitle : ' over all outings'))
          : ('Total points' + (bestNSubtitle ? ' — ' + bestNSubtitle : ' over all outings'));
        const overallInfoMessage = overallStatus === 'O10'
          ? ('Overall Leaders shows players ranked by their combined position-based points across rounds (where 1st=10 pts, 2nd=9... 10th=1).' +
            (overallBestN > 0 ? ' Only the best ' + overallBestN + ' outings count toward each player\'s total.' : '') +
            '\n\nClick on any player to see contributing rounds and scoring.' +
            (overallBestN > 0 ? ' Outings that do not count are shown with a line through the score.' : ''))
          : ('Overall Leaders shows players ranked by their combined Stableford points across rounds.' +
            (overallBestN > 0 ? ' Only the best ' + overallBestN + ' outings count toward each player\'s total.' : '') +
            '\n\nClick on any player to see contributing rounds and scoring.' +
            (overallBestN > 0 ? ' Outings that do not count are shown with a line through the score.' : ''));
        const scheduleKeys = outingOrderKeys.length ? outingOrderKeys : outingKeysSorted;
        const overallOpts = {
          outingOrderKeys: scheduleKeys,
          scoresByOuting,
          outingMeta,
          excludeVisitors: overallExcludeVisitors,
          isVisitorScore,
          overallBestN
        };
        const rankedOverallLeaders = overallStatus === 'O10'
          ? this.buildO10Overall(Object.assign({ isOutingBlurred }, overallOpts)).rankedOverallLeaders
          : this.buildOapOverall(Object.assign({ scores, isOutingBlurred }, overallOpts)).rankedOverallLeaders;

        const overallParts = [];
        overallParts.push('<div class="lb-section lb-section--overall">');
        overallParts.push('<div class="lb-section-title-row">');
        overallParts.push('<h2 class="lb-section-title">Overall Leaders</h2>');
        overallParts.push('<button type="button" class="lb-info-btn" data-info-toggle aria-label="About Overall Leaders" aria-expanded="false" aria-controls="overall-leaders-info">i</button>');
        overallParts.push('</div>');
        overallParts.push('<p class="lb-subsection-title">' + this.escapeHtml(overallSubtitle) + '</p>');
        overallParts.push('<p id="overall-leaders-info" class="lb-info-message" role="status" aria-live="polite">' + this.escapeHtml(overallInfoMessage).replace(/\n/g, '<br>') + '</p>');

        overallParts.push('<div class="lb-overall-grid">');
        overallParts.push('<div class="lb-overall-grid-header"><span>Pos</span><span>Name</span><span>Pts</span></div>');

        for (let rg = 0; rg < rankedOverallLeaders.length; rg++) {
          const group = rankedOverallLeaders[rg];
          const ord = group.label;
          for (let gx = 0; gx < group.players.length; gx++) {
            const pl = group.players[gx];
            const details = pl.orderedOutingDetails || [];
            const totalSpan = '<span class="lb-overall-total">' + this.formatNumber(pl.totalPoints) + '</span>';
            const hasDetail = details.length > 0;
            const rowClass = 'lb-overall-grid-row' + (hasDetail ? ' lb-overall-row-with-detail' : '');

            overallParts.push(
              '<div class="' + rowClass + '"' +
              (hasDetail ? ' data-overall-expand role="button" tabindex="0" aria-expanded="false"' : '') +
              '>'
            );
            overallParts.push('<span class="leaderboard-position">' + this.escapeHtml(ord) + '</span>');
            overallParts.push('<span class="leaderboard-player-name">' + this.escapeHtml(this.displayText(pl.name)) + '</span>');
            overallParts.push('<span class="text-right">' + totalSpan + '</span>');
            overallParts.push('</div>');

            if (hasDetail) {
              overallParts.push('<div class="lb-overall-row-detail" role="region" aria-label="Outings for ' + this.escapeHtml(this.displayText(pl.name)) + '">');
              overallParts.push('<ul class="lb-overall-row-detail-grid">');
              for (let di = 0; di < details.length; di++) {
                const d = details[di];
                const posStr = this.positionLabel(d.position);
                const stablefordVal = (d.stablefordPts != null ? d.stablefordPts : d.points);
                const excludedClass = d.countsTowardTotal === false ? ' lb-overall-detail-excluded' : '';
                const lineText =
                  this.escapeHtml(this.displayText(d.outingName)) + ' - ' +
                  '<span class="lb-overall-detail-score' + excludedClass + '">' +
                  this.formatNumber(stablefordVal) +
                  ' pts</span> - <span class="lb-overall-detail-pos' + excludedClass + '">' +
                  this.escapeHtml(posStr) + ' place</span>';
                overallParts.push('<li><span></span><span>' + lineText + '</span><span class="lb-overall-detail-pts-right' + excludedClass + '">' + this.formatNumber(d.points) + '</span></li>');
              }
              overallParts.push('</ul></div>');
            }
          }
        }
        overallParts.push('</div></div>');
        panelParts.push(overallParts.join(''));
      }

      // Per-outing panels: most recent first (reverse chronological)
      const outingKeysForDisplay = outingKeysSorted.slice().reverse();
      for (let oi = 0; oi < outingKeysForDisplay.length; oi++) {
        const oKey = outingKeysForDisplay[oi];
        const meta = outingMeta[oKey] || {};
        const courseNameDisplay = this.displayText(meta.courseNameDisplay || oKey.split('|')[0]);
        const outingDateStr = meta.outingDateStr || '';

        const rawScores = (scoresByOuting[oKey] || []).slice();

        // One row per player: best score if multiple entries for the outing.
        const byPlayer = {};
        for (let ri = 0; ri < rawScores.length; ri++) {
          const rs = rawScores[ri];
          const pkey = this.safeString(rs && rs.playerName).toLowerCase();
          if (!pkey) continue;
          const pts = parseFloat(rs.totalPoints) || 0;
          if (!byPlayer[pkey] || (parseFloat(byPlayer[pkey].totalPoints) || 0) < pts) byPlayer[pkey] = rs;
        }

        const outingScores = Object.keys(byPlayer).map(k => byPlayer[k]);

        // Par/index for 18-hole detail panels
        const parCourseKey = this.normalizeCourseKey(courseNameDisplay);
        const courseData = this.getCourseDataForKey(courseParMap, parCourseKey);
        const parIndexPairs = courseData ? courseData.parIndexPairs : [];
        const par3Indices = courseData ? courseData.par3Indices : [];

        const firstScoreDate = outingDateStr || (outingScores[0] && this.safeString(outingScores[0].date)) || '';
        const scoreDates = outingScores.map(s => s && s.date);
        let compsStr = this.getCompsForScores(
          outings,
          oKey.split('|')[0] || courseNameDisplay,
          outingDateStr || firstScoreDate,
          scoreDates
        );
        const blurLeaderboard = this.getBlurLeaderboardForScores(
          outings,
          oKey.split('|')[0] || courseNameDisplay,
          outingDateStr || firstScoreDate,
          scoreDates
        );
        if (!this.safeString(compsStr)) compsStr = '18:10';
        const comps = this.parseComps(compsStr);

        const topNCount = comps.topN;
        const showF9 = comps.showF9;
        const showB9 = comps.showB9;
        const showP3 = comps.showP3;
        const p3UsePoints = comps.p3UsePoints; // expected false for P3s
        const showNH = comps.showNH;
        const nhUsePoints = comps.nhUsePoints;
        const nhHoles = comps.nhHoles || [];
        const nhIndices = LeaderboardShared.nHolesIndices(nhHoles);
        const show2s = comps.show2s;
        const show66 = comps.show66;
        const showTeam = comps.showTeam;
        const teamN = comps.teamN;
        const teamRule = comps.teamRule;

        // Per-comp visitor filtering (encoding: docs/VISITOR_LEADERBOARD_ENCODING.md).
        // 18-hole top N filters its own input list; F9/B9/66/P3/2s filter at candidate
        // construction; the unfiltered `outingScores` is reused below for those comps
        // so each can apply its own flag independently.
        const outingScores18 = comps.excludeVisitors18
          ? outingScores.filter(s => !isVisitorScore(s))
          : outingScores;

        const rankedOverall = this.rankWithCountback(
          outingScores18,
          this.compareCountbackOverall.bind(this),
          Math.max(topNCount, 1),
          this.getCountbackLabelOverall.bind(this)
        );

        // Exclusion sets for F9/B9 winners
        const topNNamesF9 = {};
        for (let tnf = 0; tnf < Math.min(comps.f9ExclN, rankedOverall.length); tnf++) {
          for (let gf = 0; gf < rankedOverall[tnf].scores.length; gf++) {
            topNNamesF9[this.safeString(rankedOverall[tnf].scores[gf].playerName).toLowerCase()] = true;
          }
        }
        const topNNamesB9 = {};
        for (let tnb = 0; tnb < Math.min(comps.b9ExclN, rankedOverall.length); tnb++) {
          for (let gb = 0; gb < rankedOverall[tnb].scores.length; gb++) {
            topNNamesB9[this.safeString(rankedOverall[tnb].scores[gb].playerName).toLowerCase()] = true;
          }
        }

        // Candidates
        const f9Candidates = [];
        const b9Candidates = [];
        for (let t = 0; t < outingScores.length; t++) {
          const so = outingScores[t];
          const pkey = this.safeString(so && so.playerName).toLowerCase();
          if (!(comps.excludeVisitorsF9 && isVisitorScore(so))) {
            if (!comps.f9ExclN || !topNNamesF9[pkey]) f9Candidates.push(so);
          }
          if (!(comps.excludeVisitorsB9 && isVisitorScore(so))) {
            if (!comps.b9ExclN || !topNNamesB9[pkey]) b9Candidates.push(so);
          }
        }

        const bestOutResult = this.bestWithCountback(
          f9Candidates,
          this.compareCountbackF9.bind(this),
          this.getCountbackLabelF9.bind(this)
        );
        const bestInResult = this.bestWithCountback(
          b9Candidates,
          this.compareCountbackB9.bind(this),
          this.getCountbackLabelB9.bind(this)
        );

        // 66 candidates (best 6+6 holes) — visitors filtered per-comp.
        const outingScores66 = comps.excludeVisitors66
          ? outingScores.filter(s => !isVisitorScore(s))
          : outingScores;
        const best66Result = show66
          ? this.bestWithCountback(
              outingScores66,
              this.compareCountback66.bind(this),
              this.getCountbackLabel66.bind(this)
            )
          : { scores: [], countbackLabel: null };

        // P3s candidates (par-3 only)
        const par3Candidates = [];
        if (showP3 && par3Indices && par3Indices.length) {
          for (let q = 0; q < outingScores.length; q++) {
            const sq = outingScores[q];
            if (comps.excludeVisitorsP3 && isVisitorScore(sq)) continue;
            const holes = sq.holes || [];
            const holePoints = sq.holePoints || [];
            let par3Strokes = 0;
            let par3Points = 0;
            const labels = [];
            let hasAllPar3Scores = true;

            for (let hi = 0; hi < par3Indices.length; hi++) {
              const idx = par3Indices[hi];
              const stroke = parseInt(holes[idx], 10);
              if (!isNaN(stroke) && stroke > 0) {
                par3Strokes += stroke;
              } else {
                hasAllPar3Scores = false;
              }
              const pt = parseFloat(holePoints[idx]) || 0;
              par3Points += pt;
              labels.push(this.par3StrokeToLabel(holes[idx]));
            }

            if (hasAllPar3Scores) {
              par3Candidates.push({
                score: sq,
                par3Strokes,
                par3Points,
                labels
              });
            }
          }

          // Same sorting rule as theGolfApp
          par3Candidates.sort((a, b) => LeaderboardShared.comparePar3Candidates(a, b, p3UsePoints));
        }

        const nhCandidates = showNH && nhIndices.length
          ? LeaderboardShared.collectSelectedHolesCandidates(
              outingScores,
              nhIndices,
              comps.excludeVisitorsNH,
              isVisitorScore
            )
          : [];
        nhCandidates.sort((a, b) => LeaderboardShared.comparePar3Candidates(a, b, nhUsePoints));

        // 2s winners: all players with at least one "2"
        const twosWinners = [];
        if (show2s) {
          for (let q2 = 0; q2 < outingScores.length; q2++) {
            const sq2 = outingScores[q2];
            if (comps.excludeVisitors2s && isVisitorScore(sq2)) continue;
            const holes2 = sq2.holes || [];
            const indices2s = [];
            for (let h2 = 0; h2 < 18; h2++) {
              if (parseInt(holes2[h2], 10) === 2) indices2s.push(h2);
            }
            if (indices2s.length > 0) {
              twosWinners.push({ score: sq2, count2s: indices2s.length, indices2s });
            }
          }
        }

        let scoreByPlayer = {};
        let teamWinResult = { scores: [], countbackLabel: null };
        if (showTeam) {
          scoreByPlayer = {};
          for (let tsi = 0; tsi < outingScores.length; tsi++) {
            const teamScore = outingScores[tsi];
            const teamPlayerKey = this.safeString(teamScore && teamScore.playerName).toLowerCase();
            if (teamPlayerKey) scoreByPlayer[teamPlayerKey] = teamScore;
          }
          const outingTeams = this.getTeamsForOuting(
            teamsInput,
            oKey,
            outingKeyToOutingId[oKey],
            courseNameDisplay,
            outingDateStr
          );
          const teamScores = outingTeams.map(team =>
            LeaderboardShared.buildTeamScoreEntry(team, scoreByPlayer, teamRule, teamN)
          );
          teamWinResult = LeaderboardShared.bestWithCountback(
            teamScores,
            LeaderboardShared.compareCountbackTeam,
            LeaderboardShared.getCountbackLabelTeam
          );
        }

        const scoreCount = rawScores.length;

        // Section wrapper
        const sectionParts = [];
        sectionParts.push(
          '<div class="lb-section lb-section--outing' +
          (blurLeaderboard ? ' lb-section--blurred' : '') +
          '" data-outing-key="' + this.escapeHtml(oKey) + '">'
        );

        // Header
        const dateLine =
          outingDateStr
            ? '<span>' + this.formatDate(outingDateStr) + '</span>'
            : '<span></span>';
        const outingInfoId = 'outing-info-' + oi;
        sectionParts.push('<div class="lb-section-title-row">');
        sectionParts.push(
          '<h2 class="lb-section-title">' +
            this.escapeHtml(courseNameDisplay) +
            '<span class="lb-section-title-subline">' +
              dateLine +
              '<span class="lb-section-title-scores">' +
                scoreCount +
                ' score' +
                (scoreCount === 1 ? '' : 's') +
                ' recorded' +
              '</span>' +
            '</span>' +
          '</h2>'
        );
        sectionParts.push('<button type="button" class="lb-info-btn" data-info-toggle aria-label="About this outing section" aria-expanded="false" aria-controls="' + outingInfoId + '">i</button>');
        sectionParts.push('</div>');
        if (blurLeaderboard) {
          sectionParts.push('<p class="lb-blur-notice">Results hidden until the captain reveals them.</p>');
        }
        sectionParts.push('<div id="' + outingInfoId + '" class="lb-info-message" role="status" aria-live="polite">' + this.buildOutingInfoMessageHtml(comps) + '</div>');

        // Mobile block layout
        sectionParts.push('<div class="lb-outing-block-wrap">');
        sectionParts.push('<div class="lb-outing-header"><span>Pos</span><span>Name</span><span></span><span>Hcp</span><span style="text-align:right">Points</span></div>');

        // Overall top N rows
        const ords = [];
        const numOrdinals = Math.max(topNCount, 1);
        for (let o = 0; o < numOrdinals; o++) ords.push(this.getOrdinal(o + 1));

        for (let r = 0; r < rankedOverall.length; r++) {
          if (!ords[r]) continue;
          const group = rankedOverall[r];
          const ord = group.label;
          for (let gx = 0; gx < group.scores.length; gx++) {
            const sc = group.scores[gx];
            const detailHtml = this.buildHoleDetailHtml(sc, parIndexPairs);
            const escapedDetail = detailHtml
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escapedDetail + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(ord) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(sc.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(sc, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(sc.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(sc.totalPoints, group.countbackLabel) + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: F9
        if (showF9 && bestOutResult.scores.length > 0) {
          const f9Label = bestOutResult.scores.length > 1 ? 'F9*' : 'F9';
          for (let fo = 0; fo < bestOutResult.scores.length; fo++) {
            const bestOut = bestOutResult.scores[fo];
            const bestOutDetail = this.buildHoleDetailHtml(bestOut, parIndexPairs);
            const escaped = bestOutDetail
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escaped + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(f9Label) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(bestOut.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(bestOut, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(bestOut.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(bestOut.outPoints, bestOutResult.countbackLabel) + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: B9
        if (showB9 && bestInResult.scores.length > 0) {
          const b9Label = bestInResult.scores.length > 1 ? 'B9*' : 'B9';
          for (let bi = 0; bi < bestInResult.scores.length; bi++) {
            const bestIn = bestInResult.scores[bi];
            const bestInDetail = this.buildHoleDetailHtml(bestIn, parIndexPairs);
            const escaped = bestInDetail
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escaped + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(b9Label) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(bestIn.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(bestIn, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(bestIn.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(bestIn.inPoints, bestInResult.countbackLabel) + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: 66 (best 6+6 holes)
        if (show66 && best66Result.scores.length > 0) {
          const label66 = best66Result.scores.length > 1 ? '66*' : '66';
          for (let s66 = 0; s66 < best66Result.scores.length; s66++) {
            const sc66 = best66Result.scores[s66];
            const detail66 = this.buildHoleDetailHtml(sc66, parIndexPairs, null, this.indices66(sc66));
            const escaped66 = detail66
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escaped66 + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(label66) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(sc66.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(sc66, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(sc66.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(this.points66(sc66), best66Result.countbackLabel) + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: P3s (strokes-based)
        if (showP3 && par3Candidates.length > 0) {
          const best = par3Candidates[0];
          const bestVal = p3UsePoints ? best.par3Points : best.par3Strokes;
          const bestHcp = parseFloat(best.score.handicap) || 0;
          const tied = par3Candidates.filter(c => {
            const cv = p3UsePoints ? c.par3Points : c.par3Strokes;
            return cv === bestVal && (parseFloat(c.score.handicap) || 0) === bestHcp;
          });

          const posLabel = tied.length > 1 ? 'P3*' : 'P3';
          const p3Suffix = p3UsePoints ? ' pts' : ' strokes';

          for (let ti = 0; ti < tied.length; ti++) {
            const tc = tied[ti];
            const tcVal = p3UsePoints ? tc.par3Points : tc.par3Strokes;
            const p3Detail = this.buildHoleDetailHtml(tc.score, parIndexPairs, par3Indices, undefined, p3UsePoints);
            const p3Esc = p3Detail
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + p3Esc + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(posLabel) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(tc.score.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(tc.score, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(tc.score.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatNumber(tcVal) + p3Suffix + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: selected N holes.
        if (showNH && nhCandidates.length > 0) {
          const bestNH = nhCandidates[0];
          const bestNHValue = nhUsePoints ? bestNH.par3Points : bestNH.par3Strokes;
          const bestNHHcp = parseFloat(bestNH.score.handicap) || 0;
          const tiedNH = nhCandidates.filter(candidate => {
            const value = nhUsePoints ? candidate.par3Points : candidate.par3Strokes;
            return value === bestNHValue && (parseFloat(candidate.score.handicap) || 0) === bestNHHcp;
          });
          const nhBaseLabel = LeaderboardShared.nHolesLabel(nhHoles.length);
          const nhLabel = tiedNH.length > 1 ? nhBaseLabel + '*' : nhBaseLabel;
          const nhSuffix = nhUsePoints ? ' pts' : ' strokes';

          for (let nhi = 0; nhi < tiedNH.length; nhi++) {
            const candidate = tiedNH[nhi];
            const value = nhUsePoints ? candidate.par3Points : candidate.par3Strokes;
            const detail = this.buildHoleDetailHtml(candidate.score, parIndexPairs, nhIndices, undefined, nhUsePoints);
            const escapedDetail = this.escapeDetailHtmlForAttribute(detail);

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escapedDetail + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(nhLabel) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(candidate.score.playerName)) + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(candidate.score, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(candidate.score.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatNumber(value) + nhSuffix + '</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        // Extra winners: 2s (all players with at least one two)
        if (show2s && twosWinners.length > 0) {
          const posLabel2s = twosWinners.length > 1 ? '2s*' : '2s';
          for (let t2i = 0; t2i < twosWinners.length; t2i++) {
            const tw = twosWinners[t2i];
            const name2s = this.escapeHtml(this.displayText(tw.score.playerName || ''));
            const displayName = (tw.count2s > 1) ? name2s + ' <span class="lb-twos-count">(x' + tw.count2s + ')</span>' : name2s;

            const twosDetail = this.buildHoleDetailHtml(tw.score, parIndexPairs, null, undefined, undefined, tw.indices2s);
            const twosEsc = twosDetail
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + twosEsc + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(posLabel2s) + '</span>');
            sectionParts.push('<span class="lb-cell-name">' + displayName + '</span>');
            sectionParts.push(this.buildPhotoCellHtml(tw.score, 'span', 'lb-cell-photo'));
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(tw.score.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">—</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        if (showTeam) {
          const teamLabel = LeaderboardShared.formatTeamCompMnemonicForLeaderboard(teamRule);
          const winningTeams = teamWinResult.scores || [];
          const teamPositionLabel = winningTeams.length > 1 ? teamLabel + '*' : teamLabel;
          if (winningTeams.length === 0) {
            const emptyDetail = '<div class="lb-team-detail"><p class="lb-team-detail-title">No players in team.</p></div>';
            sectionParts.push('<div class="lb-outing-block">');
            sectionParts.push('<div class="lb-outing-main lb-outing-row lb-outing-main--team" data-detail-html="' + this.escapeDetailHtmlForAttribute(emptyDetail) + '">');
            sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(teamLabel) + '</span>');
            sectionParts.push('<span class="lb-cell-name lb-cell-name--team-lb">' + LeaderboardShared.formatTeamDisplayNameHtml('', []) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">—</span>');
            sectionParts.push('</div><div class="lb-hole-detail-panel"></div></div>');
          } else {
            for (let twi = 0; twi < winningTeams.length; twi++) {
              const team = winningTeams[twi];
              const teamPlayers = team.playerNames || [];
              const teamDetail = teamPlayers.length
                ? LeaderboardShared.buildTeamHoleDetailHtml(teamPlayers, scoreByPlayer, parIndexPairs, teamRule, teamN)
                : '<div class="lb-team-detail"><p class="lb-team-detail-title">No players in team.</p></div>';
              sectionParts.push('<div class="lb-outing-block">');
              sectionParts.push('<div class="lb-outing-main lb-outing-row lb-outing-main--team" data-detail-html="' + this.escapeDetailHtmlForAttribute(teamDetail) + '">');
              sectionParts.push('<span class="lb-cell-pos">' + this.escapeHtml(teamPositionLabel) + '</span>');
              sectionParts.push('<span class="lb-cell-name lb-cell-name--team-lb">' + LeaderboardShared.formatTeamDisplayNameHtml(team.teamName, teamPlayers) + '</span>');
              sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(team.score, teamWinResult.countbackLabel) + '</span>');
              sectionParts.push('</div><div class="lb-hole-detail-panel"></div></div>');
            }
          }
        }

        sectionParts.push('</div>'); // close lb-outing-block-wrap

        // Desktop table layout
        sectionParts.push('<div class="lb-table-scroll-wrap"><table class="leaderboard-table leaderboard-table--outing">');
        sectionParts.push('<thead><tr><th>Pos</th><th>Name</th><th></th><th class="text-center">Hcp</th><th class="text-right">Points</th></tr></thead><tbody>');

        // Re-render the same content in table form
        for (let r = 0; r < rankedOverall.length; r++) {
          if (!ords[r]) continue;
          const group = rankedOverall[r];
          const ord = group.label;
          for (let gx = 0; gx < group.scores.length; gx++) {
            const sc = group.scores[gx];
            const detailHtml = this.buildHoleDetailHtml(sc, parIndexPairs);
            const escapedForAttr = detailHtml
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + escapedForAttr + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(ord) + '</td>');
            sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(sc.playerName)) + '</td>');
            sectionParts.push(this.buildPhotoCellHtml(sc, 'td', 'lb-photo-cell'));
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(sc.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(sc.totalPoints, group.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detailHtml + '</td></tr>');
          }
        }

        if (showF9 && bestOutResult.scores.length > 0) {
          const f9TableLabel = bestOutResult.scores.length > 1 ? 'F9*' : 'F9';
          for (let fo = 0; fo < bestOutResult.scores.length; fo++) {
            const bestOut = bestOutResult.scores[fo];
            const detailHtml = this.buildHoleDetailHtml(bestOut, parIndexPairs);
            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + detailHtml.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(f9TableLabel) + '</td>');
            sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(bestOut.playerName)) + '</td>');
            sectionParts.push(this.buildPhotoCellHtml(bestOut, 'td', 'lb-photo-cell'));
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(bestOut.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(bestOut.outPoints, bestOutResult.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detailHtml + '</td></tr>');
          }
        }

        if (showB9 && bestInResult.scores.length > 0) {
          const b9TableLabel = bestInResult.scores.length > 1 ? 'B9*' : 'B9';
          for (let bi = 0; bi < bestInResult.scores.length; bi++) {
            const bestIn = bestInResult.scores[bi];
            const detailHtml = this.buildHoleDetailHtml(bestIn, parIndexPairs);
            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + detailHtml.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(b9TableLabel) + '</td>');
            sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(bestIn.playerName)) + '</td>');
            sectionParts.push(this.buildPhotoCellHtml(bestIn, 'td', 'lb-photo-cell'));
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(bestIn.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(bestIn.inPoints, bestInResult.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detailHtml + '</td></tr>');
          }
        }

        if (show66 && best66Result.scores.length > 0) {
          const tableLabel66 = best66Result.scores.length > 1 ? '66*' : '66';
          for (let s66 = 0; s66 < best66Result.scores.length; s66++) {
            const sc66 = best66Result.scores[s66];
            const detailHtml = this.buildHoleDetailHtml(sc66, parIndexPairs, null, this.indices66(sc66));
            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + detailHtml.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(tableLabel66) + '</td>');
            sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(sc66.playerName)) + '</td>');
            sectionParts.push(this.buildPhotoCellHtml(sc66, 'td', 'lb-photo-cell'));
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(sc66.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(this.points66(sc66), best66Result.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detailHtml + '</td></tr>');
          }
        }

        if (showP3) {
          if (par3Candidates.length === 0 && par3Indices.length === 0) {
            // Mirror theGolfApp table fallback message.
            sectionParts.push('<tr>');
            sectionParts.push('<td class="leaderboard-position">P3</td>');
            sectionParts.push('<td colspan="4" class="lb-par3-detail">Par-3 data not available for this course.</td>');
            sectionParts.push('</tr>');
          } else if (par3Candidates.length > 0) {
            const best = par3Candidates[0];
            const bestVal = p3UsePoints ? best.par3Points : best.par3Strokes;
            const bestHcp = parseFloat(best.score.handicap) || 0;
            const tied = par3Candidates.filter(c => {
              const cv = p3UsePoints ? c.par3Points : c.par3Strokes;
              return cv === bestVal && (parseFloat(c.score.handicap) || 0) === bestHcp;
            });

            const posLabelP3 = tied.length > 1 ? 'P3*' : 'P3';
            const p3TableSuffix = p3UsePoints ? ' pts' : ' strokes';

            for (let ti = 0; ti < tied.length; ti++) {
              const tc = tied[ti];
              const tcVal = p3UsePoints ? tc.par3Points : tc.par3Strokes;
              const detailHtml = this.buildHoleDetailHtml(tc.score, parIndexPairs, par3Indices, undefined, p3UsePoints);
              sectionParts.push('<tr class="lb-outing-row">');
              sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(posLabelP3) + '</td>');
              sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(tc.score.playerName)) + '</td>');
              sectionParts.push(this.buildPhotoCellHtml(tc.score, 'td', 'lb-photo-cell'));
              sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(tc.score.handicap) + '</td>');
              sectionParts.push('<td class="text-right leaderboard-points">' + this.formatNumber(tcVal) + p3TableSuffix + '</td>');
              sectionParts.push('</tr>');
              sectionParts.push('<tr class="lb-detail-row"><td colspan="5">' + detailHtml + '</td></tr>');
            }
          }
        }

        if (showNH) {
          if (nhIndices.length === 0) {
            sectionParts.push('<tr>');
            sectionParts.push('<td class="leaderboard-position">NH</td>');
            sectionParts.push('<td colspan="4" class="lb-par3-detail">N-holes data not available for this outing.</td>');
            sectionParts.push('</tr>');
          } else if (nhCandidates.length > 0) {
            const bestNH = nhCandidates[0];
            const bestNHValue = nhUsePoints ? bestNH.par3Points : bestNH.par3Strokes;
            const bestNHHcp = parseFloat(bestNH.score.handicap) || 0;
            const tiedNH = nhCandidates.filter(candidate => {
              const value = nhUsePoints ? candidate.par3Points : candidate.par3Strokes;
              return value === bestNHValue && (parseFloat(candidate.score.handicap) || 0) === bestNHHcp;
            });
            const nhBaseLabel = LeaderboardShared.nHolesLabel(nhHoles.length);
            const nhLabel = tiedNH.length > 1 ? nhBaseLabel + '*' : nhBaseLabel;
            const nhSuffix = nhUsePoints ? ' pts' : ' strokes';
            for (let nhti = 0; nhti < tiedNH.length; nhti++) {
              const candidate = tiedNH[nhti];
              const value = nhUsePoints ? candidate.par3Points : candidate.par3Strokes;
              const detail = this.buildHoleDetailHtml(candidate.score, parIndexPairs, nhIndices, undefined, nhUsePoints);
              sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + this.escapeDetailHtmlForAttribute(detail) + '">');
              sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(nhLabel) + '</td>');
              sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(candidate.score.playerName)) + '</td>');
              sectionParts.push(this.buildPhotoCellHtml(candidate.score, 'td', 'lb-photo-cell'));
              sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(candidate.score.handicap) + '</td>');
              sectionParts.push('<td class="text-right leaderboard-points">' + this.formatNumber(value) + nhSuffix + '</td>');
              sectionParts.push('</tr>');
              sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detail + '</td></tr>');
            }
          }
        }

        if (show2s && twosWinners.length > 0) {
          const tableLabel2s = twosWinners.length > 1 ? '2s*' : '2s';
          for (let t2t = 0; t2t < twosWinners.length; t2t++) {
            const twt = twosWinners[t2t];
            const name2sTable = this.escapeHtml(this.displayText(twt.score.playerName || ''));
            const displayName = (twt.count2s > 1)
              ? name2sTable + ' <span class="lb-twos-count">(x' + twt.count2s + ')</span>'
              : name2sTable;
            const twosDetailTable = this.buildHoleDetailHtml(twt.score, parIndexPairs, null, undefined, undefined, twt.indices2s);

            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + twosDetailTable.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(tableLabel2s) + '</td>');
            sectionParts.push('<td class="leaderboard-player-name lb-name-cell">' + displayName + '</td>');
            sectionParts.push(this.buildPhotoCellHtml(twt.score, 'td', 'lb-photo-cell'));
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(twt.score.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">—</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + twosDetailTable + '</td></tr>');
          }
        }

        if (showTeam) {
          const teamLabel = LeaderboardShared.formatTeamCompMnemonicForLeaderboard(teamRule);
          const winningTeams = teamWinResult.scores || [];
          const teamPositionLabel = winningTeams.length > 1 ? teamLabel + '*' : teamLabel;
          if (winningTeams.length === 0) {
            const emptyDetail = '<div class="lb-team-detail"><p class="lb-team-detail-title">No players in team.</p></div>';
            sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + this.escapeDetailHtmlForAttribute(emptyDetail) + '">');
            sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(teamLabel) + '</td>');
            sectionParts.push('<td colspan="3" class="leaderboard-player-name lb-name-cell lb-name-cell--team-lb">' + LeaderboardShared.formatTeamDisplayNameHtml('', []) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">—</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + emptyDetail + '</td></tr>');
          } else {
            for (let twt = 0; twt < winningTeams.length; twt++) {
              const team = winningTeams[twt];
              const teamPlayers = team.playerNames || [];
              const detail = teamPlayers.length
                ? LeaderboardShared.buildTeamHoleDetailHtml(teamPlayers, scoreByPlayer, parIndexPairs, teamRule, teamN)
                : '<div class="lb-team-detail"><p class="lb-team-detail-title">No players in team.</p></div>';
              sectionParts.push('<tr class="lb-outing-row" data-detail-html="' + this.escapeDetailHtmlForAttribute(detail) + '">');
              sectionParts.push('<td class="leaderboard-position">' + this.escapeHtml(teamPositionLabel) + '</td>');
              sectionParts.push('<td colspan="3" class="leaderboard-player-name lb-name-cell lb-name-cell--team-lb">' + LeaderboardShared.formatTeamDisplayNameHtml(team.teamName, teamPlayers) + '</td>');
              sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(team.score, teamWinResult.countbackLabel) + '</td>');
              sectionParts.push('</tr>');
              sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detail + '</td></tr>');
            }
          }
        }

        sectionParts.push('</tbody></table></div>');

        const visitorScores = outingScores.filter(s => isVisitorScore(s));
        if (visitorScores.length > 0) {
          const rankedVisitors = this.rankWithCountback(
            visitorScores,
            this.compareCountbackOverall.bind(this),
            Math.max(topNCount, 1),
            this.getCountbackLabelOverall.bind(this)
          );
          this.appendVisitorsOutingSection(sectionParts, rankedVisitors, ords, parIndexPairs);
        }

        sectionParts.push('</div>'); // lb-section

        panelParts.push(sectionParts.join(''));
      }

      if (!panelParts.length) {
        container.innerHTML = '<div class="no-scores"><p>No leaderboard data found.</p></div>';
        return;
      }

      container.innerHTML =
        '<div class="lb-carousel-track">' +
        panelParts.map(function(panelHtml) {
          return '<div class="lb-carousel-panel">' + panelHtml + '</div>';
        }).join('') +
        '</div>';

      this.setupCircularCarousel(container);

      // --- Interactions (match theGolfApp) ---
      container.querySelectorAll('.lb-carousel-panel:not(.lb-carousel-panel--clone) .lb-outing-row').forEach(row => {
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-expanded', 'false');
      });

      const toggleOverallDetail = overallRow => {
        const myDetail = overallRow && overallRow.nextElementSibling;
        const section = overallRow && overallRow.closest && overallRow.closest('.lb-section--overall');
        if (section) {
          const allOpen = section.querySelectorAll('.lb-overall-row-detail.is-open');
          for (let i = 0; i < allOpen.length; i++) {
            if (allOpen[i] !== myDetail) {
              allOpen[i].classList.remove('is-open');
              const prev = allOpen[i].previousElementSibling;
              if (prev) {
                prev.classList.remove('is-expanded');
                prev.setAttribute('aria-expanded', 'false');
              }
            }
          }
        }
        if (myDetail && myDetail.classList && myDetail.classList.contains('lb-overall-row-detail')) {
          const isOpen = myDetail.classList.toggle('is-open');
          overallRow.classList.toggle('is-expanded', isOpen);
          overallRow.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
      };

      container.addEventListener('click', e => {
        // Scorecard photo thumbnail → open view-only lightbox (and don't toggle the row)
        const thumb = e.target && e.target.closest && e.target.closest('.lb-scorecard-thumb');
        if (thumb) {
          e.stopPropagation();
          if (typeof ImageLightbox !== 'undefined') ImageLightbox.open(thumb.src);
          return;
        }

        const infoMessage = e.target && e.target.closest && e.target.closest('.lb-info-message');
        if (infoMessage) {
          infoMessage.classList.remove('is-open');
          const infoSection = infoMessage.closest('.lb-section');
          const closeButton = infoSection ? infoSection.querySelector('[data-info-toggle]') : null;
          if (closeButton) closeButton.setAttribute('aria-expanded', 'false');
          return;
        }

        const infoButton = e.target && e.target.closest && e.target.closest('[data-info-toggle]');
        if (infoButton) {
          const section = infoButton.closest('.lb-section');
          const controlledId = infoButton.getAttribute('aria-controls');
          const infoElement = controlledId && section
            ? section.querySelector('#' + controlledId)
            : section && section.querySelector('.lb-info-message');
          if (infoElement) {
            const isOpen = infoElement.classList.toggle('is-open');
            infoButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          }
          return;
        }

        const overallRow = e.target && e.target.closest && e.target.closest('.lb-overall-row-with-detail');
        if (overallRow) {
          toggleOverallDetail(overallRow);
          return;
        }

        const vw = window.innerWidth;
        const usePanel = vw <= 599;

        const row = e.target && e.target.closest && e.target.closest('tr.lb-outing-row');
        const blockRow = e.target && e.target.closest && e.target.closest('.lb-outing-main.lb-outing-row');
        const detailRow = e.target && e.target.closest && e.target.closest('tr.lb-detail-row');

        if (usePanel && blockRow) {
          const block = blockRow.closest('.lb-outing-block');
          const panel = block ? block.querySelector('.lb-hole-detail-panel') : null;

          if (blockRow.classList.contains('is-open')) {
            blockRow.classList.remove('is-open');
            blockRow.setAttribute('aria-expanded', 'false');
            if (panel) panel.classList.remove('is-visible');
            return;
          }

          const allPanels = container.querySelectorAll('.lb-hole-detail-panel');
          for (let p = 0; p < allPanels.length; p++) allPanels[p].classList.remove('is-visible');
          const openBlocks = container.querySelectorAll('.lb-outing-main.is-open');
          for (let o = 0; o < openBlocks.length; o++) {
            openBlocks[o].classList.remove('is-open');
            openBlocks[o].setAttribute('aria-expanded', 'false');
          }

          const htmlAttr = blockRow.getAttribute('data-detail-html');
          if (htmlAttr && panel) {
            const decoded = htmlAttr
              .replace(/&quot;/g, '"')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            panel.innerHTML = decoded;
            panel.classList.add('is-visible');
            blockRow.classList.add('is-open');
            blockRow.setAttribute('aria-expanded', 'true');
          }
          return;
        }

        if (detailRow && detailRow.classList && detailRow.classList.contains('is-open')) {
          const prevRow = detailRow.previousElementSibling;
          if (prevRow && prevRow.classList) {
            prevRow.classList.remove('is-open');
            prevRow.setAttribute('aria-expanded', 'false');
          }
          detailRow.classList.remove('is-open');
          return;
        }

        if (!row) return;

        const next = row.nextElementSibling;
        if (!usePanel) {
          if (next && next.classList && next.classList.contains('lb-detail-row')) {
            const isOpen = next.classList.contains('is-open');
            if (row.closest('table')) {
              const open = row.closest('table').querySelectorAll('tr.lb-detail-row.is-open');
              for (let i = 0; i < open.length; i++) {
                open[i].classList.remove('is-open');
                const previousRow = open[i].previousElementSibling;
                if (previousRow) {
                  previousRow.classList.remove('is-open');
                  previousRow.setAttribute('aria-expanded', 'false');
                }
              }
            }
            if (!isOpen) {
              next.classList.add('is-open');
              row.classList.add('is-open');
              row.setAttribute('aria-expanded', 'true');
            } else {
              row.classList.remove('is-open');
              row.setAttribute('aria-expanded', 'false');
            }
          }
        }
      });

      container.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const overallRow = e.target && e.target.closest && e.target.closest('.lb-overall-row-with-detail');
        if (overallRow) {
          e.preventDefault();
          toggleOverallDetail(overallRow);
          return;
        }
        const outingRow = e.target && e.target.closest && e.target.closest('.lb-outing-row[role="button"]');
        if (outingRow) {
          e.preventDefault();
          outingRow.click();
        }
      });
    } catch (err) {
      console.error('Leaderboard: Failed to load leaderboard:', err);
      container.innerHTML = '<div class="no-scores"><p style="color: #721c24;">Unable to load leaderboard. Check the console for details.</p></div>';
    }
  },

  /**
   * Wrap the carousel so scrolling past the last panel returns to the first
   * (and scrolling before the first returns to the last) using cloned edge panels.
   */
  setupCircularCarousel: function(container) {
    const track = container.querySelector('.lb-carousel-track');
    if (!track) return;

    const realPanels = Array.from(track.querySelectorAll('.lb-carousel-panel'));
    if (realPanels.length < 2) return;

    const cloneLast = realPanels[realPanels.length - 1].cloneNode(true);
    const cloneFirst = realPanels[0].cloneNode(true);
    const prepareClone = clone => {
      clone.classList.add('lb-carousel-panel--clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      clone.querySelectorAll('a, button, [tabindex]').forEach(element => {
        element.setAttribute('tabindex', '-1');
        if (element.tagName === 'BUTTON') element.setAttribute('disabled', '');
      });
    };
    prepareClone(cloneLast);
    prepareClone(cloneFirst);

    track.insertBefore(cloneLast, realPanels[0]);
    track.appendChild(cloneFirst);

    const allPanels = Array.from(track.querySelectorAll('.lb-carousel-panel'));
    const firstReal = allPanels[1];
    const lastReal = allPanels[realPanels.length];
    const cloneLastPanel = allPanels[0];
    const cloneFirstPanel = allPanels[allPanels.length - 1];

    let isJumping = false;
    let scrollEndTimer = null;

    const jumpToPanel = function(panel) {
      isJumping = true;
      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = panel.offsetLeft;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          container.style.scrollSnapType = '';
          container.style.scrollBehavior = '';
          isJumping = false;
        });
      });
    };

    const activePanel = function() {
      const midpoint = container.scrollLeft + container.clientWidth * 0.5;
      let best = allPanels[0];
      let bestDist = Infinity;
      for (let i = 0; i < allPanels.length; i++) {
        const p = allPanels[i];
        const center = p.offsetLeft + p.offsetWidth * 0.5;
        const dist = Math.abs(center - midpoint);
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      return best;
    };

    const handleScrollEnd = function() {
      if (isJumping) return;
      const current = activePanel();
      if (current === cloneFirstPanel) jumpToPanel(firstReal);
      else if (current === cloneLastPanel) jumpToPanel(lastReal);
    };

    const onScroll = function() {
      if (isJumping) return;
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(handleScrollEnd, 120);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    if ('onscrollend' in container) {
      container.addEventListener('scrollend', handleScrollEnd, { passive: true });
    }

    const onResize = function() {
      const current = activePanel();
      let target = firstReal;
      if (current === cloneFirstPanel || current === firstReal) target = firstReal;
      else if (current === cloneLastPanel || current === lastReal) target = lastReal;
      else if (realPanels.indexOf(current) >= 0) target = current;
      jumpToPanel(target);
    };

    window.addEventListener('resize', onResize);

    requestAnimationFrame(function() {
      jumpToPanel(firstReal);
    });
  },

  // --- Helpers (ported/adapted from theGolfApp) ---

  safeString: function(v) {
    if (v == null) return '';
    return String(v).trim();
  },

  /** Match theGolfApp `leaderboard-shared.getCompsForScores`: resolve comps string for a score batch. */
  outingKeyFromParts: function(course, date) {
    const c = this.safeString(course).toLowerCase();
    const d = this.safeString(date).trim();
    if (!c || !d) return '';
    return c + '|' + d;
  },

  getCompsForScores: LeaderboardShared.getCompsForScores,

  /** Match theGolfApp `leaderboard-shared.getBlurLeaderboardForScores`. */
  getBlurLeaderboardForScores: LeaderboardShared.getBlurLeaderboardForScores,

  // UI formatting: sometimes values arrive URL-encoded (e.g. "Corballis+Links").
  // Replace "+" with spaces for display only.
  displayText: function(v) {
    if (v == null) return '';
    return String(v).replace(/\+/g, ' ');
  },

  // Normalize course keys for robust matching between:
  // - CoursesLoader output (course names from config sheet)
  // - Score records (course names saved on scorecard)
  normalizeCourseKey: function(courseName) {
    if (courseName == null) return '';
    return String(courseName)
      .replace(/\+/g, ' ')
      .replace(/\u00A0/g, ' ')   // NBSP -> space
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');      // remove all whitespace
  },

  // Resolve a courseParMap lookup even when score course strings differ slightly
  // from Config course keys (e.g. "Corballis+Links" vs "Corballis Links", or "Corballis" vs "Corballis Links").
  getCourseDataForKey: function(courseParMap, desiredKey) {
    if (!courseParMap || typeof courseParMap !== 'object') return null;
    if (!desiredKey) return null;

    // Exact match first
    if (courseParMap[desiredKey]) return courseParMap[desiredKey];

    // Best partial match:
    // - prefer the longest key that either contains or is contained by desiredKey
    let best = null;
    let bestLen = -1;

    for (const key of Object.keys(courseParMap)) {
      if (!key) continue;
      const contains = key.includes(desiredKey) || desiredKey.includes(key);
      if (!contains) continue;
      if (key.length > bestLen) {
        best = courseParMap[key];
        bestLen = key.length;
      }
    }

    return best;
  },

  escapeHtml: function(txt) {
    const s = (txt == null) ? '' : String(txt);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeDetailHtmlForAttribute: function(html) {
    return String(html || '')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  buildOutingInfoMessageHtml: function(comps) {
    const rows = [];
    const addRow = (label, text) => {
      rows.push(
        '<div class="lb-outing-info-line"><span class="lb-outing-info-comp">' +
        this.escapeHtml(label) +
        '</span><span>' +
        this.escapeHtml(text) +
        '</span></div>'
      );
    };
    if (comps.topN > 0) addRow('18 Holes:', 'Top ' + comps.topN + ' places');
    const f9Excl = comps.f9ExclN != null ? comps.f9ExclN : 0;
    const b9Excl = comps.b9ExclN != null ? comps.b9ExclN : 0;
    if (comps.showF9) {
      addRow(
        'Front 9:',
        f9Excl === 0 ? 'Best Front 9 (stableford)' :
          f9Excl === 1 ? '18 Hole winner excluded' : 'Top ' + f9Excl + ' 18 holes places excluded'
      );
    }
    if (comps.showB9) {
      addRow(
        'Back 9:',
        b9Excl === 0 ? 'Best Back 9 (stableford)' :
          b9Excl === 1 ? '18 Hole winner excluded' : 'Top ' + b9Excl + ' 18 holes places excluded'
      );
    }
    if (comps.showP3) {
      addRow('Par 3:', 'Best ' + (comps.p3UsePoints ? 'points' : 'strokes') + ' total on par 3s');
    }
    if (comps.showNH) {
      const holes = comps.nhHoles || [];
      const label = holes.length ? LeaderboardShared.nHolesLabel(holes.length) : 'N-holes';
      addRow(
        label + ':',
        holes.length
          ? 'Best ' + (comps.nhUsePoints ? 'points' : 'strokes') + ' total on holes ' + holes.join(', ')
          : 'Selected holes not available'
      );
    }
    if (comps.show2s) addRow("Two's:", "Any gross 2's carded");
    if (comps.show66) addRow('66:', 'Best 6 holes front & back (stableford)');
    if (comps.showTeam) {
      let teamDescription;
      if (comps.teamRule === 'waltz') {
        teamDescription = 'Best score based on Waltz rules: 1 score counts, then 2, then 3, repeating';
      } else if (comps.teamRule === 'dustybin') {
        teamDescription = 'Best score based on Dusty Bin rules: 3 scores count, then 2, then 1, repeating';
      } else {
        teamDescription =
          'Top team based on best ' +
          (comps.teamRule === 'total' ? 'total' : 'hole') +
          ' (' +
          (comps.teamN || 1) +
          ((comps.teamN || 1) === 1 ? ' score counts' : ' scores count') +
          ')';
      }
      addRow('Team:', teamDescription);
    }
    return (
      '<p class="lb-outing-info-intro">This shows the results of the competitions set up for this outing as follows...</p>' +
      '<div class="lb-outing-info-lines">' + rows.join('') + '</div>' +
      '<div class="lb-outing-info-gap" aria-hidden="true"></div>' +
      '<p class="lb-outing-info-outro">Click on any line to see a full breakout of the scoring</p>'
    );
  },

  /**
   * Resolve optional frontend-only team input. Accepts a teamsByOuting map, a
   * flat teams array, or an object containing either `teamsByOuting` or `teams`.
   */
  getTeamsForOuting: function(input, outingKey, outingId, courseName, outingDate) {
    let source = input || {};
    if (source && source.teamsByOuting != null) source = source.teamsByOuting;
    else if (source && source.teams != null) source = source.teams;

    const id = outingId != null ? String(outingId) : '';
    const key = this.safeString(outingKey).toLowerCase();
    const course = this.safeString(courseName).toLowerCase();
    const date = this.safeString(outingDate);

    if (Array.isArray(source)) {
      return source.filter(team => {
        if (!team) return false;
        const teamOutingId = team.outingId != null ? String(team.outingId) : '';
        if (id && teamOutingId) return teamOutingId === id;
        const teamKey = this.safeString(team.outingKey || team.key).toLowerCase();
        if (teamKey) return teamKey === key || teamKey.indexOf(key + '|') === 0;
        const teamCourse = this.safeString(team.courseName || team.course).toLowerCase();
        const teamDate = this.safeString(team.date || team.outingDate);
        return !!(teamCourse && teamDate && teamCourse === course && teamDate === date);
      });
    }

    if (!source || typeof source !== 'object') return [];
    if (id && Array.isArray(source[id])) return source[id];
    if (Array.isArray(source[outingKey])) return source[outingKey];
    for (const sourceKey of Object.keys(source)) {
      const normalizedKey = this.safeString(sourceKey).toLowerCase();
      if ((normalizedKey === key || normalizedKey.indexOf(key + '|') === 0) && Array.isArray(source[sourceKey])) {
        return source[sourceKey];
      }
    }
    return [];
  },

  /** Visitors-only 18-hole top-N board (mobile blocks + desktop table) at bottom of an outing panel. */
  appendVisitorsOutingSection: function(parts, rankedVisitors, ords, parIndexPairs) {
    parts.push('<div class="lb-visitors-section">');
    parts.push('<h3 class="lb-subsection-title lb-subsection-title--visitors">Visitors</h3>');

    parts.push('<div class="lb-outing-block-wrap lb-outing-block-wrap--visitors">');
    parts.push('<div class="lb-outing-header lb-outing-header--visitors"><span>Pos</span><span>Name</span><span></span><span>Hcp</span><span style="text-align:right">Points</span></div>');

    for (let r = 0; r < rankedVisitors.length; r++) {
      if (!ords[r]) continue;
      const group = rankedVisitors[r];
      const ord = group.label;
      for (let gx = 0; gx < group.scores.length; gx++) {
        const sc = group.scores[gx];
        const detailHtml = this.buildHoleDetailHtml(sc, parIndexPairs);
        const escapedDetail = detailHtml
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        parts.push('<div class="lb-outing-block">');
        parts.push('<div class="lb-outing-main lb-outing-row" data-detail-html="' + escapedDetail + '">');
        parts.push('<span class="lb-cell-pos">' + this.escapeHtml(ord) + '</span>');
        parts.push('<span class="lb-cell-name">' + this.escapeHtml(this.displayText(sc.playerName)) + '</span>');
        parts.push(this.buildPhotoCellHtml(sc, 'span', 'lb-cell-photo'));
        parts.push('<span class="lb-cell-hcp">' + this.formatNumber(sc.handicap) + '</span>');
        parts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(sc.totalPoints, group.countbackLabel) + '</span>');
        parts.push('</div>');
        parts.push('<div class="lb-hole-detail-panel"></div>');
        parts.push('</div>');
      }
    }

    parts.push('</div>');

    parts.push('<div class="lb-table-scroll-wrap"><table class="leaderboard-table leaderboard-table--outing leaderboard-table--visitors">');
    parts.push('<thead><tr><th>Pos</th><th>Name</th><th></th><th class="text-center">Hcp</th><th class="text-right">Points</th></tr></thead><tbody>');

    for (let r = 0; r < rankedVisitors.length; r++) {
      if (!ords[r]) continue;
      const group = rankedVisitors[r];
      const ord = group.label;
      for (let gx = 0; gx < group.scores.length; gx++) {
        const sc = group.scores[gx];
        const detailHtml = this.buildHoleDetailHtml(sc, parIndexPairs);
        const escapedForAttr = detailHtml
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        parts.push('<tr class="lb-outing-row" data-detail-html="' + escapedForAttr + '">');
        parts.push('<td class="leaderboard-position">' + this.escapeHtml(ord) + '</td>');
        parts.push('<td class="leaderboard-player-name lb-name-cell">' + this.escapeHtml(this.displayText(sc.playerName)) + '</td>');
        parts.push(this.buildPhotoCellHtml(sc, 'td', 'lb-photo-cell'));
        parts.push('<td class="text-center leaderboard-section">' + this.formatNumber(sc.handicap) + '</td>');
        parts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(sc.totalPoints, group.countbackLabel) + '</td>');
        parts.push('</tr>');
        parts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="5">' + detailHtml + '</td></tr>');
      }
    }

    parts.push('</tbody></table></div>');
    parts.push('</div>');
  },

  /**
   * Thumbnail cell for the scorecard photo, shown to the left of the Hcp cell.
   * Renders an empty cell when the score has no attached photo, so columns stay aligned.
   * Clicks are handled by delegation in init() (opens ImageLightbox).
   */
  buildPhotoCellHtml: function(sc, tag, cssClass) {
    const url = sc && sc.imageUrl ? String(sc.imageUrl) : '';
    // No loading="lazy": the theme hides img[loading] via opacity until ImageLoader
    // marks it, which runs before these dynamically rendered rows exist.
    const inner = url
      ? '<img class="lb-scorecard-thumb" src="' + this.escapeHtml(url) + '" alt="Scorecard photo" title="View scorecard photo">'
      : '';
    return '<' + tag + ' class="' + cssClass + '">' + inner + '</' + tag + '>';
  },

  formatNumber: function(num) {
    if (num == null || num === '') return '-';
    const n = parseFloat(num);
    return isNaN(n) ? '-' : String(n);
  },

  formatDate: function(dateStr) {
    // Expecting YYYY-MM-DD from the BGS backend.
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB');
  },

  getPar3Indices: LeaderboardShared.getPar3Indices,

  /**
   * Society status: tokenize on commas/whitespace and uppercase. Recognises
   * `OAP` / `O10` (visitors excluded from Overall by default), `OAPV` / `O10V`
   * (visitors included), and a separate `V` token alongside `OAP` / `O10`
   * (also includes visitors).
   *
   * Returns `{ overallMode: '' | 'OAP' | 'O10', excludeVisitorsOverall: boolean }`.
   * `excludeVisitorsOverall` is always `false` when Overall is off (`overallMode === ''`).
   * Mirrors `LeaderboardShared.parseSocietyOverallStatus` in theGolfApp.
   */
  parseSocietyOverallStatus: LeaderboardShared.parseSocietyOverallStatus,

  /**
   * Build a `(score) => boolean` classifier from the society players list.
   * Prefers `score.playerId` over `score.playerName` (case-insensitive name fallback).
   * Mirrors `LeaderboardShared.buildIsVisitorFromPlayers` in theGolfApp.
   */
  buildIsVisitorFromPlayers: LeaderboardShared.buildIsVisitorFromPlayers,

  /**
   * Comps parser: tokens are case-insensitive and split on commas/whitespace.
   * Each per-comp `excludeVisitors*` defaults to `true`; a trailing lowercase `v`
   * on the token (after any numeric tail) clears it to `false`. Mirrors
   * `LeaderboardShared.parseComps` in theGolfApp; team tokens are tolerated
   * but BGS does not render them.
   */
  parseComps: LeaderboardShared.parseComps,

  // --- Ranking and countback (adapted from theGolfApp) ---

  sumHolePoints: LeaderboardShared.sumHolePoints,

  compareCountbackOverall: LeaderboardShared.compareCountbackOverall,

  compareCountbackF9: LeaderboardShared.compareCountbackF9,

  compareCountbackB9: LeaderboardShared.compareCountbackB9,

  /** "Best 6+6": sum of the 6 highest-point holes in F9 plus the 6 highest in B9.
   *  Tie-break uses descending hole index (later hole first), matching theGolfApp. */
  points66: LeaderboardShared.points66,

  /** Hole indices contributing to `points66`, used for detail-panel highlighting. */
  indices66: LeaderboardShared.indices66,

  compareCountback66: LeaderboardShared.compareCountback66,

  getCountbackLabelOverall: LeaderboardShared.getCountbackLabelOverall,

  getCountbackLabelF9: LeaderboardShared.getCountbackLabelF9,

  getCountbackLabelB9: LeaderboardShared.getCountbackLabelB9,

  getCountbackLabel66: LeaderboardShared.getCountbackLabel66,

  formatPointsWithCountback: LeaderboardShared.formatPointsWithCountback,

  rankWithCountback: LeaderboardShared.rankWithCountback,

  bestWithCountback: LeaderboardShared.bestWithCountback,

  rankOverallByPoints: function(players) {
    if (!players || players.length === 0) return [];
    const sorted = players.slice().sort((a, b) => {
      return (parseFloat(b.totalPoints) || 0) - (parseFloat(a.totalPoints) || 0);
    });

    const result = [];
    let runningCount = 0;
    let i = 0;
    while (i < sorted.length) {
      const group = [sorted[i]];
      const pts = parseFloat(sorted[i].totalPoints) || 0;
      while (i + 1 < sorted.length && (parseFloat(sorted[i + 1].totalPoints) || 0) === pts) {
        i++;
        group.push(sorted[i]);
      }

      const n = runningCount + 1;
      const suf =
        (n % 10 === 1 && n !== 11) ? 'st' :
        (n % 10 === 2 && n !== 12) ? 'nd' :
        (n % 10 === 3 && n !== 13) ? 'rd' : 'th';
      const ord = n + suf + (group.length > 1 ? '*' : '');

      result.push({ position: n, label: ord, players: group });
      runningCount += group.length;
      i++;
    }
    return result;
  },

  positionLabel: function(n) {
    if (n == null || n <= 0) return '—';
    const suf =
      (n % 10 === 1 && n !== 11) ? 'st' :
      (n % 10 === 2 && n !== 12) ? 'nd' :
      (n % 10 === 3 && n !== 13) ? 'rd' : 'th';
    return n + suf;
  },

  getOrdinal: function(n) {
    if (n <= 0 || n > 20) return n + 'th';
    const s = ['1st', '2nd', '3rd'];
    return (s[n - 1] || n + 'th');
  },

  par3StrokeToLabel: LeaderboardShared.par3StrokeToLabel,

  // OAP overall: sum of Stableford points across outings (best card per player per outing).
  buildOapOverall: function({ outingOrderKeys, scoresByOuting, outingMeta, scores, excludeVisitors, isVisitorScore, isOutingBlurred, overallBestN }) {
    const skipVisitor = excludeVisitors && typeof isVisitorScore === 'function';
    const skipBlurred = typeof isOutingBlurred === 'function';
    const byKeyPlayer = {};
    for (let i = 0; i < scores.length; i++) {
      const sc = scores[i];
      if (skipVisitor && isVisitorScore(sc)) continue;
      const course = this.safeString(sc && sc.course);
      const date = this.safeString(sc && sc.date);
      const name = this.safeString(sc && sc.playerName).trim();
      if (!course || !date || !name) continue;
      const key = this.outingKeyFromParts(course, date);
      if (skipBlurred && isOutingBlurred(key)) continue;
      const pkey = name.toLowerCase();
      const pts = parseFloat(sc.totalPoints) || 0;
      const id = key + '\0' + pkey;
      if (!byKeyPlayer[id] || (parseFloat(byKeyPlayer[id].sc.totalPoints) || 0) < pts) {
        byKeyPlayer[id] = { key, pkey, sc };
      }
    }

    const playerTotals = {};
    for (const id in byKeyPlayer) {
      const { key, pkey, sc } = byKeyPlayer[id];
      const pts = parseFloat(sc.totalPoints) || 0;
      if (!playerTotals[pkey]) {
        playerTotals[pkey] = {
          totalPoints: 0,
          hcp: sc.handicap,
          pointsByOuting: {},
          nameDisplay: this.safeString(sc.playerName)
        };
      }
      playerTotals[pkey].pointsByOuting[key] = pts;
    }
    for (const pk in playerTotals) {
      let sum = 0;
      const po = playerTotals[pk].pointsByOuting;
      for (const k in po) sum += parseFloat(po[k]) || 0;
      playerTotals[pk].totalPoints = sum;
    }

    const outingPositions = {};
    for (let op = 0; op < outingOrderKeys.length; op++) {
      const oKeyOp = outingOrderKeys[op];
      if (skipBlurred && isOutingBlurred(oKeyOp)) continue;
      let rawOp = scoresByOuting[oKeyOp] || [];
      if (skipVisitor) rawOp = rawOp.filter(r => !isVisitorScore(r));
      const byPlayerOp = {};
      for (let ro = 0; ro < rawOp.length; ro++) {
        const rscOp = rawOp[ro];
        const pkeyOp = this.safeString(rscOp.playerName).toLowerCase();
        if (!pkeyOp) continue;
        const rptsOp = parseFloat(rscOp.totalPoints) || 0;
        if (!byPlayerOp[pkeyOp] || (parseFloat(byPlayerOp[pkeyOp].totalPoints) || 0) < rptsOp) {
          byPlayerOp[pkeyOp] = rscOp;
        }
      }
      const sortedOp = [];
      for (const bpOp in byPlayerOp) sortedOp.push(byPlayerOp[bpOp]);
      sortedOp.sort(this.compareCountbackOverall.bind(this));
      outingPositions[oKeyOp] = {};
      let posOp = 0;
      let runOp = 0;
      while (posOp < sortedOp.length) {
        const groupOp = [sortedOp[posOp]];
        while (
          posOp + 1 < sortedOp.length &&
          this.compareCountbackOverall(sortedOp[posOp], sortedOp[posOp + 1]) === 0
        ) {
          posOp++;
          groupOp.push(sortedOp[posOp]);
        }
        const posNum = runOp + 1;
        for (let go = 0; go < groupOp.length; go++) {
          const pkOp = this.safeString(groupOp[go].playerName).toLowerCase();
          if (pkOp) {
            outingPositions[oKeyOp][pkOp] = {
              position: posNum,
              points: parseFloat(groupOp[go].totalPoints) || 0
            };
          }
        }
        runOp += groupOp.length;
        posOp++;
      }
    }

    const overallList = [];
    for (const nameKey in playerTotals) {
      const rec = playerTotals[nameKey];
      const orderedOutingDetails = [];
      for (let k = 0; k < outingOrderKeys.length; k++) {
        const oKeyK = outingOrderKeys[k];
        if (skipBlurred && isOutingBlurred(oKeyK)) continue;
        if (rec.pointsByOuting[oKeyK] == null) continue;
        const ptsK = rec.pointsByOuting[oKeyK];
        const meta = outingMeta[oKeyK] || {};
        const nm = (meta.courseNameDisplay || oKeyK.split('|')[0] || '').trim();
        const posInfo = outingPositions[oKeyK] && outingPositions[oKeyK][nameKey];
        orderedOutingDetails.push({
          outingName: this.displayText(nm),
          points: ptsK,
          position: posInfo ? posInfo.position : null,
          stablefordPts: ptsK
        });
      }
      overallList.push({
        name: rec.nameDisplay || nameKey,
        totalPoints: rec.totalPoints,
        hcp: rec.hcp,
        orderedOutingDetails
      });
    }

    LeaderboardShared.applyOverallBestOutingsToPlayers(overallList, overallBestN || 0);
    const filtered = overallList.filter(p => {
      if (skipVisitor && isVisitorScore({ playerName: p.name })) return false;
      return (parseFloat(p.totalPoints) || 0) > 0;
    });
    const rankedOverallLeaders = this.rankOverallByPoints(filtered);
    return { rankedOverallLeaders, playerTotals };
  },

  // O10 overall: 1st=10pts, 2nd=9,... 10th=1 per outing. Ties get same points.
  buildO10Overall: function({ outingOrderKeys, scoresByOuting, outingMeta, excludeVisitors, isVisitorScore, isOutingBlurred, overallBestN }) {
    const skipVisitor = excludeVisitors && typeof isVisitorScore === 'function';
    const skipBlurred = typeof isOutingBlurred === 'function';
    const pointsForPos = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const positionPointsByPlayer = {};
    const positionDetailsByPlayer = {};
    const playerTotals = {};

    // Build playerTotals for handicaps and display names (across O10 assignments).
    for (let si = 0; si < outingOrderKeys.length; si++) {
      const oKey = outingOrderKeys[si];
      let rawScores = scoresByOuting[oKey] || [];
      if (skipVisitor) rawScores = rawScores.filter(r => !isVisitorScore(r));
      const byPlayer = {};

      for (let rs = 0; rs < rawScores.length; rs++) {
        const rsc = rawScores[rs];
        const pkey = this.safeString(rsc.playerName).toLowerCase();
        if (!pkey) continue;
        if (!byPlayer[pkey] || (parseFloat(byPlayer[pkey].totalPoints) || 0) < (parseFloat(rsc.totalPoints) || 0)) byPlayer[pkey] = rsc;
      }

      const outingScores = Object.keys(byPlayer).map(k => byPlayer[k]);
      for (let k = 0; k < outingScores.length; k++) {
        const sc = outingScores[k];
        const pk = this.safeString(sc.playerName).toLowerCase();
        if (!playerTotals[pk]) {
          playerTotals[pk] = {
            totalPoints: 0,
            hcp: sc.handicap,
            pointsByOuting: {},
            nameDisplay: this.safeString(sc.playerName)
          };
        }
      }
    }

    for (let okIdx = 0; okIdx < outingOrderKeys.length; okIdx++) {
      const oKey = outingOrderKeys[okIdx];
      if (skipBlurred && isOutingBlurred(oKey)) continue;
      let rawScores = scoresByOuting[oKey] || [];
      if (skipVisitor) rawScores = rawScores.filter(r => !isVisitorScore(r));

      const byPlayer = {};
      for (let rs = 0; rs < rawScores.length; rs++) {
        const rsc = rawScores[rs];
        const pkey = this.safeString(rsc.playerName).toLowerCase();
        if (!pkey) continue;
        const rpts = parseFloat(rsc.totalPoints) || 0;
        if (!byPlayer[pkey] || (parseFloat(byPlayer[pkey].totalPoints) || 0) < rpts) byPlayer[pkey] = rsc;
      }

      const outingScores = [];
      for (const bp in byPlayer) outingScores.push(byPlayer[bp]);
      outingScores.sort(this.compareCountbackOverall.bind(this));

      let pos = 0;
      let runningCount = 0;
      while (pos < outingScores.length && runningCount < 10) {
        const group = [outingScores[pos]];
        while (pos + 1 < outingScores.length && this.compareCountbackOverall(outingScores[pos], outingScores[pos + 1]) === 0) {
          pos++;
          group.push(outingScores[pos]);
        }

        const position = runningCount + 1;
        const ptVal = (position <= 10) ? (pointsForPos[position - 1] || 0) : 0;
        for (let g = 0; g < group.length; g++) {
          const pname = this.safeString(group[g].playerName).trim();
          if (!pname) continue;
          const pk = pname.toLowerCase();
          positionPointsByPlayer[pk] = (positionPointsByPlayer[pk] || 0) + ptVal;
          if (!positionDetailsByPlayer[pk]) positionDetailsByPlayer[pk] = [];
          const meta = outingMeta[oKey] || {};
          if (playerTotals[pk] && !playerTotals[pk].nameDisplay) {
            playerTotals[pk].nameDisplay = pname;
          }
          positionDetailsByPlayer[pk].push({
            oKey,
            outingName: meta.courseNameDisplay || oKey.split('|')[0],
            points: ptVal,
            position,
            stablefordPts: parseFloat(group[g].totalPoints) || 0
          });
        }

        runningCount += group.length;
        pos += group.length;
      }
    }

    const overallList = [];
    for (const nameKey in playerTotals) {
      const rec = playerTotals[nameKey];
      const tot = positionPointsByPlayer[nameKey] || 0;
      const orderedOutingDetails = positionDetailsByPlayer[nameKey] || [];
      overallList.push({
        name: rec.nameDisplay || nameKey,
        totalPoints: tot,
        hcp: rec.hcp,
        orderedOutingDetails
      });
    }

    LeaderboardShared.applyOverallBestOutingsToPlayers(overallList, overallBestN || 0);
    const filtered = overallList.filter(p => {
      if (skipVisitor && isVisitorScore({ playerName: p.name })) return false;
      return (parseFloat(p.totalPoints) || 0) > 0;
    });
    const rankedOverallLeaders = this.rankOverallByPoints(filtered);

    return { rankedOverallLeaders, playerTotals };
  },

  // Build scrollable 18-hole detail panel HTML
  buildHoleDetailHtml: LeaderboardShared.buildHoleDetailHtml
};

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('leaderboard-container') && typeof LeaderboardPage !== 'undefined' && typeof LeaderboardPage.init === 'function') {
    LeaderboardPage.init();
  }
});

