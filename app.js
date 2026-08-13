// app.js — Vistas, render y formularios.
'use strict';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW_MON_FIRST = ['lun','mar','mie','jue','vie','sab','dom'];
const DOW_MON_LABEL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DOW_MON_LONG = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const ROUTINE_COLORS = ['#9CAF88', '#D4A73C', '#C2665A', '#7FA0C9', '#B487C2'];

const State = {
  view: 'hoy',
  calCursor: new Date(),           // mes que se muestra en el calendario
  selectedDay: DB.todayISO(),      // día seleccionado en el calendario
  todoFilter: 'pending'
};

// ================= Utilidades =================
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtLongDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function fmtShortDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`;
}
function stampSVG() {
  return '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19.5 7"/></svg>';
}

// ================= Navegación =================
function switchView(view) {
  State.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

  const titles = { hoy: 'Hoy', calendario: 'Calendario', rutinas: 'Rutinas', objetivos: 'Objetivos', tareas: 'Tareas', japones: 'Japonés' };
  document.getElementById('header-title').textContent = titles[view];
  document.getElementById('header-eyebrow').textContent = 'bitácora';
  document.getElementById('fab-add').style.display = (view === 'japones') ? 'none' : '';

  renderAll();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ================= Modal genérico =================
const backdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');

function openModal(html, onMount) {
  modalContent.innerHTML = html;
  backdrop.classList.add('open');
  if (onMount) onMount(modalContent);
}
function closeModal() {
  backdrop.classList.remove('open');
  modalContent.innerHTML = '';
}
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

// ================= Render: HOY =================
function renderHoy() {
  const iso = DB.todayISO();
  const d = new Date();
  document.getElementById('hoy-date-big').textContent = DOW_MON_LONG[(d.getDay() + 6) % 7];
  document.getElementById('hoy-date-sub').textContent = fmtLongDate(iso);

  // Rutina
  const routineId = DB.Schedule.routineForDate(iso);
  const routineBox = document.getElementById('hoy-routine');
  routineBox.innerHTML = renderRoutineForDay(routineId);

  // Tareas de hoy
  const todos = DB.Todos.byDate(iso).sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'));
  document.getElementById('hoy-todos').innerHTML = todos.length
    ? todos.map(todoRowHTML).join('')
    : emptyStateHTML('Sin tareas para hoy', 'Agregá una con el botón +');

  // Objetivos próximos (hábitos siempre + con vencimiento en 7 días)
  const goals = DB.Goals.all().filter(g => {
    if (g.type === 'habit') return true;
    if (g.targetDate) {
      const diff = (new Date(g.targetDate) - new Date(iso)) / 86400000;
      return diff >= 0 && diff <= 7;
    }
    return false;
  });
  document.getElementById('hoy-goals-title').style.display = goals.length ? '' : 'none';
  document.getElementById('hoy-goals').innerHTML = goals.map(goalCardHTML).join('');

  // racha más alta como incentivo visual
  const bestStreak = Math.max(0, ...DB.Goals.all().filter(g => g.type === 'habit').map(g => g.habit.streak || 0));
  const streakEl = document.getElementById('hoy-streak');
  if (bestStreak > 0) { streakEl.style.display = ''; streakEl.textContent = `🔥 racha ${bestStreak}`; }
  else streakEl.style.display = 'none';
}

function renderRoutineForDay(routineId) {
  if (!routineId) {
    return emptyStateHTML('No asignaste rutina para este día', 'Definila en la pestaña Rutinas');
  }
  if (routineId === 'rest') {
    return `<div class="card" style="border-left:3px solid var(--gold);">
      <h3 style="font-family:var(--font-display);margin:0;">Día de descanso</h3>
      <p style="color:var(--text-muted);font-size:13.5px;margin:6px 0 0;">Aprovechá para recuperar.</p>
    </div>`;
  }
  const r = DB.Routines.get(routineId);
  if (!r) return emptyStateHTML('Esa rutina ya no existe', '');
  return `<div class="card routine-card" style="--accent:${r.color}">
    <div class="rc-body">
      <h3>${esc(r.name)}</h3>
      ${r.exercises.map(ex => `<div class="exercise-row"><span>${esc(ex.name)}</span><span>${esc(ex.sets||'')}×${esc(ex.reps||'')}</span></div>`).join('') || '<div class="exercise-row"><span>Sin ejercicios cargados</span></div>'}
    </div>
  </div>`;
}

function emptyStateHTML(title, hint) {
  return `<div class="empty-state"><div class="es-icon">◌</div><p><strong style="color:var(--text)">${esc(title)}</strong>${hint ? '<br>' + esc(hint) : ''}</p></div>`;
}

function todoRowHTML(t) {
  return `<div class="todo-item ${t.done ? 'done' : ''}">
    <button class="stamp ${t.done ? 'done' : ''}" data-action="toggle-todo" data-id="${t.id}" aria-label="Marcar hecha">${stampSVG()}</button>
    <div class="ti-body" data-action="edit-todo" data-id="${t.id}">
      <div class="ti-title">${esc(t.title)}</div>
      <div class="ti-meta">${t.time ? t.time + ' · ' : ''}${fmtShortDate(t.date)}${t.reminder ? ' · 🔔' : ''}</div>
    </div>
    <button class="icon-btn btn-sm" data-action="delete-todo" data-id="${t.id}" aria-label="Eliminar" style="width:32px;height:32px;">✕</button>
  </div>`;
}

function goalCardHTML(g) {
  const typeLabel = { numeric: 'Progreso', habit: 'Hábito', checklist: 'Lista', japanese: 'Idioma' }[g.type];
  if (g.type === 'japanese') {
    const weeks = DB.Japanese.weeks();
    const learned = DB.Japanese.learnedChars();
    return `<div class="card goal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <span class="goal-type-badge">${typeLabel}</span>
          <h3>${esc(g.title)}</h3>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="edit-goal" data-id="${g.id}">✎</button>
          <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="delete-goal" data-id="${g.id}">✕</button>
        </div>
      </div>
      ${g.description ? `<p class="goal-desc">${esc(g.description)}</p>` : ''}
      <div class="ti-meta">${weeks.length} semana${weeks.length===1?'':'s'} cargada${weeks.length===1?'':'s'} · ${learned.size} caracteres aprendidos</div>
      <button class="btn btn-primary" style="margin-top:12px;" data-action="open-japones">Abrir programa de japonés</button>
    </div>`;
  }
  let inner = '';
  if (g.type === 'numeric') {
    const pct = Math.max(0, Math.min(100, Math.round((g.numeric.current / (g.numeric.target || 1)) * 100)));
    inner = `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label"><span>${esc(g.numeric.current)} ${esc(g.numeric.unit||'')}</span><span>meta: ${esc(g.numeric.target)} ${esc(g.numeric.unit||'')}</span></div>`;
  } else if (g.type === 'habit') {
    inner = `<div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="font-family:var(--font-mono);font-size:22px;color:var(--gold);">${g.habit.streak || 0} <span style="font-size:11px;color:var(--text-muted);">días seguidos</span></div>
      <button class="stamp ${g.habit.lastDone === DB.todayISO() ? 'done' : ''}" data-action="habit-done" data-id="${g.id}">${stampSVG()}</button>
    </div>`;
  } else if (g.type === 'checklist') {
    const items = g.checklist.items || [];
    const doneCount = items.filter(i => i.done).length;
    inner = `<div class="progress-track"><div class="progress-fill" style="width:${items.length ? (doneCount/items.length*100) : 0}%"></div></div>
      <div class="progress-label"><span>${doneCount}/${items.length} pasos</span></div>
      ${items.map(i => `<div class="checklist-item ${i.done?'done':''}"><button class="stamp ${i.done?'done':''}" style="--size:20px" data-action="toggle-checklist-item" data-goal="${g.id}" data-item="${i.id}">${stampSVG()}</button>${esc(i.text)}</div>`).join('')}`;
  }
  return `<div class="card goal-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div style="flex:1;min-width:0;">
        <span class="goal-type-badge">${typeLabel}</span>
        <h3>${esc(g.title)}</h3>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="edit-goal" data-id="${g.id}">✎</button>
        <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="delete-goal" data-id="${g.id}">✕</button>
      </div>
    </div>
    ${g.description ? `<p class="goal-desc">${esc(g.description)}</p>` : ''}
    ${inner}
    ${g.targetDate ? `<div class="ti-meta" style="margin-top:10px;">Vence: ${fmtShortDate(g.targetDate)}</div>` : ''}
  </div>`;
}

