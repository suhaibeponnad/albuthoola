/**
 * Application controller for Artfest Point Manager
 * Manages rendering, tab routing, form submissions, and modals.
 * Extended to support unified position & grade awardees.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentView = 'view-leaderboard';
  let eventFilter = 'all';
  let eventSearchQuery = '';
  let leaderboardResultsFilter = 'all';
  let isAdminMode = sessionStorage.getItem('artfest_admin_mode') === 'true';
  
  // Cache DOM Elements
  const navButtons = document.querySelectorAll('.nav-button');
  const viewPanels = document.querySelectorAll('.view-panel');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const globalSearchContainer = document.getElementById('global-search-container');
  const viewSearchInput = document.getElementById('view-search-input');
  const headerActionBtn = document.getElementById('header-action-btn');

  // --- TAB ROUTING ---
  function switchView(targetViewId) {
    if (!isAdminMode && targetViewId !== 'view-leaderboard') {
      targetViewId = 'view-leaderboard';
    }

    currentView = targetViewId;
    
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === targetViewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === targetViewId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    updateHeader();
    renderActiveView();
  }

  function updateHeader() {
    globalSearchContainer.style.display = 'none';
    headerActionBtn.style.display = 'none';
    headerActionBtn.onclick = null;

    switch (currentView) {
      case 'view-leaderboard':
        pageTitle.textContent = 'Leaderboard';
        pageSubtitle.textContent = 'Real-time standings and statistics';
        break;
      case 'view-score-entry':
        pageTitle.textContent = 'Score Entry';
        pageSubtitle.textContent = 'Log results for completed artfest programmes';
        break;
      case 'view-events':
        pageTitle.textContent = 'Programmes';
        pageSubtitle.textContent = 'Manage arts festival event schedule';
        globalSearchContainer.style.display = 'block';
        viewSearchInput.value = eventSearchQuery;
        viewSearchInput.placeholder = 'Search programmes...';
        headerActionBtn.style.display = 'inline-flex';
        headerActionBtn.querySelector('span').textContent = 'Add Programme';
        headerActionBtn.onclick = () => openEventModal();
        break;
      case 'view-teams':
        pageTitle.textContent = 'Teams / Houses';
        pageSubtitle.textContent = 'Manage competing teams, color codes and emblems';
        headerActionBtn.style.display = 'inline-flex';
        headerActionBtn.querySelector('span').textContent = 'Add Team';
        headerActionBtn.onclick = () => openTeamModal();
        break;
      case 'view-settings':
        pageTitle.textContent = 'Settings';
        pageSubtitle.textContent = 'Configure scoring parameters and database utility tools';
        break;
    }
  }

  function renderActiveView() {
    switch (currentView) {
      case 'view-leaderboard':
        renderLeaderboard();
        break;
      case 'view-score-entry':
        renderScoreEntry();
        break;
      case 'view-events':
        renderEvents();
        break;
      case 'view-teams':
        renderTeams();
        break;
      case 'view-settings':
        renderSettings();
        break;
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchView(target);
    });
  });

  // --- MODALS ---
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  };

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // --- DYNAMIC AWARDEE ROW BUILDER ---
  window.addAwardeeRow = function(initialHouseId = '', initialName = '', initialPosition = null, initialGrade = null) {
    const listContainer = document.getElementById('awardees-list');
    const houses = window.ArtfestDB.getHouses();
    
    const row = document.createElement('div');
    row.className = 'form-row awardee-row';
    row.style.alignItems = 'center';
    row.style.marginTop = '0.5rem';

    // House options
    let houseOptions = '<option value="" disabled selected>Choose House</option>';
    houses.forEach(h => {
      const selected = h.id === initialHouseId ? 'selected' : '';
      houseOptions += `<option value="${h.id}" ${selected}>${h.emblem} ${h.name}</option>`;
    });

    // Position options
    const positions = [
      { value: '', label: 'None' },
      { value: '1', label: '1st Place 🥇' },
      { value: '2', label: '2nd Place 🥈' },
      { value: '3', label: '3rd Place 🥉' }
    ];
    let positionOptions = '';
    positions.forEach(p => {
      const selected = String(initialPosition || '') === p.value ? 'selected' : '';
      positionOptions += `<option value="${p.value}" ${selected}>${p.label}</option>`;
    });

    // Grade options
    const grades = [
      { value: '', label: 'None' },
      { value: 'A', label: 'Grade A 🅰️' },
      { value: 'B', label: 'Grade B 🅱️' }
    ];
    let gradeOptions = '';
    grades.forEach(g => {
      const selected = (initialGrade || '') === g.value ? 'selected' : '';
      gradeOptions += `<option value="${g.value}" ${selected}>${g.label}</option>`;
    });

    row.innerHTML = `
      <div class="form-group" style="margin-bottom: 0; flex: 1.2;">
        <select class="awardee-house-select" required>
          ${houseOptions}
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 0; flex: 1.5;">
        <input type="text" class="awardee-name-input" placeholder="Participant Name" value="${escapeHtml(initialName)}" required style="height: 38px;">
      </div>
      <div class="form-group" style="margin-bottom: 0; flex: 1.1;">
        <select class="awardee-position-select">
          ${positionOptions}
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 0; flex: 1.1;">
        <select class="awardee-grade-select">
          ${gradeOptions}
        </select>
      </div>
      <button type="button" class="btn btn-danger btn-icon-only btn-remove-awardee-row" style="margin-top: 0; height: 38px; padding: 0.5rem;">🗑️</button>
    `;

    row.querySelector('.btn-remove-awardee-row').onclick = () => {
      row.remove();
    };

    listContainer.appendChild(row);
  };

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Bind Add Awardee Button
  document.getElementById('btn-add-awardee').onclick = () => addAwardeeRow();

  // --- RENDERING VIEWS ---

  // 1. LEADERBOARD VIEW
  function renderLeaderboard() {
    const standings = window.ArtfestDB.calculateStandings();
    const stats = window.ArtfestDB.getStatistics();

    document.getElementById('stat-completion').textContent = `${stats.completionRate}% (${stats.completedEvents}/${stats.totalEvents})`;
    
    const leadingHouse = standings[0];
    document.getElementById('stat-leading-house').textContent = leadingHouse 
      ? `${leadingHouse.emblem} ${leadingHouse.name} (${leadingHouse.totalPoints} pts)` 
      : 'None';
    
    document.getElementById('stat-top-performer').textContent = stats.topStudent;

    const standingsContainer = document.getElementById('leaderboard-standings');
    standingsContainer.innerHTML = '';

    if (standings.length === 0) {
      standingsContainer.innerHTML = `
        <div class="no-data">
          <div class="no-data-icon">👥</div>
          <p>No teams configured. Head over to Teams tab to create one.</p>
        </div>`;
    } else {
      standings.forEach((house, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.className = 'standing-row';
        row.setAttribute('data-rank', rank <= 3 ? rank : 'other');
        row.style.setProperty('--team-color', house.color);
        
        row.innerHTML = `
          <div class="rank-badge">${rank}</div>
          <span class="house-emblem">${house.emblem}</span>
          <span class="house-name">${house.name}</span>
          <div class="house-points-wrapper">
            <span class="house-points">${house.totalPoints}</span>
            <div class="house-points-label">Points</div>
          </div>
        `;
        
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => showHouseBreakdown(house.id));
        standingsContainer.appendChild(row);
      });
    }

    const chartContainer = document.getElementById('leaderboard-chart');
    const totalPointsLabel = document.getElementById('total-points-label');
    chartContainer.innerHTML = '';
    
    if (standings.length === 0) {
      totalPointsLabel.textContent = '';
      chartContainer.innerHTML = '<div style="margin: auto; color: var(--text-muted);">No chart data</div>';
    } else {
      const maxPoints = Math.max(...standings.map(h => h.totalPoints));
      const totalPoints = standings.reduce((sum, h) => sum + h.totalPoints, 0);
      totalPointsLabel.textContent = `Total Points Logged: ${totalPoints}`;

      standings.forEach(house => {
        const heightPercent = maxPoints > 0 ? (house.totalPoints / maxPoints) * 90 : 0;
        
        const barWrapper = document.createElement('div');
        barWrapper.className = 'chart-bar-wrapper';
        
        barWrapper.innerHTML = `
          <div class="chart-bar" style="height: ${heightPercent}%; --bar-color-top: ${house.color}; --bar-color-bottom: ${house.secondaryColor}; --bar-shadow: rgba(${hexToRgb(house.color)}, 0.3);">
            <span class="chart-bar-val">${house.totalPoints}</span>
          </div>
          <span class="chart-bar-label" title="${house.name}">${house.emblem}</span>
        `;

        barWrapper.querySelector('.chart-bar-label').addEventListener('click', () => showHouseBreakdown(house.id));
        chartContainer.appendChild(barWrapper);
      });
    }

    const feedContainer = document.getElementById('recent-winners-feed');
    feedContainer.innerHTML = '';

    if (stats.recentActivity.length === 0) {
      feedContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No completions logged yet.</p>';
    } else {
      stats.recentActivity.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-badge">${activity.emblem}</div>
          <div class="activity-details">
            <span class="activity-text">
              <strong>${activity.winner}</strong> won 1st place in <em>${activity.eventName}</em> for <strong>${activity.houseName}</strong>
            </span>
          </div>
        `;
        feedContainer.appendChild(item);
      });
    }

    // --- STUDENT LEADERBOARD (TOP 10 SOLO) ---
    const studentLeaderboard = window.ArtfestDB.calculateSoloStudentLeaderboard();
    const studentContainer = document.getElementById('solo-student-leaderboard');
    studentContainer.innerHTML = '';

    if (studentLeaderboard.length === 0) {
      studentContainer.innerHTML = `
        <div class="no-data" style="padding: 1.5rem;">
          <div class="no-data-icon">👤</div>
          <p style="font-size: 0.85rem;">No solo event points logged yet.</p>
        </div>`;
    } else {
      studentLeaderboard.forEach((student, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.className = 'standing-row student-row';
        row.setAttribute('data-rank', rank <= 3 ? rank : 'other');
        row.style.setProperty('--team-color', student.houseColor);
        
        row.innerHTML = `
          <div class="rank-badge">${rank}</div>
          <span class="house-emblem">${student.houseEmblem}</span>
          <div style="display: flex; flex-direction: column;">
            <span class="house-name" style="font-size: 0.95rem;">${student.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${student.houseName}</span>
          </div>
          <div class="house-points-wrapper">
            <span class="house-points" style="font-size: 1.25rem;">${student.points}</span>
            <div class="house-points-label">Points</div>
          </div>
        `;
        studentContainer.appendChild(row);
      });
    }

    // Render Programme Results on Leaderboard
    renderLeaderboardProgrammeResults();
  }

  // --- PROGRAMME RESULTS ON LEADERBOARD RENDERER ---
  function renderLeaderboardProgrammeResults() {
    const events = window.ArtfestDB.getEvents();
    const results = window.ArtfestDB.getResults();
    const container = document.getElementById('leaderboard-programme-results');
    if (!container) return;
    
    container.innerHTML = '';

    let completedEvents = events.filter(e => e.completed);

    completedEvents = completedEvents.filter(e => {
      switch (leaderboardResultsFilter) {
        case 'solo': return e.type === 'solo';
        case 'group': return e.type === 'group';
        case 'stage': return e.category === 'stage';
        case 'non-stage': return e.category === 'non-stage';
        default: return true;
      }
    });

    if (completedEvents.length === 0) {
      container.innerHTML = `
        <div class="no-data" style="grid-column: 1 / -1; padding: 2rem;">
          <div class="no-data-icon">🎭</div>
          <p style="font-size: 0.85rem;">No completed programme results recorded under this filter yet.</p>
        </div>`;
      return;
    }

    completedEvents.forEach(event => {
      const card = document.createElement('div');
      card.className = 'glass-card item-card';
      
      const typeBadge = event.type === 'solo' ? '<span class="badge badge-solo">Solo</span>' : '<span class="badge badge-group">Group</span>';
      const categoryBadge = event.category === 'stage' ? '<span class="badge badge-stage">Stage</span>' : '<span class="badge badge-non-stage">Non-Stage</span>';

      let resultHtml = '';
      if (results[event.id]) {
        const eventResults = results[event.id];

        const winnerLines = eventResults.map(w => {
          const rewards = [];
          if (w.position === 1) rewards.push('🥇 1st');
          else if (w.position === 2) rewards.push('🥈 2nd');
          else if (w.position === 3) rewards.push('🥉 3rd');

          if (w.grade === 'A') rewards.push('🅰️ Grade A');
          else if (w.grade === 'B') rewards.push('🅱️ Grade B');

          const rewardsStr = rewards.join(' & ');
          return `<div style="margin-bottom: 0.35rem; font-size: 0.85rem;">${rewardsStr}: <strong>${w.participant}</strong> (${window.ArtfestDB.getHouseEmblemAndName(w.houseId)})</div>`;
        });

        resultHtml = `
          <div style="margin-top: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            ${winnerLines.join('')}
          </div>`;
      }

      card.innerHTML = `
        <div class="item-card-header" style="margin-bottom: 0.4rem;">
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 1.1rem; line-height:1.2;">${event.name}</h4>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.4rem;">
              ${typeBadge}
              ${categoryBadge}
            </div>
          </div>
        </div>
        <div class="item-card-body">
          ${resultHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Bind Leaderboard Results Filter Chips
  document.querySelectorAll('#leaderboard-results-filters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#leaderboard-results-filters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      leaderboardResultsFilter = chip.getAttribute('data-lb-filter');
      renderLeaderboardProgrammeResults();
    });
  });

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '139, 92, 246';
  }

  // 2. SCORE ENTRY VIEW
  function renderScoreEntry() {
    const events = window.ArtfestDB.getEvents();
    const rules = window.ArtfestDB.getSettings().rules;
    
    const eventSelect = document.getElementById('entry-event-select');
    const ruleBanner = document.getElementById('event-type-info-banner');
    const awardeesList = document.getElementById('awardees-list');

    eventSelect.innerHTML = '<option value="" disabled selected>-- Select an Event --</option>';
    awardeesList.innerHTML = '';
    
    const sortedEvents = [...events].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    sortedEvents.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} [${e.type.toUpperCase()}] ${e.completed ? '(Completed ✓)' : '(Pending)'}`;
      eventSelect.appendChild(opt);
    });

    eventSelect.onchange = () => {
      const eventId = eventSelect.value;
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const pts = event.pointsConfig || rules[event.type];

      // Update Point Preview Header Banner
      ruleBanner.style.display = 'block';
      ruleBanner.className = event.type === 'solo' ? 'badge-solo' : 'badge-group';
      ruleBanner.innerHTML = `<strong>POINT WEIGHTS:</strong> 1st: <strong>${pts['1st']}</strong> pts, 2nd: <strong>${pts['2nd']}</strong> pts, 3rd: <strong>${pts['3rd']}</strong> pts | Grade A: <strong>${pts['gradeA']}</strong> pts, Grade B: <strong>${pts['gradeB']}</strong> pts.`;

      const results = window.ArtfestDB.getResults();
      const existingResult = results[eventId];
      
      awardeesList.innerHTML = '';

      if (existingResult && existingResult.length > 0) {
        // Load existing results
        existingResult.forEach(w => {
          addAwardeeRow(w.houseId, w.participant, w.position, w.grade);
        });
      } else {
        // Pre-populate with standard 1st, 2nd, 3rd place rows for convenient input
        addAwardeeRow('', '', 1, null);
        addAwardeeRow('', '', 2, null);
        addAwardeeRow('', '', 3, null);
      }
    };
  }

  // Handle Score entry form submit
  document.getElementById('score-entry-form').onsubmit = (e) => {
    e.preventDefault();
    const eventId = document.getElementById('entry-event-select').value;
    if (!eventId) return alert('Please select an event first!');

    const winners = [];
    const positionsSet = new Set();
    let hasValidationErrors = false;

    const awardeeRows = document.querySelectorAll('#awardees-list .awardee-row');
    if (awardeeRows.length === 0) {
      return alert('Please add at least one awardee before saving.');
    }

    awardeeRows.forEach(row => {
      const houseId = row.querySelector('.awardee-house-select').value;
      const participant = row.querySelector('.awardee-name-input').value.trim();
      const positionVal = row.querySelector('.awardee-position-select').value;
      const gradeVal = row.querySelector('.awardee-grade-select').value;

      const pos = positionVal ? parseInt(positionVal) : null;
      const grd = gradeVal ? gradeVal : null;

      // Validate at least one point contribution is specified
      if (!pos && !grd) {
        alert('Every awardee row must be assigned a Place or a Grade (or both).');
        hasValidationErrors = true;
        return;
      }

      // Check unique places (1st, 2nd, 3rd)
      if (pos) {
        if (positionsSet.has(pos)) {
          alert(`Duplicate Placement Detected: Position ${pos} is assigned multiple times.`);
          hasValidationErrors = true;
          return;
        }
        positionsSet.add(pos);
      }

      winners.push({
        position: pos,
        grade: grd,
        houseId,
        participant
      });
    });

    if (hasValidationErrors) return;

    window.ArtfestDB.saveResult(eventId, winners);
    
    // Reset and redirect
    document.getElementById('score-entry-form').reset();
    document.getElementById('awardees-list').innerHTML = '';
    document.getElementById('event-type-info-banner').style.display = 'none';
    
    switchView('view-leaderboard');
  };

  // Clear Score Form button
  document.getElementById('btn-clear-score-form').onclick = () => {
    document.getElementById('score-entry-form').reset();
    document.getElementById('awardees-list').innerHTML = '';
    document.getElementById('event-type-info-banner').style.display = 'none';
  };

  // 3. EVENTS VIEW
  function renderEvents() {
    const events = window.ArtfestDB.getEvents();
    const results = window.ArtfestDB.getResults();
    const container = document.getElementById('events-grid-container');
    container.innerHTML = '';

    let filteredEvents = events.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(eventSearchQuery.toLowerCase());
      if (!matchSearch) return false;

      switch (eventFilter) {
        case 'completed': return e.completed;
        case 'pending': return !e.completed;
        case 'solo': return e.type === 'solo';
        case 'group': return e.type === 'group';
        case 'stage': return e.category === 'stage';
        case 'non-stage': return e.category === 'non-stage';
        default: return true;
      }
    });

    if (filteredEvents.length === 0) {
      container.innerHTML = `
        <div class="no-data" style="grid-column: 1 / -1;">
          <div class="no-data-icon">🎭</div>
          <p>No programmes matched your filter or search criteria.</p>
        </div>`;
      return;
    }

    filteredEvents.forEach(event => {
      const card = document.createElement('div');
      card.className = 'glass-card item-card';
      
      const typeBadge = event.type === 'solo' ? '<span class="badge badge-solo">Solo</span>' : '<span class="badge badge-group">Group</span>';
      const categoryBadge = event.category === 'stage' ? '<span class="badge badge-stage">Stage</span>' : '<span class="badge badge-non-stage">Non-Stage</span>';
      const completedBadge = event.completed ? '<span class="badge badge-completed">Completed</span>' : '<span class="badge badge-pending">Pending</span>';

      let resultHtml = '';
      if (event.completed && results[event.id]) {
        const eventResults = results[event.id];

        // Format each winner's combined placements and grades
        const winnerLines = eventResults.map(w => {
          const rewards = [];
          if (w.position === 1) rewards.push('🥇 1st');
          else if (w.position === 2) rewards.push('🥈 2nd');
          else if (w.position === 3) rewards.push('🥉 3rd');

          if (w.grade === 'A') rewards.push('🅰️ Grade A');
          else if (w.grade === 'B') rewards.push('🅱️ Grade B');

          const rewardsStr = rewards.join(' & ');
          return `<div style="margin-bottom: 0.3rem;">${rewardsStr}: <strong>${w.participant}</strong> (${window.ArtfestDB.getHouseEmblemAndName(w.houseId)})</div>`;
        });

        resultHtml = `
          <div style="margin-top: 1rem; font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            ${winnerLines.join('')}
          </div>`;
      } else {
        resultHtml = `<p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Results not recorded yet.</p>`;
      }

      const rules = window.ArtfestDB.getSettings().rules;
      const stdRules = rules[event.type];
      let overrideIndicator = '';
      if (event.pointsConfig) {
        const isOverridden = Object.keys(event.pointsConfig).some(key => event.pointsConfig[key] !== stdRules[key]);
        if (isOverridden) {
          overrideIndicator = `<span class="badge" style="border: 1px dashed var(--accent-primary); color: #a5b4fc; margin-top: 0.4rem;">Custom Points</span>`;
        }
      }

      card.innerHTML = `
        <div class="item-card-header">
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 0.4rem; line-height:1.2;">${event.name}</h4>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
              ${typeBadge}
              ${categoryBadge}
              ${overrideIndicator}
            </div>
          </div>
          ${completedBadge}
        </div>
        <div class="item-card-body">
          ${resultHtml}
        </div>
        <div class="item-card-footer">
          ${event.completed 
            ? `<button class="btn btn-secondary btn-icon-only" title="Delete Score" onclick="deleteResult('${event.id}')">❌</button>` 
            : `<button class="btn btn-primary btn-icon-only" title="Record Score" onclick="goToScoreEntry('${event.id}')">✍️</button>`
          }
          <button class="btn btn-secondary btn-icon-only" onclick="openEventModal('${event.id}')">✏️</button>
          <button class="btn btn-danger btn-icon-only" onclick="deleteEvent('${event.id}')">🗑️</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  window.deleteEvent = function(id) {
    if (confirm('Are you sure you want to delete this programme? All logged points for this event will be deleted permanently.')) {
      window.ArtfestDB.deleteEvent(id);
      renderEvents();
    }
  };

  window.deleteResult = function(id) {
    if (confirm('Are you sure you want to clear/delete scores for this event? Points will be deducted from the leaderboard.')) {
      window.ArtfestDB.deleteResult(id);
      renderEvents();
    }
  };

  window.goToScoreEntry = function(eventId) {
    switchView('view-score-entry');
    const selectEl = document.getElementById('entry-event-select');
    selectEl.value = eventId;
    selectEl.onchange();
  };

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      eventFilter = chip.getAttribute('data-filter');
      renderEvents();
    });
  });

  viewSearchInput.addEventListener('input', (e) => {
    eventSearchQuery = e.target.value;
    renderEvents();
  });

  // 4. TEAMS VIEW
  function renderTeams() {
    const standings = window.ArtfestDB.calculateStandings();
    const container = document.getElementById('teams-grid-container');
    container.innerHTML = '';

    if (standings.length === 0) {
      container.innerHTML = `
        <div class="no-data" style="grid-column: 1 / -1;">
          <div class="no-data-icon">👥</div>
          <p>No competing teams/houses added. Click "Add Team" to configure one.</p>
        </div>`;
      return;
    }

    standings.forEach(house => {
      const card = document.createElement('div');
      card.className = 'glass-card item-card';
      
      card.innerHTML = `
        <div class="item-card-body house-card-preview" style="margin-bottom: 1rem;">
          <div class="house-circle-badge" style="--hc-grad: linear-gradient(135deg, ${house.color} 0%, ${house.secondaryColor} 100%); --hc-shadow: rgba(${hexToRgb(house.color)}, 0.3);">
            ${house.emblem}
          </div>
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 1.25rem;">${house.name}</h4>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Total Points: <strong style="color: #fff; font-size: 1rem;">${house.totalPoints}</strong>
            </div>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.2rem; text-align: center; background: rgba(0,0,0,0.15); padding: 0.5rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
          <div>🥇 <strong>${house.positions[1]}</strong></div>
          <div>🥈 <strong>${house.positions[2]}</strong></div>
          <div>🥉 <strong>${house.positions[3]}</strong></div>
          <div style="color: var(--accent-success);">🅰️ <strong>${house.grades['A']}</strong></div>
          <div style="color: var(--accent-warning);">🅱️ <strong>${house.grades['B']}</strong></div>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-secondary btn-icon-only" style="margin-right: auto;" title="View breakdown" onclick="showHouseBreakdown('${house.id}')">📊</button>
          <button class="btn btn-secondary btn-icon-only" onclick="openTeamModal('${house.id}')">✏️</button>
          <button class="btn btn-danger btn-icon-only" onclick="deleteTeam('${house.id}')">🗑️</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  window.deleteTeam = function(id) {
    if (confirm('Are you sure you want to delete this team? Points contributed by this team will be permanently lost.')) {
      window.ArtfestDB.deleteHouse(id);
      renderTeams();
    }
  };

  // 5. SETTINGS VIEW
  function renderSettings() {
    const settings = window.ArtfestDB.getSettings();
    
    document.getElementById('rule-solo-1st').value = settings.rules.solo['1st'];
    document.getElementById('rule-solo-2nd').value = settings.rules.solo['2nd'];
    document.getElementById('rule-solo-3rd').value = settings.rules.solo['3rd'];
    document.getElementById('rule-solo-gradeA').value = settings.rules.solo['gradeA'] || 5;
    document.getElementById('rule-solo-gradeB').value = settings.rules.solo['gradeB'] || 3;
    
    document.getElementById('rule-group-1st').value = settings.rules.group['1st'];
    document.getElementById('rule-group-2nd').value = settings.rules.group['2nd'];
    document.getElementById('rule-group-3rd').value = settings.rules.group['3rd'];
    document.getElementById('rule-group-gradeA').value = settings.rules.group['gradeA'] || 10;
    document.getElementById('rule-group-gradeB').value = settings.rules.group['gradeB'] || 6;
  }

  document.getElementById('rules-config-form').onsubmit = (e) => {
    e.preventDefault();
    const solo = {
      '1st': parseInt(document.getElementById('rule-solo-1st').value),
      '2nd': parseInt(document.getElementById('rule-solo-2nd').value),
      '3rd': parseInt(document.getElementById('rule-solo-3rd').value),
      'gradeA': parseInt(document.getElementById('rule-solo-gradeA').value),
      'gradeB': parseInt(document.getElementById('rule-solo-gradeB').value)
    };
    const group = {
      '1st': parseInt(document.getElementById('rule-group-1st').value),
      '2nd': parseInt(document.getElementById('rule-group-2nd').value),
      '3rd': parseInt(document.getElementById('rule-group-3rd').value),
      'gradeA': parseInt(document.getElementById('rule-group-gradeA').value),
      'gradeB': parseInt(document.getElementById('rule-group-gradeB').value)
    };

    window.ArtfestDB.updateRules(solo, group);
    alert('Scoring parameters updated! Settings have been applied to all events utilizing standard weights.');
    renderSettings();
  };

  document.getElementById('btn-reset-db').onclick = () => {
    if (confirm('WARNING: This will completely wipe all events, houses, results, and settings, returning them to factory defaults. This action CANNOT be undone!')) {
      window.ArtfestDB.resetDatabase();
      alert('Database cleared.');
      switchView('view-leaderboard');
    }
  };

  document.getElementById('btn-export-db').onclick = () => {
    const dataStr = window.ArtfestDB.exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataUri);
    downloadAnchor.setAttribute('download', `artfest_points_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importInput = document.getElementById('file-import-input');
  document.getElementById('btn-trigger-import').onclick = () => {
    importInput.click();
  };

  importInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target.result;
      const success = window.ArtfestDB.importData(contents);
      if (success) {
        alert('Database successfully imported!');
        switchView('view-leaderboard');
      } else {
        alert('Failed to import database. Please ensure the file is valid JSON exported from this application.');
      }
    };
    reader.readAsText(file);
  };

  // --- ACTIONS MODALS BINDINGS ---
  
  const eventModalTypeSelect = document.getElementById('event-modal-type');
  const updateModalPointsPlaceholders = (type) => {
    const rules = window.ArtfestDB.getSettings().rules;
    const defaults = rules[type || 'solo'];
    
    document.getElementById('event-modal-pts-1st').placeholder = `Default (${defaults['1st']})`;
    document.getElementById('event-modal-pts-2nd').placeholder = `Default (${defaults['2nd']})`;
    document.getElementById('event-modal-pts-3rd').placeholder = `Default (${defaults['3rd']})`;
    document.getElementById('event-modal-pts-gradeA').placeholder = `Default (${defaults['gradeA']})`;
    document.getElementById('event-modal-pts-gradeB').placeholder = `Default (${defaults['gradeB']})`;
  };

  eventModalTypeSelect.onchange = () => {
    updateModalPointsPlaceholders(eventModalTypeSelect.value);
  };

  window.openEventModal = function(id = null) {
    const form = document.getElementById('event-modal-form');
    form.reset();

    if (id) {
      document.getElementById('event-modal-title').textContent = 'Edit Programme';
      const event = window.ArtfestDB.getEvents().find(e => e.id === id);
      if (event) {
        document.getElementById('event-modal-id').value = event.id;
        document.getElementById('event-modal-name').value = event.name;
        document.getElementById('event-modal-type').value = event.type;
        document.getElementById('event-modal-category').value = event.category;
        
        updateModalPointsPlaceholders(event.type);

        const stdRules = window.ArtfestDB.getSettings().rules[event.type];
        if (event.pointsConfig) {
          if (event.pointsConfig['1st'] !== stdRules['1st']) document.getElementById('event-modal-pts-1st').value = event.pointsConfig['1st'];
          if (event.pointsConfig['2nd'] !== stdRules['2nd']) document.getElementById('event-modal-pts-2nd').value = event.pointsConfig['2nd'];
          if (event.pointsConfig['3rd'] !== stdRules['3rd']) document.getElementById('event-modal-pts-3rd').value = event.pointsConfig['3rd'];
          if (event.pointsConfig['gradeA'] !== stdRules['gradeA']) document.getElementById('event-modal-pts-gradeA').value = event.pointsConfig['gradeA'];
          if (event.pointsConfig['gradeB'] !== stdRules['gradeB']) document.getElementById('event-modal-pts-gradeB').value = event.pointsConfig['gradeB'];
        }
      }
    } else {
      document.getElementById('event-modal-title').textContent = 'Create Programme';
      document.getElementById('event-modal-id').value = '';
      updateModalPointsPlaceholders('solo');
    }
    openModal('modal-event');
  };

  document.getElementById('event-modal-form').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('event-modal-id').value;
    const name = document.getElementById('event-modal-name').value.trim();
    const type = document.getElementById('event-modal-type').value;
    const category = document.getElementById('event-modal-category').value;

    const pts1st = document.getElementById('event-modal-pts-1st').value;
    const pts2nd = document.getElementById('event-modal-pts-2nd').value;
    const pts3rd = document.getElementById('event-modal-pts-3rd').value;
    const ptsGradeA = document.getElementById('event-modal-pts-gradeA').value;
    const ptsGradeB = document.getElementById('event-modal-pts-gradeB').value;

    const stdRules = window.ArtfestDB.getSettings().rules[type];

    const config = {
      '1st': pts1st !== '' ? parseInt(pts1st) : stdRules['1st'],
      '2nd': pts2nd !== '' ? parseInt(pts2nd) : stdRules['2nd'],
      '3rd': pts3rd !== '' ? parseInt(pts3rd) : stdRules['3rd'],
      'gradeA': ptsGradeA !== '' ? parseInt(ptsGradeA) : stdRules['gradeA'],
      'gradeB': ptsGradeB !== '' ? parseInt(ptsGradeB) : stdRules['gradeB']
    };

    if (id) {
      window.ArtfestDB.updateEvent(id, name, type, category, config);
    } else {
      window.ArtfestDB.addEvent(name, type, category, config);
    }

    closeModal('modal-event');
    renderActiveView();
  };

  window.openTeamModal = function(id = null) {
    const form = document.getElementById('team-modal-form');
    form.reset();

    if (id) {
      document.getElementById('team-modal-title').textContent = 'Configure Team';
      const house = window.ArtfestDB.getHouses().find(h => h.id === id);
      if (house) {
        document.getElementById('team-modal-id').value = house.id;
        document.getElementById('team-modal-name').value = house.name;
        document.getElementById('team-modal-emblem').value = house.emblem;
        document.getElementById('team-modal-color').value = house.color;
      }
    } else {
      document.getElementById('team-modal-title').textContent = 'Create Team';
      document.getElementById('team-modal-id').value = '';
      document.getElementById('team-modal-color').value = '#8b5cf6';
    }
    openModal('modal-team');
  };

  document.getElementById('team-modal-form').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('team-modal-id').value;
    const name = document.getElementById('team-modal-name').value.trim();
    const emblem = document.getElementById('team-modal-emblem').value.trim();
    const color = document.getElementById('team-modal-color').value;

    if (id) {
      window.ArtfestDB.updateHouse(id, name, color, emblem);
    } else {
      window.ArtfestDB.addHouse(name, color, emblem);
    }

    closeModal('modal-team');
    renderActiveView();
  };

  window.showHouseBreakdown = function(houseId) {
    const standings = window.ArtfestDB.calculateStandings();
    const house = standings.find(h => h.id === houseId);
    if (!house) return;

    document.getElementById('house-details-emblem').textContent = house.emblem;
    document.getElementById('house-details-name').textContent = house.name;

    const tbody = document.getElementById('house-details-tbody');
    tbody.innerHTML = '';

    if (house.breakdown.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No points logged for this house yet.</td></tr>';
    } else {
      const sortedBreakdown = [...house.breakdown].sort((a, b) => b.points - a.points);
      
      sortedBreakdown.forEach(item => {
        const tr = document.createElement('tr');
        
        let placeStr = '';
        const rewards = [];
        if (item.position === 1) rewards.push('🥇 1st Place');
        else if (item.position === 2) rewards.push('🥈 2nd Place');
        else if (item.position === 3) rewards.push('🥉 3rd Place');

        if (item.grade === 'A') rewards.push('🅰️ Grade A');
        else if (item.grade === 'B') rewards.push('🅱️ Grade B');

        placeStr = rewards.join(' & ') || 'None';

        const typeBadge = item.eventType === 'solo' ? '<span class="badge badge-solo">Solo</span>' : '<span class="badge badge-group">Group</span>';

        tr.innerHTML = `
          <td><strong>${item.eventName}</strong></td>
          <td>${typeBadge}</td>
          <td>${item.participant}</td>
          <td>${placeStr}</td>
          <td style="font-weight: 700; color: #fff;">+${item.points}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    openModal('modal-house-details');
  };

  // --- AUTH SECURITY CONTROLLER ---
  function updateAuthModeUI() {
    const adminNavs = document.querySelectorAll('.admin-only-nav');
    const badgeParent = document.getElementById('user-badge-parent');
    const badgeAdmin = document.getElementById('user-badge-admin');
    const btnLogin = document.getElementById('btn-admin-login');
    const btnLogout = document.getElementById('btn-admin-logout');

    if (isAdminMode) {
      adminNavs.forEach(el => el.style.display = 'block');
      if (badgeParent) badgeParent.style.display = 'none';
      if (badgeAdmin) badgeAdmin.style.display = 'flex';
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';
    } else {
      adminNavs.forEach(el => el.style.display = 'none');
      if (badgeParent) badgeParent.style.display = 'flex';
      if (badgeAdmin) badgeAdmin.style.display = 'none';
      if (btnLogin) btnLogin.style.display = 'inline-flex';
      if (btnLogout) btnLogout.style.display = 'none';

      if (currentView !== 'view-leaderboard') {
        switchView('view-leaderboard');
      }
    }
  }

  // Admin Login button click
  document.getElementById('btn-admin-login').onclick = () => {
    document.getElementById('admin-login-form').reset();
    document.getElementById('admin-login-error').style.display = 'none';
    openModal('modal-admin-login');
  };

  // Admin Login submit
  document.getElementById('admin-login-form').onsubmit = (e) => {
    e.preventDefault();
    const pinInput = document.getElementById('admin-pin-input').value;
    if (window.ArtfestDB.verifyAdminPin(pinInput)) {
      isAdminMode = true;
      sessionStorage.setItem('artfest_admin_mode', 'true');
      updateAuthModeUI();
      closeModal('modal-admin-login');
      document.getElementById('admin-login-form').reset();
      document.getElementById('admin-login-error').style.display = 'none';
    } else {
      document.getElementById('admin-login-error').style.display = 'block';
    }
  };

  // Admin Logout click
  document.getElementById('btn-admin-logout').onclick = () => {
    isAdminMode = false;
    sessionStorage.removeItem('artfest_admin_mode');
    updateAuthModeUI();
  };

  // Admin PIN change submit
  document.getElementById('admin-pin-change-form').onsubmit = (e) => {
    e.preventDefault();
    const newPin = document.getElementById('new-admin-pin').value;
    if (window.ArtfestDB.updateAdminPin(newPin)) {
      alert('Admin Passcode PIN updated successfully!');
      document.getElementById('admin-pin-change-form').reset();
    } else {
      alert('Invalid PIN!');
    }
  };

  // --- INITIALIZATION ---
  updateAuthModeUI();
  switchView('view-leaderboard');
});
