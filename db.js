// db.js — Capa de datos. Todo vive en localStorage, en este dispositivo.
'use strict';

const STORAGE_KEY = 'bitacora_data_v1';
const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return {
    version: 1,
    routines: [],          // {id, name, tipo, color, exercises:[{id,name,sets,reps,notes}]}
    schedule: {},           // {mon: 'rest' | [routineId, routineId...], tue: [...], ...} — varias rutinas por día, separadas por tipo
    dateOverrides: {},      // {'2026-08-15': 'rest' | [routineId, ...] } — pisa el horario semanal ese día puntual
    goals: [],              // {id, title, type, description, targetDate, numeric:{}, habit:{}, checklist:{}}
    todos: [],               // {id, title, date, time, done, reminder, notified}
    settings: {
      notificationsEnabled: false,
      leadMinutes: 15
    },
    notifiedLog: [],
    japanese: {
      weeks: []       // {id, weekNumber, title, objective, level, uploadedAt, rawText, days:[{id,num,title,theory,notaImportante,activity,test,characters:[{char,romaji}],lessonDone,testDone}]}
    }
  };
}

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? Object.assign(defaultData(), JSON.parse(raw)) : defaultData();
    // migración: rutinas viejas sin tipo asignado
    _cache.routines.forEach(r => { if (!r.tipo) r.tipo = 'fuerza'; });
  } catch (e) {
    console.error('Error leyendo datos, se usa un estado nuevo', e);
    _cache = defaultData();
  }
  return _cache;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
    window.dispatchEvent(new CustomEvent('bitacora:change'));
  } catch (e) {
    console.error('No se pudo guardar', e);
    alert('No se pudo guardar. Puede que el almacenamiento esté lleno o bloqueado.');
  }
}

// ---------- Helpers de fecha ----------
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayISO() { return toISODate(new Date()); }
function dayKeyFromDate(d) { return DIAS[d.getDay()]; }

