// japanese.js — Parser del cronograma semanal + vistas de Programa y Caracteres.
'use strict';

const JPState = {
  tab: 'programa',      // 'programa' | 'caracteres'
  charTab: 'hiragana',  // 'hiragana' | 'katakana' | 'kanji'
  openWeekId: null       // semana actualmente expandida en Programa
};

// ================= Parser =================
// Extrae el contenido de una sección tipo "**Nombre:**\n...texto..." hasta el
// próximo encabezado en negrita, separador "---" o el final del bloque.
function jpExtractSection(body, label) {
  const re = new RegExp('\\*\\*' + label + '[^*]*\\*\\*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\*\\*[^*]+\\*\\*|\\n---|$)', 'i');
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

// Extrae pares "carácter (romaji)" — solo coincide cuando dentro del paréntesis
// hay romaji puro (sin "=", que es lo que usan las líneas de vocabulario con traducción).
function jpExtractCharacters(body) {
  const re = /([ぁ-んァ-ヶー一-龯]{1,3})\s*\(([a-zA-Z\/\-\s]+)\)/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(body))) {
    const char = m[1].trim();
    const romaji = m[2].trim();
    const key = char + '|' + romaji;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ char, romaji });
  }
  return out;
}

function parseJapaneseWeekFile(text) {
  const titleMatch = text.match(/^#\s*(.+)$/m);
  const fullTitle = titleMatch ? titleMatch[1].trim() : 'Semana';
  const weekNumMatch = fullTitle.match(/Semana\s*(\d+)/i);
  const levelMatch = fullTitle.match(/\(([^)]+)\)\s*$/);

  const objMatch = text.match(/##\s*Objetivo de la semana\s*\n([\s\S]*?)(?=\n##\s|\n---)/i);
  const objective = objMatch ? objMatch[1].trim() : '';

  const days = [];
  const dayRe = /##\s*Día\s*(\d+)\s*[—\-–]\s*([^\n]+)\n([\s\S]*?)(?=\n##\s*Día\s*\d+|\n##\s*Cómo vamos a trabajar|\n##\s*Cierre|$)/g;
  let m;
  while ((m = dayRe.exec(text))) {
    const body = m[3];
    days.push({
      num: Number(m[1]),
      title: m[2].trim(),
      theory: jpExtractSection(body, 'Teoría[^*]*'),
      notaImportante: jpExtractSection(body, 'Nota importante'),
      activity: jpExtractSection(body, 'Actividad'),
      test: jpExtractSection(body, 'Prueba del día[^*]*'),
      characters: jpExtractCharacters(body)
    });
  }

  return {
    title: fullTitle.replace(/\s*\([^)]+\)\s*$/, '').trim(),
    level: levelMatch ? levelMatch[1].trim() : '',
    weekNumber: weekNumMatch ? Number(weekNumMatch[1]) : null,
    objective,
    rawText: text,
    days
  };
}

