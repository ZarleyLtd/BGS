const LeaderboardPage = {
  init: async function() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = '<p class="loading">Loading leaderboard...</p>';

    try {
      // Load par/index data needed for the 18-hole detail panels.
      // If this fails, the page still renders but par/index may show '-' and P3s may be disabled.
      const courseParMap = {};
      try {
        const coursesUrl = SheetsConfig && typeof SheetsConfig.getSheetUrl === 'function'
          ? SheetsConfig.getSheetUrl('courses')
          : null;
        if (coursesUrl) {
          const loadedCourses = await CoursesLoader.load(coursesUrl);
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

      // Load scores (scores are used as the only truth source for sorties/outings).
      const scoresRes = await ApiClient.post('loadScores', { limit: 500 });
      const scores = (scoresRes && scoresRes.scores) ? scoresRes.scores : [];

      if (!scores.length) {
        container.innerHTML = '<div class="no-scores"><p>No scores found.</p></div>';
        return;
      }

      // Force settings requested by the plan.
      const overallStatus = 'O10';
      const compsStr = '18:10,F9:3,B9:3,P3s,2s';
      const comps = this.parseComps(compsStr);

      // Derive outing order: fixed by OutingsConfig course ordering, but grouping is from score (course|date).
      const courseOrderMap = {};
      if (typeof OutingsConfig !== 'undefined' && OutingsConfig.OUTINGS_2026) {
        for (let i = 0; i < OutingsConfig.OUTINGS_2026.length; i++) {
          const oc = OutingsConfig.OUTINGS_2026[i];
          if (oc && oc.courseName) courseOrderMap[String(oc.courseName).trim().toLowerCase()] = i + 1;
        }
      }

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
        const [ca, da] = a.split('|');
        const [cb, db] = b.split('|');
        const oa = (courseOrderMap[ca] != null) ? courseOrderMap[ca] : 999;
        const ob = (courseOrderMap[cb] != null) ? courseOrderMap[cb] : 999;
        if (oa !== ob) return oa - ob;
        // date ascending
        const dA = new Date(da + 'T00:00:00');
        const dB = new Date(db + 'T00:00:00');
        return dA - dB;
      });

      // O10 overall requires positions per outing and points assignment.
      const htmlParts = [];

      if (overallStatus === 'O10') {
        const overallSubtitle = '1st to 10th points over all outings';
        const { rankedOverallLeaders, playerTotals } = this.buildO10Overall({
          overallStatus,
          comps,
          outingKeysSorted,
          scoresByOuting,
          outingMeta
        });

        htmlParts.push('<div class="lb-section lb-section--overall">');
        htmlParts.push('<h2 class="lb-section-title">Overall Leaders</h2>');
        htmlParts.push('<p class="lb-subsection-title">' + this.escapeHtml(overallSubtitle) + '</p>');

        htmlParts.push('<div class="lb-overall-grid">');
        htmlParts.push('<div class="lb-overall-grid-header"><span>Pos</span><span>Name</span><span>Total Points</span></div>');

        for (let rg = 0; rg < rankedOverallLeaders.length; rg++) {
          const group = rankedOverallLeaders[rg];
          const ord = group.label;
          for (let gx = 0; gx < group.players.length; gx++) {
            const pl = group.players[gx];
            const details = pl.orderedOutingDetails || [];
            const totalSpan = '<span class="lb-overall-total">' + this.formatNumber(pl.totalPoints) + '</span>';
            const hasDetail = details.length > 0;
            const rowClass = 'lb-overall-grid-row' + (hasDetail ? ' lb-overall-row-with-detail' : '');

            htmlParts.push(
              '<div class="' + rowClass + '"' +
              (hasDetail ? ' data-overall-expand role="button" tabindex="0" aria-expanded="false"' : '') +
              '>'
            );
            htmlParts.push('<span class="leaderboard-position">' + this.escapeHtml(ord) + '</span>');
            htmlParts.push('<span class="leaderboard-player-name">' + this.escapeHtml(this.displayText(pl.name)) + '</span>');
            htmlParts.push('<span class="text-right">' + totalSpan + '</span>');
            htmlParts.push('</div>');

            if (hasDetail) {
              htmlParts.push('<div class="lb-overall-row-detail" role="region" aria-label="Outings for ' + this.escapeHtml(this.displayText(pl.name)) + '">');
              htmlParts.push('<ul class="lb-overall-row-detail-grid">');
              for (let di = 0; di < details.length; di++) {
                const d = details[di];
                const posStr = this.positionLabel(d.position);
                const stablefordVal = (d.stablefordPts != null ? d.stablefordPts : d.points);
                const lineText =
                  this.escapeHtml(this.displayText(d.outingName)) + ' - ' +
                  this.formatNumber(stablefordVal) +
                  ' pts - <span class="lb-overall-detail-pos">' +
                  this.escapeHtml(posStr) + ' place</span>';
                htmlParts.push('<li><span></span><span>' + lineText + '</span><span class="lb-overall-detail-pts-right">' + this.formatNumber(d.points) + '</span></li>');
              }
              htmlParts.push('</ul></div>');
            }
          }
        }
        htmlParts.push('</div></div>');
      }

      // Per-outing sections
      for (let oi = 0; oi < outingKeysSorted.length; oi++) {
        const oKey = outingKeysSorted[oi];
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

        const topNCount = comps.topN;
        const showF9 = comps.showF9;
        const showB9 = comps.showB9;
        const showP3 = comps.showP3;
        const p3UsePoints = comps.p3UsePoints; // expected false for P3s
        const show2s = comps.show2s;

        const rankedOverall = this.rankWithCountback(
          outingScores,
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
          if (!comps.f9ExclN || !topNNamesF9[pkey]) f9Candidates.push(so);
          if (!comps.b9ExclN || !topNNamesB9[pkey]) b9Candidates.push(so);
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

        // P3s candidates (par-3 only)
        const par3Candidates = [];
        if (showP3 && par3Indices && par3Indices.length) {
          for (let q = 0; q < outingScores.length; q++) {
            const sq = outingScores[q];
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
          par3Candidates.sort((a, b) => {
            if (p3UsePoints) {
              if (a.par3Points !== b.par3Points) return b.par3Points - a.par3Points;
            } else {
              if (a.par3Strokes !== b.par3Strokes) return a.par3Strokes - b.par3Strokes;
            }
            const hcpA = parseFloat(a.score.handicap) || 0;
            const hcpB = parseFloat(b.score.handicap) || 0;
            return hcpB - hcpA;
          });
        }

        // 2s winners: all players with at least one "2"
        const twosWinners = [];
        if (show2s) {
          for (let q2 = 0; q2 < outingScores.length; q2++) {
            const sq2 = outingScores[q2];
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

        const scoreCount = rawScores.length;

        // Section wrapper
        const sectionParts = [];
        sectionParts.push('<div class="lb-section lb-section--outing" data-outing-key="' + this.escapeHtml(oKey) + '">');

        // Header
        const dateLine =
          outingDateStr
            ? '<span>' + this.formatDate(outingDateStr) + '</span>'
            : '<span></span>';
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

        // Mobile block layout
        sectionParts.push('<div class="lb-outing-block-wrap">');
        sectionParts.push('<div class="lb-outing-header"><span>Pos</span><span>Name</span><span>Hcp</span><span style="text-align:right">Points</span></div>');

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
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(bestIn.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatPointsWithCountback(bestIn.inPoints, bestInResult.countbackLabel) + '</span>');
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
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(tc.score.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">' + this.formatNumber(tcVal) + p3Suffix + '</span>');
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
            sectionParts.push('<span class="lb-cell-hcp">' + this.formatNumber(tw.score.handicap) + '</span>');
            sectionParts.push('<span class="lb-cell-pts">—</span>');
            sectionParts.push('</div>');
            sectionParts.push('<div class="lb-hole-detail-panel"></div>');
            sectionParts.push('</div>');
          }
        }

        sectionParts.push('</div>'); // close lb-outing-block-wrap

        // Desktop table layout
        sectionParts.push('<div class="lb-table-scroll-wrap"><table class="leaderboard-table leaderboard-table--outing">');
        sectionParts.push('<thead><tr><th>Pos</th><th>Name</th><th class="text-center">Hcp</th><th class="text-right">Points</th></tr></thead><tbody>');

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
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(sc.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(sc.totalPoints, group.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="4">' + detailHtml + '</td></tr>');
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
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(bestOut.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(bestOut.outPoints, bestOutResult.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="4">' + detailHtml + '</td></tr>');
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
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(bestIn.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">' + this.formatPointsWithCountback(bestIn.inPoints, bestInResult.countbackLabel) + '</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="4">' + detailHtml + '</td></tr>');
          }
        }

        if (showP3) {
          if (par3Candidates.length === 0 && par3Indices.length === 0) {
            // Mirror theGolfApp table fallback message.
            sectionParts.push('<tr>');
            sectionParts.push('<td class="leaderboard-position">P3</td>');
            sectionParts.push('<td colspan="3" class="lb-par3-detail">Par-3 data not available for this course.</td>');
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
              sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(tc.score.handicap) + '</td>');
              sectionParts.push('<td class="text-right leaderboard-points">' + this.formatNumber(tcVal) + p3TableSuffix + '</td>');
              sectionParts.push('</tr>');
              sectionParts.push('<tr class="lb-detail-row"><td colspan="4">' + detailHtml + '</td></tr>');
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
            sectionParts.push('<td class="text-center leaderboard-section">' + this.formatNumber(twt.score.handicap) + '</td>');
            sectionParts.push('<td class="text-right leaderboard-points">—</td>');
            sectionParts.push('</tr>');
            sectionParts.push('<tr class="lb-detail-row lb-detail-row--table"><td colspan="4">' + twosDetailTable + '</td></tr>');
          }
        }

        sectionParts.push('</tbody></table></div>');
        sectionParts.push('</div>'); // lb-section

        htmlParts.push(sectionParts.join(''));
      }

      container.innerHTML = htmlParts.join('');

      // --- Interactions (match theGolfApp) ---
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
            if (panel) panel.classList.remove('is-visible');
            return;
          }

          const allPanels = container.querySelectorAll('.lb-hole-detail-panel');
          for (let p = 0; p < allPanels.length; p++) allPanels[p].classList.remove('is-visible');
          const openBlocks = container.querySelectorAll('.lb-outing-main.is-open');
          for (let o = 0; o < openBlocks.length; o++) openBlocks[o].classList.remove('is-open');

          const htmlAttr = blockRow.getAttribute('data-detail-html');
          if (htmlAttr && panel) {
            const decoded = htmlAttr
              .replace(/&quot;/g, '"')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            panel.innerHTML = decoded;
            panel.classList.add('is-visible');
            blockRow.classList.add('is-open');
          }
          return;
        }

        if (detailRow && detailRow.classList && detailRow.classList.contains('is-open')) {
          const prevRow = detailRow.previousElementSibling;
          if (prevRow && prevRow.classList) prevRow.classList.remove('is-open');
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
              for (let i = 0; i < open.length; i++) open[i].classList.remove('is-open');
            }
            if (!isOpen) {
              next.classList.add('is-open');
              row.classList.add('is-open');
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
        }
      });
    } catch (err) {
      console.error('Leaderboard: Failed to load leaderboard:', err);
      container.innerHTML = '<div class="no-scores"><p style="color: #721c24;">Unable to load leaderboard. Check the console for details.</p></div>';
    }
  },

  // --- Helpers (ported/adapted from theGolfApp) ---

  safeString: function(v) {
    if (v == null) return '';
    return String(v).trim();
  },

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

  getPar3Indices: function(pars) {
    const out = [];
    for (let i = 0; i < pars.length; i++) {
      if (pars[i] === 3) out.push(i);
    }
    return out;
  },

  parseComps: function(compsStr) {
    // Only the subset needed for the requested comps string.
    const tokens = this.safeString(compsStr).toLowerCase().split(/[,\s]+/).filter(Boolean);
    const MAX_PLACES = 20;

    const out = {
      topN: 0,
      f9ExclN: 0,
      b9ExclN: 0,
      showF9: false,
      showB9: false,
      showP3: false,
      p3UsePoints: false,
      show2s: false
    };

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.indexOf('18:') === 0) out.topN = Math.min(MAX_PLACES, parseInt(t.slice(3), 10) || 0);
      else if (t === 'f9') { out.showF9 = true; out.f9ExclN = 0; }
      else if (t.indexOf('f9:') === 0) { out.showF9 = true; out.f9ExclN = Math.min(MAX_PLACES, parseInt(t.slice(3), 10) || 0); }
      else if (t === 'b9') { out.showB9 = true; out.b9ExclN = 0; }
      else if (t.indexOf('b9:') === 0) { out.showB9 = true; out.b9ExclN = Math.min(MAX_PLACES, parseInt(t.slice(3), 10) || 0); }
      else if (t === 'p3s') { out.showP3 = true; out.p3UsePoints = false; }
      else if (t === 'p3p') { out.showP3 = true; out.p3UsePoints = true; }
      else if (t === '2s') { out.show2s = true; }
    }

    return out;
  },

  // --- Ranking and countback (adapted from theGolfApp) ---

  sumHolePoints: function(score, indices) {
    const pts = (score && score.holePoints) ? score.holePoints : [];
    let sum = 0;
    for (let i = 0; i < indices.length; i++) {
      const p = parseFloat(pts[indices[i]]);
      if (!isNaN(p)) sum += p;
    }
    return sum;
  },

  compareCountbackOverall: function(a, b) {
    const pa = parseFloat(a.totalPoints) || 0;
    const pb = parseFloat(b.totalPoints) || 0;
    if (pa !== pb) return pb - pa;

    const ranges = [[9,10,11,12,13,14,15,16,17], [12,13,14,15,16,17], [15,16,17], [17]];
    for (let r = 0; r < ranges.length; r++) {
      const sa = this.sumHolePoints(a, ranges[r]);
      const sb = this.sumHolePoints(b, ranges[r]);
      if (sa !== sb) return sb - sa;
    }
    return 0;
  },

  compareCountbackF9: function(a, b) {
    const pa = parseFloat(a.outPoints) || 0;
    const pb = parseFloat(b.outPoints) || 0;
    if (pa !== pb) return pb - pa;

    const ranges = [[3,4,5,6,7,8], [6,7,8], [8]];
    for (let r = 0; r < ranges.length; r++) {
      const sa = this.sumHolePoints(a, ranges[r]);
      const sb = this.sumHolePoints(b, ranges[r]);
      if (sa !== sb) return sb - sa;
    }
    return 0;
  },

  compareCountbackB9: function(a, b) {
    const pa = parseFloat(a.inPoints) || 0;
    const pb = parseFloat(b.inPoints) || 0;
    if (pa !== pb) return pb - pa;

    const ranges = [[12,13,14,15,16,17], [15,16,17], [17]];
    for (let r = 0; r < ranges.length; r++) {
      const sa = this.sumHolePoints(a, ranges[r]);
      const sb = this.sumHolePoints(b, ranges[r]);
      if (sa !== sb) return sb - sa;
    }
    return 0;
  },

  getCountbackLabelOverall: function(winner, runnerUp) {
    const wPts = parseFloat(winner.totalPoints) || 0;
    const rPts = parseFloat(runnerUp.totalPoints) || 0;
    if (wPts > rPts) return null;

    const overallLabels = ['back-9', 'back-6', 'back-3', 'back-1'];
    const overallRanges = [[9,10,11,12,13,14,15,16,17], [12,13,14,15,16,17], [15,16,17], [17]];
    for (let r = 0; r < overallRanges.length; r++) {
      const sw = this.sumHolePoints(winner, overallRanges[r]);
      const sr = this.sumHolePoints(runnerUp, overallRanges[r]);
      if (sw > sr) return overallLabels[r];
    }
    return null;
  },

  getCountbackLabelF9: function(winner, runnerUp) {
    const wPts = parseFloat(winner.outPoints) || 0;
    const rPts = parseFloat(runnerUp.outPoints) || 0;
    if (wPts > rPts) return null;

    const f9Labels = ['4-9', '7-9', 'hole 9'];
    const f9Ranges = [[3,4,5,6,7,8], [6,7,8], [8]];
    for (let r = 0; r < f9Ranges.length; r++) {
      const sw = this.sumHolePoints(winner, f9Ranges[r]);
      const sr = this.sumHolePoints(runnerUp, f9Ranges[r]);
      if (sw > sr) return f9Labels[r];
    }
    return null;
  },

  getCountbackLabelB9: function(winner, runnerUp) {
    const wPts = parseFloat(winner.inPoints) || 0;
    const rPts = parseFloat(runnerUp.inPoints) || 0;
    if (wPts > rPts) return null;

    const b9Labels = ['back-6', 'back-3', 'back-1'];
    const b9Ranges = [[12,13,14,15,16,17], [15,16,17], [17]];
    for (let r = 0; r < b9Ranges.length; r++) {
      const sw = this.sumHolePoints(winner, b9Ranges[r]);
      const sr = this.sumHolePoints(runnerUp, b9Ranges[r]);
      if (sw > sr) return b9Labels[r];
    }
    return null;
  },

  formatPointsWithCountback: function(points, countbackLabel) {
    const p = this.formatNumber(points);
    if (!countbackLabel) return p;
    return '<span class="lb-countback">(' + this.escapeHtml(countbackLabel) + ')</span> ' + p;
  },

  rankWithCountback: function(scores, compareFn, maxPositions, getLabelFn) {
    if (!scores || scores.length === 0) return [];
    const sorted = scores.slice().sort(compareFn);
    const result = [];
    let runningCount = 0;
    let i = 0;
    while (result.length < maxPositions && i < sorted.length) {
      const group = [sorted[i]];
      while (i + 1 < sorted.length && compareFn(sorted[i], sorted[i + 1]) === 0) {
        i++;
        group.push(sorted[i]);
      }

      let countbackLabel = null;
      if (group.length === 1 && i + 1 < sorted.length && getLabelFn) {
        countbackLabel = getLabelFn(group[0], sorted[i + 1]);
      }

      const n = runningCount + 1;
      const suf =
        (n % 10 === 1 && n !== 11) ? 'st' :
        (n % 10 === 2 && n !== 12) ? 'nd' :
        (n % 10 === 3 && n !== 13) ? 'rd' : 'th';
      const ord = n + suf + (group.length > 1 ? '*' : '');
      result.push({ position: n, label: ord, scores: group, countbackLabel });

      runningCount += group.length;
      i++;
    }
    return result;
  },

  bestWithCountback: function(candidates, compareFn, getLabelFn) {
    if (!candidates || candidates.length === 0) return { scores: [], countbackLabel: null };
    const sorted = candidates.slice().sort(compareFn);
    const best = [sorted[0]];
    for (let j = 1; j < sorted.length && compareFn(sorted[0], sorted[j]) === 0; j++) best.push(sorted[j]);

    let countbackLabel = null;
    if (best.length === 1 && sorted.length > 1 && getLabelFn) {
      countbackLabel = getLabelFn(best[0], sorted[1]);
    }
    return { scores: best, countbackLabel };
  },

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

  par3StrokeToLabel: function(strokes) {
    const s = parseInt(strokes, 10);
    if (isNaN(s) || s < 1) return '-';
    if (s === 1) return 'Ace';
    if (s === 2) return 'Birdie';
    if (s === 3) return 'Par';
    if (s === 4) return 'Bogey';
    if (s === 5) return 'Double';
    return 'Triple+';
  },

  // O10 overall: 1st=10pts, 2nd=9,... 10th=1 per outing. Ties get same points.
  buildO10Overall: function({ outingKeysSorted, scoresByOuting, outingMeta }) {
    const pointsForPos = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const positionPointsByPlayer = {};
    const positionDetailsByPlayer = {};
    const playerTotals = {};

    // Build playerTotals for handicaps and display names (across O10 assignments).
    for (let si = 0; si < outingKeysSorted.length; si++) {
      const oKey = outingKeysSorted[si];
      const rawScores = scoresByOuting[oKey] || [];
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

    for (let okIdx = 0; okIdx < outingKeysSorted.length; okIdx++) {
      const oKey = outingKeysSorted[okIdx];
      const rawScores = scoresByOuting[oKey] || [];

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

    const filtered = overallList.filter(p => (parseFloat(p.totalPoints) || 0) > 0);
    const rankedOverallLeaders = this.rankOverallByPoints(filtered);

    return { rankedOverallLeaders, playerTotals };
  },

  // Build scrollable 18-hole detail panel HTML
  buildHoleDetailHtml: function(score, parIndexPairs, par3Indices, highlight66Indices, p3UsePoints, highlight2sIndices) {
    const holes = score.holes || [];
    const pts = score.holePoints || [];

    let outStrokes = 0, inStrokes = 0, outPoints = 0, inPoints = 0;
    const strokeVals = [], pointVals = [];

    for (let h = 0; h < 18; h++) {
      const s = holes[h] !== '' && holes[h] != null ? String(holes[h]) : '-';
      const p = (pts[h] !== undefined && pts[h] !== '' ? String(pts[h]) : '-');
      strokeVals.push(s);
      pointVals.push(p);

      const sn = parseInt(holes[h], 10);
      const pn = parseFloat(pts[h]);
      if (!isNaN(sn) && sn > 0) {
        if (h < 9) outStrokes += sn; else inStrokes += sn;
      }
      if (!isNaN(pn)) {
        if (h < 9) outPoints += pn; else inPoints += pn;
      }
    }

    const totStrokes = outStrokes + inStrokes;
    const totPts = outPoints + inPoints;

    // Par cells
    const parCells = [];
    let parOut = 0, parIn = 0, parTot = 0;
    if (parIndexPairs && parIndexPairs.length === 18) {
      for (let i = 0; i < 18; i++) {
        const pr = parIndexPairs[i].par || 0;
        parCells.push(pr || '-');
        if (i < 9) parOut += pr; else parIn += pr;
      }
      parTot = parOut + parIn;
    } else {
      for (let k = 0; k < 18; k++) parCells.push('-');
    }

    // Index cells
    const indexCells = [];
    if (parIndexPairs && parIndexPairs.length === 18) {
      for (let ii = 0; ii < 18; ii++) {
        const idx = parIndexPairs[ii].index;
        indexCells.push(idx ? String(idx) : '-');
      }
    } else {
      for (let ik = 0; ik < 18; ik++) indexCells.push('-');
    }

    const p3 = par3Indices || [];
    const highlight66Set = {};
    if (highlight66Indices && highlight66Indices.length) {
      for (let z = 0; z < highlight66Indices.length; z++) highlight66Set[highlight66Indices[z]] = true;
    }
    const highlight2sSet = {};
    if (highlight2sIndices && highlight2sIndices.length) {
      for (let z2 = 0; z2 < highlight2sIndices.length; z2++) highlight2sSet[highlight2sIndices[z2]] = true;
    }

    const isPar3 = i => p3.indexOf(i) >= 0;

    // Signature matches theGolfApp calls (rowType is unused, but present for param alignment)
    const cell = (txt, cls, holeIdx, rowType, pointHighlight, strokeHighlight) => {
      let c = cls || '';
      if (pointHighlight && holeIdx != null && (highlight66Set[holeIdx] || (isPar3(holeIdx) && p3UsePoints))) {
        c = (c ? c + ' ' : '') + 'lb-detail-points-66';
      }
      if (strokeHighlight && holeIdx != null && isPar3(holeIdx) && p3UsePoints === false) {
        c = (c ? c + ' ' : '') + 'lb-detail-strokes-p3';
      }
      if (strokeHighlight && holeIdx != null && highlight2sSet[holeIdx]) {
        c = (c ? c + ' ' : '') + 'lb-detail-strokes-2s';
      }
      const safeTxt = (typeof txt === 'number') ? String(txt) : this.escapeHtml(String(txt));
      return '<span' + (c ? ' class="' + c + '"' : '') + '>' + safeTxt + '</span>';
    };

    const parCell = v => '<span class="lb-detail-par">' + this.escapeHtml(String(v)) + '</span>';

    const cells = [];

    // Labels/strokes/points rows
    for (let n = 1; n <= 9; n++) cells.push(cell(n, null, n - 1, 'first'));
    cells.push(cell('OUT', 'lb-detail-col-total'));
    for (let n = 10; n <= 18; n++) cells.push(cell(n, null, n - 1, 'first'));
    cells.push(cell('IN', 'lb-detail-col-total'));
    cells.push(cell('TOT', 'lb-detail-col-total'));

    cells.push(cell('Par:', 'lb-detail-label lb-detail-par'));
    for (let pi = 0; pi < 9; pi++) cells.push(parCell(parCells[pi]));
    cells.push(parCell(parIndexPairs && parIndexPairs.length === 18 ? parOut : '-'));
    for (let pj = 9; pj < 18; pj++) cells.push(parCell(parCells[pj]));
    cells.push(parCell(parIndexPairs && parIndexPairs.length === 18 ? parIn : '-'));
    cells.push(parCell(parIndexPairs && parIndexPairs.length === 18 ? parTot : '-'));

    cells.push(cell('Index:', 'lb-detail-label lb-detail-index'));
    for (let idi = 0; idi < 9; idi++) cells.push(cell(indexCells[idi], 'lb-detail-index', idi, 'mid'));
    cells.push(cell('-', 'lb-detail-index'));
    for (let idj = 9; idj < 18; idj++) cells.push(cell(indexCells[idj], 'lb-detail-index', idj, 'mid'));
    cells.push(cell('-', 'lb-detail-index'));
    cells.push(cell('-', 'lb-detail-index'));

    cells.push(cell('Strokes:', 'lb-detail-label lb-detail-strokes'));
    for (let si = 0; si < 9; si++) cells.push(cell(strokeVals[si], 'lb-detail-strokes', si, 'mid', undefined, true));
    cells.push(cell(outStrokes, 'lb-detail-col-total lb-detail-strokes'));
    for (let sj = 9; sj < 18; sj++) cells.push(cell(strokeVals[sj], 'lb-detail-strokes', sj, 'mid', undefined, true));
    cells.push(cell(inStrokes, 'lb-detail-col-total lb-detail-strokes'));
    cells.push(cell(totStrokes, 'lb-detail-col-total lb-detail-strokes'));

    cells.push(cell('Points:', 'lb-detail-label lb-detail-points'));
    for (let qi = 0; qi < 9; qi++) cells.push(cell(pointVals[qi], 'lb-detail-points', qi, 'last', true));
    cells.push(cell(outPoints, 'lb-detail-col-total lb-detail-points'));
    for (let qj = 9; qj < 18; qj++) cells.push(cell(pointVals[qj], 'lb-detail-points', qj, 'last', true));
    cells.push(cell(inPoints, 'lb-detail-col-total lb-detail-points'));
    cells.push(cell(totPts, 'lb-detail-col-total lb-detail-points'));

    // Prepend the first-column header cell ("Hole#:") so the rest of the grid columns align correctly.
    return (
      '<div class="lb-hole-detail-wrap">' +
      '<div class="lb-hole-detail-scroll">' +
      '<div class="lb-hole-detail-grid">' +
      cell('Hole#:', 'lb-detail-label') +
      cells.join('') +
      '</div></div></div>'
    );
  }
};

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('leaderboard-container') && typeof LeaderboardPage !== 'undefined' && typeof LeaderboardPage.init === 'function') {
    LeaderboardPage.init();
  }
});

