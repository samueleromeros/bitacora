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
    routines: [],          // {id, name, tipo, color, exercises:[{id,name,sets,reps,notes,days:['lun','jue',...]}]}
    dateOverrides: {},      // {'2026-08-15': 'rest'} — marca un día puntual como descanso, pisando lo que tocaría ese día
    exerciseLog: {},        // {'2026-08-15': {exerciseId: seriesCompletadas, ...}}
    goals: [],              // {id, title, type, description, targetDate, numeric:{}, habit:{}, checklist:{}}
    todos: [],               // {id, title, date, time, done, reminder, notified}
    settings: {
      notificationsEnabled: false,
      leadMinutes: 15
    },
    notifiedLog: [],
    programs: {}            // { [goalId]: { weeks:[{id,weekNumber,title,objective,level,uploadedAt,rawText,days:[{id,num,title,theory,notaImportante,activity,test,characters:[{char,romaji}],lessonDone,testDone}]}] } } — objetivos tipo "programa" (japonés, piano, lo que sea)
  };
}

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? Object.assign(defaultData(), JSON.parse(raw)) : defaultData();
    // migración: rutinas viejas sin tipo asignado, y ejercicios viejos sin días asignados
    _cache.routines.forEach(r => {
      if (!r.tipo) r.tipo = 'fuerza';
      (r.exercises || []).forEach(ex => { if (!Array.isArray(ex.days)) ex.days = []; });
    });
    // migración única: si existía el horario semanal viejo (rutina completa por día), trasladar esos días a cada ejercicio de la rutina
    if (_cache.schedule && !_cache._migratedExerciseDays) {
      Object.keys(_cache.schedule).forEach(dayKey => {
        const val = _cache.schedule[dayKey];
        if (!Array.isArray(val)) return; // ignora 'rest' semanal viejo, no tiene equivalente por ejercicio
        val.forEach(routineId => {
          const r = _cache.routines.find(x => x.id === routineId);
          if (r) r.exercises.forEach(ex => { if (!ex.days.includes(dayKey)) ex.days.push(dayKey); });
        });
      });
      _cache._migratedExerciseDays = true;
      delete _cache.schedule;
      save();
    }
    // migración única: exerciseLog viejo era un array de ids "hecho/no hecho"; se convierte a conteo de series (completo)
    if (!_cache._migratedExerciseLogCount) {
      Object.keys(_cache.exerciseLog || {}).forEach(isoDate => {
        const val = _cache.exerciseLog[isoDate];
        if (Array.isArray(val)) {
          const obj = {};
          val.forEach(exId => {
            const routine = _cache.routines.find(r => (r.exercises || []).some(e => e.id === exId));
            const ex = routine && routine.exercises.find(e => e.id === exId);
            obj[exId] = ex ? parseSetsCount(ex.sets) : 1; // se marca como totalmente completo, como estaba antes
          });
          _cache.exerciseLog[isoDate] = obj;
        }
      });
      _cache._migratedExerciseLogCount = true;
      save();
    }
    // migración única: el viejo objetivo "japonés" (global, un solo programa para toda la app) pasa a
    // ser un objetivo de tipo "programa" con sus propias semanas, igual que cualquier otro programa nuevo
    if (_cache.japanese && !_cache._migratedPrograms) {
      if (!_cache.programs) _cache.programs = {};
      const oldWeeks = _cache.japanese.weeks || [];
      const jGoal = _cache.goals.find(g => g.type === 'japanese');
      if (jGoal) {
        jGoal.type = 'programa';
        _cache.programs[jGoal.id] = { weeks: oldWeeks };
      }
      delete _cache.japanese;
      _cache._migratedPrograms = true;
      save();
    }
    if (!_cache.programs) _cache.programs = {};
    // por si quedó algún objetivo viejo tipo "japanese" sin semanas asociadas
    _cache.goals.forEach(g => { if (g.type === 'japanese') g.type = 'programa'; });
    // migración única: los días viejos guardaban campos fijos (theory/notaImportante/activity/test);
    // ahora cada día guarda "blocks" genéricos para poder leer cualquier formato de plan (japonés, piano, etc.)
    if (!_cache._migratedProgramBlocks) {
      Object.values(_cache.programs).forEach(prog => {
        (prog.weeks || []).forEach(w => {
          (w.days || []).forEach(d => {
            if (!Array.isArray(d.blocks)) {
              const blocks = [];
              if (d.theory) blocks.push({ label: 'Teoría', content: d.theory, isTest: false });
              if (d.notaImportante) blocks.push({ label: 'Nota importante', content: d.notaImportante, isTest: false });
              if (d.activity) blocks.push({ label: 'Actividad', content: d.activity, isTest: false });
              if (d.test) blocks.push({ label: 'Prueba del día', content: d.test, isTest: true });
              d.blocks = blocks;
              delete d.theory; delete d.notaImportante; delete d.activity; delete d.test;
            }
          });
        });
      });
      _cache._migratedProgramBlocks = true;
      save();
    }
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
function sanitizeExercises(exercises) {
  return (exercises || []).map(ex => ({
    id: ex.id || uid(),
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    notes: ex.notes || '',
    days: Array.isArray(ex.days) ? ex.days : []
  }));
}
const Routines = {
  all: () => load().routines,
  get: (id) => load().routines.find(r => r.id === id),
  add: (routine) => {
    const data = load();
    const r = { id: uid(), name: routine.name, tipo: routine.tipo || 'fuerza', color: routine.color || '#9CAF88', exercises: sanitizeExercises(routine.exercises) };
    data.routines.push(r);
    save();
    return r;
  },
  update: (id, patch) => {
    const data = load();
    const r = data.routines.find(x => x.id === id);
    if (!r) return;
    if (patch.exercises) patch.exercises = sanitizeExercises(patch.exercises);
    Object.assign(r, patch);
    save();
  },
  remove: (id) => {
    const data = load();
    data.routines = data.routines.filter(r => r.id !== id);
    save();
  }
};