// ================= Render: CALENDARIO =================
function renderCalendario() {
  const cursor = State.calCursor;
  document.getElementById('cal-month-label').textContent = `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const dowRow = document.getElementById('cal-dow-row');
  dowRow.innerHTML = DOW_MON_LABEL.map(l => `<div class="cal-dow">${l}</div>`).join('');

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startOffset);
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const todayISO = DB.todayISO();
  let cells = '';
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const iso = DB.toISODate(cellDate);
    const outside = cellDate.getMonth() !== cursor.getMonth();

    const routineId = DB.Schedule.routineForDate(iso);
    const hasRoutine = routineId && routineId !== 'rest';
    const hasTodo = DB.Todos.byDate(iso).some(t => !t.done);
    const hasGoal = DB.Goals.all().some(g => g.targetDate === iso);

    const dots = [];
    if (hasRoutine) dots.push('<span class="dot sage"></span>');
    if (hasTodo) dots.push('<span class="dot gold"></span>');
    if (hasGoal) dots.push('<span class="dot text-muted"></span>');

    cells += `<button class="cal-day ${outside?'outside':''} ${iso===todayISO?'today':''} ${iso===State.selectedDay?'selected':''}" data-iso="${iso}">
      <span>${cellDate.getDate()}</span>
      <span class="dots">${dots.join('')}</span>
    </button>`;
  }
  document.getElementById('cal-grid').innerHTML = cells;
  renderDayDetail();
}

function renderDayDetail() {
  const iso = State.selectedDay;
  const routineId = DB.Schedule.routineForDate(iso);
  const todos = DB.Todos.byDate(iso);
  const goals = DB.Goals.all().filter(g => g.targetDate === iso);

  let routineLabel = 'Sin asignar';
  if (routineId === 'rest') routineLabel = 'Descanso';
  else if (routineId) routineLabel = DB.Routines.get(routineId)?.name || 'Rutina eliminada';

  document.getElementById('day-detail').innerHTML = `
    <div class="section-title">${fmtLongDate(iso)}</div>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-size:13px;color:var(--text-muted);">Entrenamiento</div><div style="margin-top:2px;">${esc(routineLabel)}</div></div>
      <button class="btn btn-ghost btn-sm" data-action="change-day-routine" data-iso="${iso}">Cambiar</button>
    </div>
    <div class="section-title">Tareas</div>
    ${todos.length ? todos.map(todoRowHTML).join('') : emptyStateHTML('Sin tareas este día', '')}
    ${goals.length ? `<div class="section-title">Objetivos que vencen</div>${goals.map(goalCardHTML).join('')}` : ''}
  `;
}

document.getElementById('cal-prev').addEventListener('click', () => {
  State.calCursor = new Date(State.calCursor.getFullYear(), State.calCursor.getMonth() - 1, 1);
  renderCalendario();
});
document.getElementById('cal-next').addEventListener('click', () => {
  State.calCursor = new Date(State.calCursor.getFullYear(), State.calCursor.getMonth() + 1, 1);
  renderCalendario();
});

// ================= Render: RUTINAS =================
function renderRutinas() {
  const schedCard = document.getElementById('weekly-schedule-card');
  const routines = DB.Routines.all();
  schedCard.innerHTML = DOW_MON_FIRST.map((key, idx) => {
    const current = DB.Schedule.getDay(key);
    return `<div class="settings-row" style="${idx===0?'border-top:none;':''}">
      <div class="sr-label">${DOW_MON_LONG[idx]}</div>
      <select data-action="set-schedule-day" data-day="${key}" style="background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 10px;font-size:13px;">
        <option value="">Sin asignar</option>
        <option value="rest" ${current==='rest'?'selected':''}>Descanso</option>
        ${routines.map(r => `<option value="${r.id}" ${current===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}
      </select>
    </div>`;
  }).join('');

  const list = DB.Routines.all();
  document.getElementById('routines-list').innerHTML = list.length ? list.map(r => `
    <div class="card routine-card" style="--accent:${r.color}">
      <div class="rc-body">
        <h3>${esc(r.name)}</h3>
        ${r.exercises.map(ex => `<div class="exercise-row"><span>${esc(ex.name)}</span><span>${esc(ex.sets||'')}×${esc(ex.reps||'')}</span></div>`).join('') || '<div class="exercise-row" style="color:var(--text-muted)"><span>Sin ejercicios</span></div>'}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="edit-routine" data-id="${r.id}">✎</button>
        <button class="icon-btn btn-sm" style="width:30px;height:30px;" data-action="delete-routine" data-id="${r.id}">✕</button>
      </div>
    </div>
  `).join('') : emptyStateHTML('Todavía no creaste rutinas', 'Tocá + para agregar la primera');
}