// ================= Carga de archivo =================
function handleJapaneseFileUpload(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseJapaneseWeekFile(String(reader.result));
      if (!parsed.days.length) {
        alert('No pude reconocer días en este archivo. Revisá que use el formato "## Día N — Título".');
        return;
      }
      const w = DB.Japanese.addWeek(parsed);
      JPState.openWeekId = w.id;
    } catch (err) {
      console.error(err);
      alert('No pude leer ese archivo. Asegurate de que sea el .md/.txt del cronograma.');
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ================= Render: Programa =================
function jpWeekCardHTML(w) {
  const totalDays = w.days.length;
  const doneDays = w.days.filter(d => d.lessonDone).length;
  const testsDone = w.days.filter(d => d.testDone).length;
  const testsTotal = w.days.filter(d => d.test).length;
  const open = JPState.openWeekId === w.id;

  return `<div class="card jp-week-card">
    <div class="jp-week-header" data-action="jp-toggle-week" data-id="${w.id}">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="margin:0;">${esc(w.title)}${w.weekNumber ? '' : ''}</h3>
        </div>
        <div class="ti-meta" style="margin-top:4px;">${totalDays} días · ${doneDays}/${totalDays} lecciones${testsTotal ? ` · ${testsDone}/${testsTotal} pruebas` : ''} · subida ${fmtShortDate(w.uploadedAt)}</div>
      </div>
      <button class="icon-btn btn-sm" style="width:30px;height:30px;flex-shrink:0;" data-action="jp-delete-week" data-id="${w.id}" aria-label="Eliminar semana">✕</button>
      <span style="margin-left:6px;color:var(--text-muted);flex-shrink:0;">${open ? '▲' : '▼'}</span>
    </div>
    ${open ? `
      ${w.objective ? `<p class="goal-desc" style="margin-top:12px;">${esc(w.objective)}</p>` : ''}
      <div class="jp-days-list">
        ${w.days.map(d => jpDayRowHTML(w.id, d)).join('')}
      </div>
    ` : ''}
  </div>`;
}

function jpDayRowHTML(weekId, d) {
  return `<div class="jp-day-row ${d.lessonDone ? 'done' : ''}">
    <div class="jp-day-head">
      <button class="stamp" style="--size:24px" data-action="jp-toggle-lesson" data-week="${weekId}" data-day="${d.id}" aria-label="Marcar lección hecha">${stampSVG()}</button>
      <div style="flex:1;min-width:0;">
        <div class="jp-day-title">Día ${d.num} — ${esc(d.title)}</div>
        ${d.characters.length ? `<div class="ti-meta">${d.characters.map(c => esc(c.char)).join(' ')}</div>` : ''}
      </div>
    </div>
    ${d.theory ? `<div class="jp-day-block"><span class="jp-block-label">Teoría</span><p>${esc(d.theory)}</p></div>` : ''}
    ${d.notaImportante ? `<div class="jp-day-block"><span class="jp-block-label">Nota importante</span><p>${esc(d.notaImportante)}</p></div>` : ''}
    ${d.activity ? `<div class="jp-day-block"><span class="jp-block-label">Actividad</span><p>${esc(d.activity)}</p></div>` : ''}
    ${d.test ? `<div class="jp-day-block jp-test-block">
        <span class="jp-block-label">Prueba del día</span>
        <p>${esc(d.test)}</p>
        <button class="btn btn-sm ${d.testDone ? 'btn-ghost' : 'btn-primary'}" data-action="jp-toggle-test" data-week="${weekId}" data-day="${d.id}">${d.testDone ? '✓ Prueba hecha' : 'Marcar prueba como hecha'}</button>
      </div>` : ''}
  </div>`;
}

function renderJaponesPrograma() {
  const weeks = DB.Japanese.weeks();
  document.getElementById('jp-weeks-list').innerHTML = weeks.length
    ? weeks.map(jpWeekCardHTML).join('')
    : emptyStateHTML('Todavía no subiste ninguna semana', 'Subí el archivo .md que te genera Claude con la lección y la prueba');
}

// ================= Render: Caracteres =================
function jpCharGroupsFor(tab) {
  if (tab === 'hiragana') return window.HIRAGANA_GROUPS;
  if (tab === 'katakana') return window.KATAKANA_GROUPS;
  return window.KANJI_N5_GROUPS;
}

function renderJaponesCaracteres() {
  const learned = DB.Japanese.learnedChars();
  const groups = jpCharGroupsFor(JPState.charTab);
  const isKanji = JPState.charTab === 'kanji';

  const allChars = groups.flatMap(g => g.chars);
  const learnedCount = allChars.filter(c => learned.has(c[0])).length;
  document.getElementById('jp-char-progress').textContent = `${learnedCount}/${allChars.length} aprendidos (según las semanas que subiste)`;

  document.getElementById('jp-char-grid').innerHTML = groups.map(g => `
    <div class="jp-char-group">
      <div class="jp-char-group-label">${esc(g.label)}</div>
      <div class="char-grid">
        ${g.chars.map(c => {
          const isLearned = learned.has(c[0]);
          return `<button type="button" class="char-cell ${isLearned ? 'learned' : ''}" data-action="jp-char-info" data-char="${esc(c[0])}" data-romaji="${esc(c[1] || '')}" data-meaning="${esc(isKanji ? (c[2] || '') : '')}">
            <span class="cc-char">${esc(c[0])}</span>
            <span class="cc-romaji">${esc(c[1] || '')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function openJpCharInfo(char, romaji, meaning) {
  openModal(`
    <div style="text-align:center;padding:8px 0 4px;">
      <div style="font-family:var(--font-display);font-size:56px;line-height:1;">${esc(char)}</div>
      <div class="ti-meta" style="font-size:14px;margin-top:10px;">${esc(romaji)}</div>
      ${meaning ? `<div style="margin-top:6px;color:var(--text-muted);font-size:13.5px;">${esc(meaning)}</div>` : ''}
    </div>
    <button class="btn btn-ghost" style="margin-top:16px;" id="jp-char-close">Cerrar</button>
  `, (root) => {
    root.querySelector('#jp-char-close').addEventListener('click', closeModal);
  });
}

// ================= Render conjunto =================
function renderJapones() {
  renderJaponesPrograma();
  renderJaponesCaracteres();
}

// ================= Navegación interna =================
document.getElementById('jp-back').addEventListener('click', () => switchView('objetivos'));

document.querySelectorAll('#jp-main-tabs .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    JPState.tab = chip.dataset.jptab;
    document.querySelectorAll('#jp-main-tabs .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    document.getElementById('jp-programa-panel').style.display = JPState.tab === 'programa' ? '' : 'none';
    document.getElementById('jp-caracteres-panel').style.display = JPState.tab === 'caracteres' ? '' : 'none';
  });
});

document.querySelectorAll('#jp-char-tabs .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    JPState.charTab = chip.dataset.chartab;
    document.querySelectorAll('#jp-char-tabs .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderJaponesCaracteres();
  });
});

document.getElementById('jp-upload-btn').addEventListener('click', () => {
  document.getElementById('jp-upload-file').click();
});
document.getElementById('jp-upload-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleJapaneseFileUpload(file);
  e.target.value = '';
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'jp-toggle-week') {
    const id = el.dataset.id;
    JPState.openWeekId = JPState.openWeekId === id ? null : id;
    renderJaponesPrograma();
  } else if (action === 'jp-delete-week') {
    if (confirm('¿Eliminar esta semana del programa? Los caracteres que solo aparecían acá dejarán de marcarse como aprendidos.')) {
      DB.Japanese.removeWeek(el.dataset.id);
    }
  } else if (action === 'jp-toggle-lesson') {
    DB.Japanese.toggleDay(el.dataset.week, el.dataset.day, 'lessonDone');
  } else if (action === 'jp-toggle-test') {
    DB.Japanese.toggleDay(el.dataset.week, el.dataset.day, 'testDone');
  } else if (action === 'jp-char-info') {
    openJpCharInfo(el.dataset.char, el.dataset.romaji, el.dataset.meaning);
  } else if (action === 'open-japones') {
    switchView('japones');
  }
});