// ---------- Horario derivado de los días asignados a cada ejercicio + descanso puntual ----------
const Schedule = {
  getOverride: (isoDate) => load().dateOverrides[isoDate],
  setOverrideRest: (isoDate, isRest) => {
    const data = load();
    if (isRest) data.dateOverrides[isoDate] = 'rest';
    else delete data.dateOverrides[isoDate];
    save();
  },
  // Ejercicios (agrupados por rutina) que tocan un día de la semana ('lun'...'dom'), sin tener en cuenta overrides puntuales
  exercisesForDayKey: (dayKey) => {
    const items = [];
    load().routines.forEach(r => {
      (r.exercises || []).forEach(ex => {
        if ((ex.days || []).includes(dayKey)) items.push({ routine: r, exercise: ex });
      });
    });
    return items;
  },
  // Devuelve { rest: true } o { rest: false, items: [{routine, exercise}, ...] } para una fecha puntual
  exercisesForDate: (isoDate) => {
    const data = load();
    if (data.dateOverrides[isoDate] === 'rest') return { rest: true, items: [] };
    const d = new Date(isoDate + 'T00:00:00');
    const dayKey = dayKeyFromDate(d);
    return { rest: false, items: Schedule.exercisesForDayKey(dayKey) };
  }
};

// ---------- Registro de series completadas por ejercicio y por día (para la sesión de "Hoy") ----------
// exerciseLog[isoDate][exerciseId] = cantidad de series ya completadas ese día
function parseSetsCount(setsText) {
  if (!setsText) return 1;
  const m = String(setsText).match(/\d+/);
  if (!m) return 1;
  const n = parseInt(m[0], 10);
  return n > 0 ? n : 1;
}
const ExerciseLog = {
  getCount: (isoDate, exId) => (load().exerciseLog[isoDate] || {})[exId] || 0,
  isDone: (isoDate, exId, totalSets) => ExerciseLog.getCount(isoDate, exId) >= (totalSets || 1),
  // Suma una serie completada (usado al terminar el cronómetro de una serie); no supera el total
  incrementSet: (isoDate, exId, totalSets) => {
    const data = load();
    if (!data.exerciseLog[isoDate]) data.exerciseLog[isoDate] = {};
    const max = totalSets || 1;
    const cur = data.exerciseLog[isoDate][exId] || 0;
    data.exerciseLog[isoDate][exId] = Math.min(cur + 1, max);
    save();
    return data.exerciseLog[isoDate][exId];
  },
  // Toggle manual (botón sello): si no está completo del todo, lo completa; si ya estaba completo, lo reinicia a 0
  toggleFull: (isoDate, exId, totalSets) => {
    const data = load();
    if (!data.exerciseLog[isoDate]) data.exerciseLog[isoDate] = {};
    const max = totalSets || 1;
    const cur = data.exerciseLog[isoDate][exId] || 0;
    data.exerciseLog[isoDate][exId] = cur >= max ? 0 : max;
    save();
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
    if (data.programs) delete data.programs[id];
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

// ---------- Programas (objetivo tipo "programa": subís un .md por semana, sirve para cualquier tema — japonés, piano, etc.) ----------
// Cada objetivo (goal) de tipo "programa" tiene su propio set de semanas, guardado por goalId.
const Programs = {
  _ensure: (goalId) => {
    const data = load();
    if (!data.programs) data.programs = {};
    if (!data.programs[goalId]) data.programs[goalId] = { weeks: [] };
    return data.programs[goalId];
  },
  weeks: (goalId) => Programs._ensure(goalId).weeks,
  getWeek: (goalId, weekId) => Programs._ensure(goalId).weeks.find(w => w.id === weekId),
  addWeek: (goalId, week) => {
    const prog = Programs._ensure(goalId);
    const w = {
      id: uid(),
      weekNumber: week.weekNumber ?? null,
      title: week.title || 'Semana',
      subtitle: week.subtitle || '',
      objective: week.objective || '',
      level: week.level || '',
      uploadedAt: todayISO(),
      rawText: week.rawText || '',
      days: (week.days || []).map(d => ({
        id: uid(),
        num: d.num,
        title: d.title || '',
        blocks: (d.blocks || []).map(b => ({ label: b.label || '', content: b.content || '', isTest: !!b.isTest })),
        characters: d.characters || [],
        lessonDone: false,
        testDone: false
      }))
    };
    // orden: más reciente (por número de semana, si no hay número por fecha de carga) primero
    prog.weeks.unshift(w);
    save();
    return w;
  },
  removeWeek: (goalId, weekId) => {
    const prog = Programs._ensure(goalId);
    prog.weeks = prog.weeks.filter(w => w.id !== weekId);
    save();
  },
  toggleDay: (goalId, weekId, dayId, field) => { // field: 'lessonDone' | 'testDone'
    const prog = Programs._ensure(goalId);
    const w = prog.weeks.find(x => x.id === weekId);
    if (!w) return;
    const d = w.days.find(x => x.id === dayId);
    if (!d) return;
    d[field] = !d[field];
    save();
  },
  // Set de caracteres (string) que ya aparecieron en algún archivo subido de este programa (aplica a programas de idiomas, ej. japonés)
  learnedChars: (goalId) => {
    const set = new Set();
    Programs.weeks(goalId).forEach(w => w.days.forEach(d => (d.characters || []).forEach(c => set.add(c.char))));
    return set;
  },
  // Si alguna semana de este programa trajo caracteres (ej. japonés), la app muestra la pestaña "Caracteres";
  // si nunca trajo (ej. piano), esa pestaña queda oculta para ese objetivo.
  hasCharacters: (goalId) => Programs.weeks(goalId).some(w => w.days.some(d => (d.characters || []).length)),
  remove: (goalId) => {
    const data = load();
    if (data.programs) delete data.programs[goalId];
    save();
  }
};

// ---------- Semilla inicial: rutina de definición en casa ----------
function seedDefinicionRoutines() {
  const data = load();
  if (data.routines.length) return; // ya hay rutinas, no tocar nada
  const TIPO_COLORS = { fuerza: '#9CAF88', cardio: '#C2665A', core: '#7FA0C9', movilidad: '#B487C2', otro: '#D4A73C' };
  const mk = (name, tipo, day, exercises) => ({
    id: uid(), name, tipo, color: TIPO_COLORS[tipo],
    exercises: exercises.map(e => ({ id: uid(), name: e[0], sets: e[1], reps: e[2], days: [day] }))
  });
  data.routines.push(
    mk('Tren Superior', 'fuerza', 'lun', [
      ['Flexiones', '4', '10-15'], ['Fondos en silla', '3', '12'], ['Pike push-ups', '3', '10'],
      ['Plancha con toque de hombro', '3', '20 seg'], ['Superman', '3', '15']
    ]),
    mk('Tren Inferior', 'fuerza', 'mar', [
      ['Sentadillas', '4', '15'], ['Zancadas alternas', '3', '12 c/pierna'], ['Puente de glúteo', '3', '15'],
      ['Elevación de talones', '3', '20'], ['Sentadilla isométrica', '3', '30 seg']
    ]),
    mk('Cardio / HIIT', 'cardio', 'mie', [
      ['Jumping jacks', '5-6', '30 seg'], ['Burpees', '5-6', '30 seg'], ['Mountain climbers', '5-6', '30 seg'], ['High knees', '5-6', '30 seg']
    ]),
    mk('Core', 'core', 'jue', [
      ['Plancha', '3', '30-45 seg'], ['Crunch bicicleta', '3', '20'], ['Elevación de piernas', '3', '12'], ['Plancha lateral', '3', '20 seg c/lado']
    ]),
    mk('Full body ligero', 'movilidad', 'vie', [
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
  Routines, Schedule, Goals, Todos, Settings, NotifiedLog, Backup, Programs, seedDefinicionRoutines, ExerciseLog, parseSetsCount };