// ================= Render: OBJETIVOS =================
function renderObjetivos() {
  const goals = DB.Goals.all();
  document.getElementById('goals-list').innerHTML = goals.length
    ? goals.map(goalCardHTML).join('')
    : emptyStateHTML('Todavía no definiste objetivos', 'Tocá + para crear el primero');
}

// ================= Render: TAREAS =================
function renderTareas() {
  let todos = DB.Todos.all().slice().sort((a,b) => (a.date+((a.time)||'99:99')).localeCompare(b.date+((b.time)||'99:99')));
  if (State.todoFilter === 'pending') todos = todos.filter(t => !t.done);
  else if (State.todoFilter === 'done') todos = todos.filter(t => t.done);

  document.getElementById('todos-full-list').innerHTML = todos.length
    ? todos.map(todoRowHTML).join('')
    : emptyStateHTML('No hay tareas acá', '');
}

document.querySelectorAll('#todo-filter-row .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    State.todoFilter = chip.dataset.filter;
    document.querySelectorAll('#todo-filter-row .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderTareas();
  });
});

// ================= Render All =================
function renderAll() {
  renderHoy();
  renderCalendario();
  renderRutinas();
  renderObjetivos();
  renderTareas();
  if (typeof renderJapones === 'function') renderJapones();
}
window.addEventListener('bitacora:change', renderAll);

