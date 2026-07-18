/**
 * Database module for Artfest Point Manager
 * Handles local storage persistence, CRUD operations, calculations, and demo seeding.
 * Extended to support combined Position & Grade results (e.g. 1st Place with Grade A).
 */

const STORAGE_KEY = 'artfest_points_db';

const DEFAULT_DB = {
  houses: [
    { id: 'house-1', name: 'Phoenix Fire', color: '#ef4444', secondaryColor: '#991b1b', emblem: '🔥' },
    { id: 'house-2', name: 'Pegasus Frost', color: '#3b82f6', secondaryColor: '#1e3a8a', emblem: '❄️' },
    { id: 'house-3', name: 'Emerald Titans', color: '#10b981', secondaryColor: '#064e3b', emblem: '🍃' },
    { id: 'house-4', name: 'Golden Dragons', color: '#eab308', secondaryColor: '#713f12', emblem: '⚡' }
  ],
  events: [],
  results: {},
  settings: {
    adminPin: "1234",
    rules: {
      solo: { '1st': 10, '2nd': 6, '3rd': 4, 'gradeA': 5, 'gradeB': 3 },
      group: { '1st': 20, '2nd': 12, '3rd': 8, 'gradeA': 10, 'gradeB': 6 }
    }
  }
};

class ArtfestDB {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = JSON.parse(JSON.stringify(DEFAULT_DB));
        
        if (parsed.houses && Array.isArray(parsed.houses)) merged.houses = parsed.houses;
        if (parsed.events && Array.isArray(parsed.events)) {
          merged.events = parsed.events.filter(e => !e.id.startsWith('event-'));
        }
        if (parsed.results && typeof parsed.results === 'object') {
          const cleanResults = {};
          Object.keys(parsed.results).forEach(k => {
            if (!k.startsWith('event-')) {
              cleanResults[k] = parsed.results[k];
            }
          });
          merged.results = cleanResults;
        }
        
        if (parsed.settings && typeof parsed.settings === 'object') {
          if (parsed.settings.adminPin) {
            merged.settings.adminPin = String(parsed.settings.adminPin);
          }
          if (parsed.settings.rules && typeof parsed.settings.rules === 'object') {
            if (parsed.settings.rules.solo) {
              merged.settings.rules.solo = { ...merged.settings.rules.solo, ...parsed.settings.rules.solo };
            }
            if (parsed.settings.rules.group) {
              merged.settings.rules.group = { ...merged.settings.rules.group, ...parsed.settings.rules.group };
            }
          }
        }

        merged.events.forEach(event => {
          if (!event.pointsConfig) {
            event.pointsConfig = JSON.parse(JSON.stringify(merged.settings.rules[event.type]));
          }
        });