// ---------- Rutinas ----------
const Routines = {
  all: () => load().routines,
  get: (id) => load().routines.find(r => r.id === id),
  add: (routine) => {
    const data = load();
    const r = { id: uid(), name: routine.name, tipo: routine.tipo || 'fuerza', color: routine.color || '#9CAF88', exercises: routine.exercises || [] };
    data.routines.push(r);
    save();
    return r;
  },
  update: (id, patch) => {
    const data = load();
    const r = data.routines.find(x => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
    save();
  },
  remove: (id) => {
    const data = load();
    data.routines = data.routines.filter(r => r.id !== id);
    // limpiar referencias (respetando 'rest' como valor especial no-lista)
    Object.keys(data.schedule).forEach(day => {
      if (Array.isArray(data.schedule[day])) data.schedule[day] = data.schedule[day].filter(rid => rid !== id);
    });
    Object.keys(data.dateOverrides).forEach(date => {
      if (Array.isArray(data.dateOverrides[date])) data.dateOverrides[date] = data.dateOverrides[date].filter(rid => rid !== id);
    });
    save();
  }
};

// ---------- Horario (semanal + overrides puntuales) ----------
// Un día puede tener: 'rest' (descanso, excluyente) o una lista de ids de rutina (0, 1 o varias, de distinto tipo)
const Schedule = {
  getDay: (dayKey) => load().schedule[dayKey] ?? [],
  setDayRest: (dayKey, isRest) => {
    const data = load();
    data.schedule[dayKey] = isRest ? 'rest' : [];
    save();
  },
  toggleDayRoutine: (dayKey, routineId) => {
    const data = load();
    let cur = data.schedule[dayKey];
    cur = Array.isArray(cur) ? cur.slice() : [];
    const idx = cur.indexOf(routineId);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(routineId);
    data.schedule[dayKey] = cur;
    save();
  },
  getOverride: (isoDate) => load().dateOverrides[isoDate],
  setOverrideRest: (isoDate, isRest) => {
    const data = load();
    if (isRest) data.dateOverrides[isoDate] = 'rest';
    else delete data.dateOverrides[isoDate];
    save();
  },
  toggleOverrideRoutine: (isoDate, routineId) => {
    const data = load();
    let cur = data.dateOverrides[isoDate];
    cur = Array.isArray(cur) ? cur.slice() : [];
    const idx = cur.indexOf(routineId);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(routineId);
    data.dateOverrides[isoDate] = cur;
    save();
  },
  clearOverride: (isoDate) => {
    const data = load();
    delete data.dateOverrides[isoDate];
    save();
  },
  // Devuelve 'rest' o un array de ids de rutina (posiblemente vacío) para una fecha dada
  routinesForDate: (isoDate) => {
    const data = load();
    if (Object.prototype.hasOwnProperty.call(data.dateOverrides, isoDate)) {
      return data.dateOverrides[isoDate];
    }
    const d = new Date(isoDate + 'T00:00:00');
    const dayKey = dayKeyFromDate(d);
    return Schedule.getDay(dayKey);
  }
};

// ---------- Objetivos ----------
const Goals = {
  all: () => load().goals,
  get: (id) => load().goals.find(g => g.id === id),
  add: (goal) => {
    const data = load();
    const g = {
      id: uid(),
      title: goal.title,
      type: goal.type, // 'numeric' | 'habit' | 'checklist'
      description: goal.description || '',
      targetDate: goal.targetDate || null,
      numeric: goal.numeric || { current: 0, target: 100, unit: '' },
      habit: goal.habit || { streak: 0, lastDone: null, frequency: 'daily' },
      checklist: goal.checklist || { items: [] }
    };
    data.goals.push(g);
    save();
    return g;
  },
  update: (id, patch) => {
    const data = load();
    const g = data.goals.find(x => x.id === id);
    if (!g) return;
    Object.assign(g, patch);
    save();
  },
  remove: (id) => {
    const data = load();
    data.goals = data.goals.filter(g => g.id !== id);
    data.todos.forEach(t => { if (t.linkedGoalId === id) t.linkedGoalId = null; });
    save();
  },
  markHabitDone: (id) => {
    const data = load();
    const g = data.goals.find(x => x.id === id);
    if (!g || g.type !== 'habit') return;
    const today = todayISO();
    if (g.habit.lastDone === today) return; // ya contado hoy
    const yesterday = toISODate(new Date(Date.now() - 86400000));
    g.habit.streak = (g.habit.lastDone === yesterday) ? g.habit.streak + 1 : 1;
    g.habit.lastDone = today;
    save();
  }
};

// ---------- Tareas ----------
const Todos = {
  all: () => load().todos,
  get: (id) => load().todos.find(t => t.id === id),
  byDate: (isoDate) => load().todos.filter(t => t.date === isoDate),
  add: (todo) => {
    const data = load();
    const t = {
      id: uid(),
      title: todo.title,
      date: todo.date || todayISO(),
      time: todo.time || null,
      done: false,
      reminder: !!todo.reminder,
      linkedGoalId: todo.linkedGoalId || null,
      notified: false
    };
    data.todos.push(t);
    save();
    return t;
  },
  update: (id, patch) => {
    const data = load();
    const t = data.todos.find(x => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    save();
  },
  toggleDone: (id) => {
    const data = load();
    const t = data.todos.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
  },
  remove: (id) => {
    const data = load();
    data.todos = data.todos.filter(t => t.id !== id);
    save();
  }
};

// ---------- Ajustes ----------
const Settings = {
  get: () => load().settings,
  update: (patch) => {
    const data = load();
    Object.assign(data.settings, patch);
    save();
  }
};

// ---------- Notificaciones ya enviadas (para no repetir) ----------
const NotifiedLog = {
  has: (key) => load().notifiedLog.includes(key),
  add: (key) => {
    const data = load();
    data.notifiedLog.push(key);
    if (data.notifiedLog.length > 500) data.notifiedLog = data.notifiedLog.slice(-300);
    save();
  }
};

// ---------- Japonés (programa semanal + caracteres) ----------
const Japanese = {
  weeks: () => load().japanese.weeks,
  getWeek: (id) => load().japanese.weeks.find(w => w.id === id),
  addWeek: (week) => {
    const data = load();
    const w = {
      id: uid(),
      weekNumber: week.weekNumber ?? null,
      title: week.title || 'Semana',
      objective: week.objective || '',
      level: week.level || '',
      uploadedAt: todayISO(),
      rawText: week.rawText || '',
      days: (week.days || []).map(d => ({
        id: uid(),
        num: d.num,
        title: d.title || '',
        theory: d.theory || '',
        notaImportante: d.notaImportante || '',
        activity: d.activity || '',
        test: d.test || '',
        characters: d.characters || [],
        lessonDone: false,
        testDone: false
      }))
    };
    // orden: más reciente (por número de semana, si no hay número por fecha de carga) primero
    data.japanese.weeks.unshift(w);
    save();
    return w;
  },
  removeWeek: (id) => {
    const data = load();
    data.japanese.weeks = data.japanese.weeks.filter(w => w.id !== id);
    save();
  },
  toggleDay: (weekId, dayId, field) => { // field: 'lessonDone' | 'testDone'
    const data = load();
    const w = data.japanese.weeks.find(x => x.id === weekId);
    if (!w) return;
    const d = w.days.find(x => x.id === dayId);
    if (!d) return;
    d[field] = !d[field];
    save();
  },
  // Set de caracteres (string) que ya aparecieron en algún archivo subido
  learnedChars: () => {
    const set = new Set();
    load().japanese.weeks.forEach(w => w.days.forEach(d => (d.characters || []).forEach(c => set.add(c.char))));
    return set;
  }
};

// ---------- Semilla inicial: rutina de definición en casa ----------
function seedDefinicionRoutines() {
  const data = load();
  if (data.routines.length) return; // ya hay rutinas, no tocar nada
  const TIPO_COLORS = { fuerza: '#9CAF88', cardio: '#C2665A', core: '#7FA0C9', movilidad: '#B487C2', otro: '#D4A73C' };
  const mk = (name, tipo, exercises) => ({ id: uid(), name, tipo, color: TIPO_COLORS[tipo], exercises: exercises.map(e => ({ id: uid(), name: e[0], sets: e[1], reps: e[2] })) });
  data.routines.push(
    mk('Tren Superior', 'fuerza', [
      ['Flexiones', '4', '10-15'], ['Fondos en silla', '3', '12'], ['Pike push-ups', '3', '10'],
      ['Plancha con toque de hombro', '3', '20 seg'], ['Superman', '3', '15']
    ]),
    mk('Tren Inferior', 'fuerza', [
      ['Sentadillas', '4', '15'], ['Zancadas alternas', '3', '12 c/pierna'], ['Puente de glúteo', '3', '15'],
      ['Elevación de talones', '3', '20'], ['Sentadilla isométrica', '3', '30 seg']
    ]),
    mk('Cardio / HIIT', 'cardio', [
      ['Jumping jacks', '5-6', '30 seg'], ['Burpees', '5-6', '30 seg'], ['Mountain climbers', '5-6', '30 seg'], ['High knees', '5-6', '30 seg']
    ]),
    mk('Core', 'core', [
      ['Plancha', '3', '30-45 seg'], ['Crunch bicicleta', '3', '20'], ['Elevación de piernas', '3', '12'], ['Plancha lateral', '3', '20 seg c/lado']
    ]),
    mk('Full body ligero', 'movilidad', [
      ['Circuito suave (repetir ejercicios de arriba, baja intensidad)', '1', '15-20 min']
    ])
  );
  save();
}

// ---------- Backup ----------
const Backup = {
  export: () => JSON.stringify(load(), null, 2),
  import: (jsonString) => {
    const parsed = JSON.parse(jsonString);
    _cache = Object.assign(defaultData(), parsed);
    save();
  },
  reset: () => {
    _cache = defaultData();
    save();
  }
};

window.DB = { load, save, uid, toISODate, todayISO, dayKeyFromDate, DIAS, DIAS_LARGO,
  Routines, Schedule, Goals, Todos, Settings, NotifiedLog, Backup, Japanese, seedDefinicionRoutines };