// ================= Formularios: RUTINA =================
function openRoutineForm(routineId) {
  const r = routineId ? DB.Routines.get(routineId) : { name: '', color: ROUTINE_COLORS[0], exercises: [] };
  let exRows = (r.exercises.length ? r.exercises : [{id: DB.uid(), name:'', sets:'', reps:''}]);

  function exerciseRowsHTML() {
    return exRows.map((ex, i) => `
      <div class="exercise-editor-row" data-ex-id="${ex.id}">
        <input type="text" placeholder="Ejercicio" value="${esc(ex.name)}" data-field="name">
        <input type="text" placeholder="Series" value="${esc(ex.sets)}" data-field="sets" style="max-width:60px;">
        <input type="text" placeholder="Reps" value="${esc(ex.reps)}" data-field="reps" style="max-width:60px;">
        <button class="remove-row-btn" type="button" data-remove-ex="${i}">✕</button>
      </div>`).join('');
  }

  openModal(`
    <h2>${routineId ? 'Editar rutina' : 'Nueva rutina'}</h2>
    <div class="field"><label>Nombre</label><input type="text" id="rt-name" value="${esc(r.name)}" placeholder="Ej: Empuje, Piernas..."></div>
    <div class="field"><label>Color</label><div class="color-dot-row" id="rt-colors">
      ${ROUTINE_COLORS.map(c => `<button type="button" class="color-dot ${c===r.color?'active':''}" data-color="${c}" style="background:${c}"></button>`).join('')}
    </div></div>
    <div class="field"><label>Ejercicios</label><div id="rt-exercises">${exerciseRowsHTML()}</div>
      <button class="btn btn-ghost btn-sm" type="button" id="rt-add-exercise">+ Agregar ejercicio</button>
    </div>
    <div class="btn-row" style="margin-top:18px;">
      <button class="btn btn-ghost" id="rt-cancel">Cancelar</button>
      <button class="btn btn-primary" id="rt-save">Guardar</button>
    </div>
    ${routineId ? '' : ''}
  `, (root) => {
    let selectedColor = r.color;
    root.querySelectorAll('#rt-colors .color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        root.querySelectorAll('#rt-colors .color-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    function syncExFromDOM() {
      root.querySelectorAll('.exercise-editor-row').forEach((row, i) => {
        exRows[i].name = row.querySelector('[data-field=name]').value;
        exRows[i].sets = row.querySelector('[data-field=sets]').value;
        exRows[i].reps = row.querySelector('[data-field=reps]').value;
      });
    }

    root.querySelector('#rt-add-exercise').addEventListener('click', () => {
      syncExFromDOM();
      exRows.push({ id: DB.uid(), name: '', sets: '', reps: '' });
      root.querySelector('#rt-exercises').innerHTML = exerciseRowsHTML();
    });
    root.querySelector('#rt-exercises').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-ex]');
      if (!btn) return;
      syncExFromDOM();
      exRows.splice(Number(btn.dataset.removeEx), 1);
      root.querySelector('#rt-exercises').innerHTML = exerciseRowsHTML();
    });

    root.querySelector('#rt-cancel').addEventListener('click', closeModal);
    root.querySelector('#rt-save').addEventListener('click', () => {
      syncExFromDOM();
      const name = root.querySelector('#rt-name').value.trim();
      if (!name) { root.querySelector('#rt-name').focus(); return; }
      const payload = { name, color: selectedColor, exercises: exRows.filter(x => x.name.trim()) };
      if (routineId) DB.Routines.update(routineId, payload);
      else DB.Routines.add(payload);
      closeModal();
    });
  });
}