        return merged;
      }
    } catch (e) {
      console.error('Failed to load artfest data:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save artfest data:', e);
    }
  }

  // --- HOUSES ---
  getHouses() {
    return this.data.houses;
  }

  addHouse(name, color, emblem) {
    const id = 'house-' + Date.now();
    const secondaryColor = this.adjustColorBrightness(color, -30);
    const newHouse = { id, name, color, secondaryColor, emblem };
    this.data.houses.push(newHouse);
    this.save();
    return newHouse;
  }

  updateHouse(id, name, color, emblem) {
    const house = this.data.houses.find(h => h.id === id);
    if (house) {
      house.name = name;
      house.color = color;
      house.secondaryColor = this.adjustColorBrightness(color, -30);
      house.emblem = emblem;
      this.save();
    }
    return house;
  }

  deleteHouse(id) {
    this.data.houses = this.data.houses.filter(h => h.id !== id);
    
    Object.keys(this.data.results).forEach(eventId => {
      this.data.results[eventId] = this.data.results[eventId].filter(winner => winner.houseId !== id);
    });
    
    this.save();
  }

  // --- EVENTS ---
  getEvents() {
    return this.data.events;
  }

  addEvent(name, type, category, pointsConfig = null) {
    const id = 'event-' + Date.now();
    const config = pointsConfig || JSON.parse(JSON.stringify(this.data.settings.rules[type]));
    const newEvent = { id, name, type, category, completed: false, pointsConfig: config };
    this.data.events.push(newEvent);
    this.save();
    return newEvent;
  }

  updateEvent(id, name, type, category, pointsConfig) {
    const event = this.data.events.find(e => e.id === id);
    if (event) {
      event.name = name;
      event.type = type;
      event.category = category;
      event.pointsConfig = pointsConfig;
      
      if (event.completed && this.data.results[id]) {
        this.recalculateEventPoints(id);
      }
      this.save();
    }
    return event;
  }

  deleteEvent(id) {
    this.data.events = this.data.events.filter(e => e.id !== id);
    delete this.data.results[id];
    this.save();
  }

  // --- RESULTS ---
  getResults() {
    return this.data.results;
  }

  saveResult(eventId, winnersInput) {
    // winnersInput: Array of { position (1,2,3 or null), grade ('A','B' or null), houseId, participant }
    const event = this.data.events.find(e => e.id === eventId);
    if (!event) return;

    const pointsConfig = event.pointsConfig || this.data.settings.rules[event.type];
    
    const winners = winnersInput.map(w => {
      let pts = 0;
      if (w.position === 1) pts += pointsConfig['1st'] || 0;
      else if (w.position === 2) pts += pointsConfig['2nd'] || 0;
      else if (w.position === 3) pts += pointsConfig['3rd'] || 0;

      if (w.grade === 'A') pts += pointsConfig['gradeA'] || 0;
      else if (w.grade === 'B') pts += pointsConfig['gradeB'] || 0;

      return {
        position: w.position || null,
        grade: w.grade || null,
        houseId: w.houseId,
        participant: w.participant || 'Anonymous',
        points: pts
      };
    });

    this.data.results[eventId] = winners;
    event.completed = true;
    this.save();
  }

  deleteResult(eventId) {
    const event = this.data.events.find(e => e.id === eventId);
    if (event) {
      event.completed = false;
    }
    delete this.data.results[eventId];
    this.save();
  }

  recalculateEventPoints(eventId) {
    const event = this.data.events.find(e => e.id === eventId);
    const result = this.data.results[eventId];
    if (result && event && event.pointsConfig) {
      this.data.results[eventId] = result.map(w => {
        let pts = 0;
        if (w.position === 1) pts += event.pointsConfig['1st'] || 0;
        else if (w.position === 2) pts += event.pointsConfig['2nd'] || 0;
        else if (w.position === 3) pts += event.pointsConfig['3rd'] || 0;

        if (w.grade === 'A') pts += event.pointsConfig['gradeA'] || 0;
        else if (w.grade === 'B') pts += event.pointsConfig['gradeB'] || 0;

        return {
          ...w,
          points: pts
        };
      });
    }
  }

  // --- SETTINGS & RULES ---
  getSettings() {
    return this.data.settings;
  }

  updateRules(soloRules, groupRules) {
    const oldSolo = JSON.parse(JSON.stringify(this.data.settings.rules.solo));
    const oldGroup = JSON.parse(JSON.stringify(this.data.settings.rules.group));

    this.data.settings.rules.solo = soloRules;
    this.data.settings.rules.group = groupRules;
    
    this.data.events.forEach(event => {
      const oldDefaults = event.type === 'solo' ? oldSolo : oldGroup;
      const newDefaults = event.type === 'solo' ? soloRules : groupRules;

      let matches = true;
      if (event.pointsConfig) {
        Object.keys(newDefaults).forEach(key => {
          if (event.pointsConfig[key] !== oldDefaults[key]) {
            matches = false;
          }
        });
      } else {
        matches = true;
      }

      if (matches) {
        event.pointsConfig = JSON.parse(JSON.stringify(newDefaults));
      }

      if (event.completed && this.data.results[event.id]) {
        this.recalculateEventPoints(event.id);
      }
    });
    this.save();
  }

  verifyAdminPin(pin) {
    const currentPin = this.data.settings.adminPin || '1234';
    return String(pin).trim() === String(currentPin).trim();
  }

  updateAdminPin(newPin) {
    if (newPin && String(newPin).trim().length > 0) {
      this.data.settings.adminPin = String(newPin).trim();
      this.save();
      return true;
    }
    return false;
  }

  // --- CALCULATE STANDINGS & STATS ---
  calculateStandings() {
    const standings = {};
    this.data.houses.forEach(house => {
      standings[house.id] = {
        ...house,
        totalPoints: 0,
        positions: { 1: 0, 2: 0, 3: 0 },
        grades: { 'A': 0, 'B': 0 },
        breakdown: []
      };
    });

    Object.keys(this.data.results).forEach(eventId => {
      const event = this.data.events.find(e => e.id === eventId);
      if (!event) return;

      const winners = this.data.results[eventId];
      winners.forEach(w => {
        if (standings[w.houseId]) {
          standings[w.houseId].totalPoints += w.points;
          if (w.position >= 1 && w.position <= 3) {
            standings[w.houseId].positions[w.position] += 1;
          }
          if (w.grade === 'A' || w.grade === 'B') {
            standings[w.houseId].grades[w.grade] += 1;
          }
          standings[w.houseId].breakdown.push({
            eventId: event.id,
            eventName: event.name,
            eventType: event.type,
            participant: w.participant,
            position: w.position,
            grade: w.grade,
            points: w.points
          });
        }
      });
    });

    return Object.values(standings).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.positions[1] !== a.positions[1]) {
        return b.positions[1] - a.positions[1];
      }
      return a.name.localeCompare(b.name);
    });
  }

  calculateSoloStudentLeaderboard() {
    const studentScores = {};
    
    // Accumulate scores for students in solo events
    this.data.events.forEach(event => {
      if (event.type === 'solo' && event.completed && this.data.results[event.id]) {
        const winners = this.data.results[event.id];
        winners.forEach(w => {
          if (w.participant && w.participant !== 'Anonymous') {
            const key = w.participant + '||' + w.houseId;
            studentScores[key] = (studentScores[key] || 0) + w.points;
          }
        });
      }
    });

    // Map to list, sort by points desc, and slice top 10
    return Object.entries(studentScores)
      .map(([key, points]) => {
        const [name, houseId] = key.split('||');
        const house = this.data.houses.find(h => h.id === houseId);
        return {
          name,
          houseId,
          houseName: house ? house.name : 'Unknown House',
          houseEmblem: house ? house.emblem : '❓',
          houseColor: house ? house.color : '#6366f1',
          points
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }

  getStatistics() {
    const houses = this.data.houses;
    const events = this.data.events;
    const results = this.data.results;

    const totalEvents = events.length;
    const completedEvents = events.filter(e => e.completed).length;
    const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    const studentContributions = {};
    Object.keys(results).forEach(eventId => {
      results[eventId].forEach(w => {
        if (w.participant && w.participant !== 'Anonymous') {
          const key = w.participant + ` (${this.getHouseEmblemAndName(w.houseId)})`;
          studentContributions[key] = (studentContributions[key] || 0) + w.points;
        }
      });
    });

    let topStudent = 'None';
    let topStudentPoints = 0;
    Object.entries(studentContributions).forEach(([student, points]) => {
      if (points > topStudentPoints) {
        topStudentPoints = points;
        topStudent = student;
      }
    });

    const recentActivity = [];
    const sortedResultEvents = Object.keys(results).sort((a, b) => {
      return b.localeCompare(a);
    }).slice(0, 5);

    sortedResultEvents.forEach(eventId => {
      const event = this.data.events.find(e => e.id === eventId);
      if (event && results[eventId]) {
        const firstPlace = results[eventId].find(w => w.position === 1);
        if (firstPlace) {
          recentActivity.push({
            eventName: event.name,
            winner: firstPlace.participant,
            houseId: firstPlace.houseId,
            houseName: this.getHouseName(firstPlace.houseId),
            emblem: this.getHouseEmblem(firstPlace.houseId)
          });
        }
      }
    });

    return {
      totalEvents,
      completedEvents,
      completionRate,
      topStudent: topStudentPoints > 0 ? `${topStudent} - ${topStudentPoints} pts` : 'No data yet',
      recentActivity
    };
  }

  getHouseName(houseId) {
    const house = this.data.houses.find(h => h.id === houseId);
    return house ? house.name : 'Unknown House';
  }

  getHouseEmblem(houseId) {
    const house = this.data.houses.find(h => h.id === houseId);
    return house ? house.emblem : '❓';
  }

  getHouseEmblemAndName(houseId) {
    const house = this.data.houses.find(h => h.id === houseId);
    return house ? `${house.emblem} ${house.name}` : 'Unknown House';
  }

  resetDatabase() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
    this.save();
  }

  seedDemoData() {
    this.data.results = {};
    this.data.events.forEach(e => e.completed = false);

    this.data.events.forEach(e => {
      if (!e.pointsConfig) {
        e.pointsConfig = JSON.parse(JSON.stringify(this.data.settings.rules[e.type]));
      }
    });

    const students = [
      'Alexander Wright', 'Clara Oswald', 'Marcus Aurelius', 'Siddharth Nair', 
      'Aisha Rahman', 'Elena Petrova', 'Liam Gallagher', 'Mei Ling',
      'Yuki Sato', 'Carlos Santana', 'Olivia Bennett', 'Ethan Hunt',
      'Nisha Patel', 'Vikram Seth', 'Amelie Poulain', 'Dmitri Ivanov'
    ];

    const pickRandomStudent = () => students[Math.floor(Math.random() * students.length)];
    const shuffleArray = (arr) => [...arr].sort(() => 0.5 - Math.random());

    const eventsToSeed = this.data.events.slice(0, 6);
    
    eventsToSeed.forEach((event, index) => {
      const houseIds = shuffleArray(this.data.houses.map(h => h.id));
      
      // Seed mix: 
      // 1st Place with Grade A, 2nd Place with Grade A (even index) or None (odd index), 
      // 3rd Place with Grade B, and a couple of pure Grade awardees without positions.
      const winners = [
        { position: 1, grade: 'A', houseId: houseIds[0], participant: pickRandomStudent() },
        { position: 2, grade: index % 2 === 0 ? 'A' : null, houseId: houseIds[1], participant: pickRandomStudent() },
        { position: 3, grade: 'B', houseId: houseIds[2], participant: pickRandomStudent() },
        { position: null, grade: 'A', houseId: houseIds[3], participant: pickRandomStudent() }
      ];

      if (index % 2 === 0) {
        winners.push({ position: null, grade: 'B', houseId: houseIds[0], participant: pickRandomStudent() });
      }

      this.saveResult(event.id, winners);
    });

    this.save();
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.houses && parsed.events && parsed.results && parsed.settings) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }
}

window.ArtfestDB = new ArtfestDB();