// ================= Formularios: OBJETIVO =================
function openGoalForm(goalId) {
  const g = goalId ? DB.Goals.get(goalId) : null;
  let type = g ? g.type : 'numeric';

  function fieldsForType() {
    if (type === 'numeric') return `
      <div class="field-row">
        <div class="field"><label>Valor actual</label><input type="number" id="g-current" value="${g?.numeric.current ?? 0}"></div>
        <div class="field"><label>Meta</label><input type="number" id="g-target" value="${g?.numeric.target ?? 100}"></div>
      </div>
      <div class="field"><label>Unidad</label><input type="text" id="g-unit" value="${esc(g?.numeric.unit || '')}" placeholder="kg, km, páginas..."></div>`;
    if (type === 'habit') return `<div class="badge-note">Vas a poder marcar este objetivo como "hecho" cada día desde la vista Hoy u Objetivos, y la app te va a llevar la racha de días seguidos.</div>`;
    if (type === 'checklist') return `<div class="field"><label>Pasos (uno por línea)</label><textarea id="g-steps" rows="4" placeholder="Ej: Investigar opciones&#10;Reservar fecha&#10;Confirmar pago">${(g?.checklist.items||[]).map(i=>i.text).join('\n')}</textarea></div>`;
    if (type === 'japanese') return `<div class="badge-note">Este objetivo abre una sección propia donde vas a poder subir el archivo semanal que te genera Claude (lección + prueba) y revisar Hiragana, Katakana y Kanji por pestañas.</div>`;
    return '';
  }

  openModal(`
    <h2>${goalId ? 'Editar objetivo' : 'Nuevo objetivo'}</h2>
    <div class="field"><label>Tipo de objetivo</label>
      <div class="chip-row" id="g-type-row">
        <button type="button" class="chip ${type==='numeric'?'active':''}" data-type="numeric">Progreso numérico</button>
        <button type="button" class="chip ${type==='habit'?'active':''}" data-type="habit">Hábito diario</button>
        <button type="button" class="chip ${type==='checklist'?'active':''}" data-type="checklist">Lista de pasos</button>
        <button type="button" class="chip ${type==='japanese'?'active':''}" data-type="japanese">Japonés (programa)</button>
      </div>
    </div>
    <div class="field"><label>Título</label><input type="text" id="g-title" value="${esc(g?.title||'')}" placeholder="Ej: Correr 10km"></div>
    <div class="field"><label>Descripción (opcional)</label><textarea id="g-desc" rows="2">${esc(g?.description||'')}</textarea></div>
    <div id="g-type-fields">${fieldsForType()}</div>
    <div class="field"><label>Fecha límite (opcional)</label><input type="date" id="g-date" value="${g?.targetDate||''}"></div>
    <div class="btn-row" style="margin-top:18px;">
      <button class="btn btn-ghost" id="g-cancel">Cancelar</button>
      <button class="btn btn-primary" id="g-save">Guardar</button>
    </div>
  `, (root) => {
    root.querySelectorAll('#g-type-row .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        type = chip.dataset.type;
        root.querySelectorAll('#g-type-row .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        root.querySelector('#g-type-fields').innerHTML = fieldsForType();
      });
    });
    root.querySelector('#g-cancel').addEventListener('click', closeModal);
    root.querySelector('#g-save').addEventListener('click', () => {
      const title = root.querySelector('#g-title').value.trim();
      if (!title) { root.querySelector('#g-title').focus(); return; }
      const payload = {
        title,
        type,
        description: root.querySelector('#g-desc').value.trim(),
        targetDate: root.querySelector('#g-date').value || null
      };
      if (type === 'numeric') {
        payload.numeric = {
          current: Number(root.querySelector('#g-current').value) || 0,
          target: Number(root.querySelector('#g-target').value) || 100,
          unit: root.querySelector('#g-unit').value.trim()
        };
      } else if (type === 'checklist') {
        const lines = root.querySelector('#g-steps').value.split('\n').map(s => s.trim()).filter(Boolean);
        const prevItems = g?.checklist.items || [];
        payload.checklist = { items: lines.map(text => {
          const existing = prevItems.find(i => i.text === text);
          return { id: existing ? existing.id : DB.uid(), text, done: existing ? existing.done : false };
        })};
      } else if (type === 'habit') {
        payload.habit = g?.habit || { streak: 0, lastDone: null, frequency: 'daily' };
      }
      if (goalId) DB.Goals.update(goalId, payload);
      else DB.Goals.add(payload);
      closeModal();
    });
  });
}

// ================= Formularios: TAREA =================
function openTodoForm(todoId, presetDate) {
  const t = todoId ? DB.Todos.get(todoId) : null;
  openModal(`
    <h2>${todoId ? 'Editar tarea' : 'Nueva tarea'}</h2>
    <div class="field"><label>Título</label><input type="text" id="t-title" value="${esc(t?.title||'')}" placeholder="¿Qué hay que hacer?"></div>
    <div class="field-row">
      <div class="field"><label>Fecha</label><input type="date" id="t-date" value="${t?.date || presetDate || DB.todayISO()}"></div>
      <div class="field"><label>Hora (opcional)</label><input type="time" id="t-time" value="${t?.time||''}"></div>
    </div>
    <label class="check-row"><input type="checkbox" id="t-reminder" ${t?.reminder?'checked':''}> Avisarme con recordatorio</label>
    <div class="btn-row" style="margin-top:18px;">
      <button class="btn btn-ghost" id="t-cancel">Cancelar</button>
      <button class="btn btn-primary" id="t-save">Guardar</button>
    </div>
    ${todoId ? '<button class="btn btn-danger" id="t-delete" style="margin-top:10px;">Eliminar tarea</button>' : ''}
  `, (root) => {
    root.querySelector('#t-cancel').addEventListener('click', closeModal);
    root.querySelector('#t-save').addEventListener('click', () => {
      const title = root.querySelector('#t-title').value.trim();
      if (!title) { root.querySelector('#t-title').focus(); return; }
      const payload = {
        title,
        date: root.querySelector('#t-date').value || DB.todayISO(),
        time: root.querySelector('#t-time').value || null,
        reminder: root.querySelector('#t-reminder').checked
      };
      if (todoId) DB.Todos.update(todoId, payload);
      else DB.Todos.add(payload);
      closeModal();
    });
    if (todoId) root.querySelector('#t-delete').addEventListener('click', () => {
      DB.Todos.remove(todoId);
      closeModal();
    });
  });
}

// ================= Cambiar rutina de un día puntual =================
function openDayRoutineChanger(iso) {
  const routines = DB.Routines.all();
  const current = DB.Schedule.routineForDate(iso);
  openModal(`
    <h2>${fmtLongDate(iso)}</h2>
    <div class="field"><label>Entrenamiento para este día</label>
      <div class="chip-row" id="drc-row">
        <button type="button" class="chip ${!current?'active':''}" data-val="">Quitar</button>
        <button type="button" class="chip ${current==='rest'?'active':''}" data-val="rest">Descanso</button>
        ${routines.map(r => `<button type="button" class="chip ${current===r.id?'active':''}" data-val="${r.id}">${esc(r.name)}</button>`).join('')}
      </div>
    </div>
  `, (root) => {
    root.querySelectorAll('#drc-row .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        DB.Schedule.setOverride(iso, chip.dataset.val || null);
        closeModal();
      });
    });
  });
}

// ================= Ajustes =================
function openSettings() {
  const s = DB.Settings.get();
  openModal(`
    <h2>Ajustes</h2>
    <div class="settings-row">
      <div><div class="sr-label">Recordatorios</div><div class="sr-hint">Avisos de tareas, rutina del día y objetivos</div></div>
      <button class="switch ${s.notificationsEnabled?'on':''}" id="set-notif-toggle"></button>
    </div>
    <div class="settings-row">
      <div><div class="sr-label">Avisar con anticipación</div></div>
      <select id="set-lead" style="background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 10px;">
        ${[5,10,15,30,60].map(m => `<option value="${m}" ${s.leadMinutes===m?'selected':''}>${m} min</option>`).join('')}
      </select>
    </div>
    <div class="badge-note" style="margin-top:12px;">
      <strong>En iPhone:</strong> para recibir avisos, primero agregá esta app a tu pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí. Los recordatorios funcionan mientras la app está abierta o recién cerrada; iOS no permite que un sitio web despierte notificaciones con la app completamente cerrada por mucho tiempo.
    </div>

    <div class="section-title">Copia de seguridad</div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="set-export">Exportar</button>
      <button class="btn btn-ghost" id="set-import">Importar</button>
    </div>
    <input type="file" id="set-import-file" accept="application/json" style="display:none;">

    <div class="section-title">Zona de riesgo</div>
    <button class="btn btn-danger" id="set-reset">Borrar todos los datos</button>
  `, (root) => {
    const toggle = root.querySelector('#set-notif-toggle');
    toggle.addEventListener('click', async () => {
      if (!s.notificationsEnabled) {
        const perm = await Notifs.requestPermission();
        if (perm === 'granted') { DB.Settings.update({ notificationsEnabled: true }); toggle.classList.add('on'); Notifs.checkDue(); }
        else alert('No se activaron los permisos de notificación en el sistema.');
      } else {
        DB.Settings.update({ notificationsEnabled: false });
        toggle.classList.remove('on');
      }
    });
    root.querySelector('#set-lead').addEventListener('change', (e) => {
      DB.Settings.update({ leadMinutes: Number(e.target.value) });
    });
    root.querySelector('#set-export').addEventListener('click', () => {
      const blob = new Blob([DB.Backup.export()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bitacora-backup-${DB.todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    root.querySelector('#set-import').addEventListener('click', () => root.querySelector('#set-import-file').click());
    root.querySelector('#set-import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { DB.Backup.import(reader.result); closeModal(); }
        catch (err) { alert('El archivo no es una copia de seguridad válida.'); }
      };
      reader.readAsText(file);
    });
    root.querySelector('#set-reset').addEventListener('click', () => {
      if (confirm('Esto borra rutinas, objetivos y tareas de este dispositivo. ¿Continuar?')) {
        DB.Backup.reset();
        closeModal();
      }
    });
  });
}
document.getElementById('btn-settings').addEventListener('click', openSettings);

// ================= FAB contextual =================
document.getElementById('fab-add').addEventListener('click', () => {
  if (State.view === 'rutinas') openRoutineForm(null);
  else if (State.view === 'objetivos') openGoalForm(null);
  else if (State.view === 'calendario') openTodoForm(null, State.selectedDay);
  else openTodoForm(null, DB.todayISO());
});

// ================= Delegación de eventos global =================
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;

  if (action === 'toggle-todo') DB.Todos.toggleDone(id);
  else if (action === 'edit-todo') openTodoForm(id);
  else if (action === 'delete-todo') { if (confirm('¿Eliminar esta tarea?')) DB.Todos.remove(id); }
  else if (action === 'edit-goal') openGoalForm(id);
  else if (action === 'delete-goal') { if (confirm('¿Eliminar este objetivo?')) DB.Goals.remove(id); }
  else if (action === 'habit-done') DB.Goals.markHabitDone(id);
  else if (action === 'toggle-checklist-item') {
    const g = DB.Goals.get(el.dataset.goal);
    const item = g.checklist.items.find(i => i.id === el.dataset.item);
    item.done = !item.done;
    DB.Goals.update(g.id, { checklist: g.checklist });
  }
  else if (action === 'edit-routine') openRoutineForm(id);
  else if (action === 'delete-routine') { if (confirm('¿Eliminar esta rutina?')) DB.Routines.remove(id); }
  else if (action === 'change-day-routine') openDayRoutineChanger(el.dataset.iso);
});

document.addEventListener('change', (e) => {
  if (e.target.dataset.action === 'set-schedule-day') {
    DB.Schedule.setDay(e.target.dataset.day, e.target.value || null);
  }
});

document.addEventListener('click', (e) => {
  const day = e.target.closest('.cal-day');
  if (!day) return;
  State.selectedDay = day.dataset.iso;
  renderCalendario();
});

// ================= Arranque =================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW no registrado', err));
  });
}

renderAll();
Notifs.start();
