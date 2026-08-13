// programs.js — Parser genérico de cronograma semanal (.md) + vistas de Programa y Caracteres.
// Sirve para cualquier objetivo de tipo "programa" (japonés, piano, lo que sea), cada uno con sus propias semanas.
'use strict';

const ProgState = {
  goalId: null,          // id del objetivo (Goals) cuyo programa se está viendo ahora
  tab: 'programa',        // 'programa' | 'caracteres'
  charTab: 'hiragana',    // 'hiragana' | 'katakana' | 'kanji' — solo aplica si el programa trajo caracteres
  openWeekId: null        // semana actualmente expandida en Programa
};

// ================= Parser =================
// Convierte texto con **negrita**/*cursiva* y saltos de línea a HTML simple (sin dependencias externas).
function mdInline(text) {
  let s = esc(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

// Extrae bloques con etiqueta en negrita: soporta tanto viñetas en una línea
// ("- **Técnica (5 min):** texto...") como bloques de párrafo separados por líneas en blanco
// ("**Teoría:**\ntexto..."). Cualquier etiqueta en **negrita** se reconoce, sin lista fija —
// así sirve para japonés, piano o cualquier otro programa que genere Claude.
function progExtractBlocks(body) {
  const blocks = [];
  const re = /-?[ \t]*\*\*([^*]+?)\*\*:?[ \t]*\n?([\s\S]*?)(?=\n[ \t]*-?[ \t]*\*\*[^*]+\*\*|\n#{2,4}\s|\n---|$)/g;
  let m;
  while ((m = re.exec(body))) {
    const label = m[1].trim().replace(/:$/, '').trim();
    const content = m[2].trim();
    if (!label) continue;
    blocks.push({ label, content, isTest: /prueba/i.test(label) });
  }
  return blocks;
}

// Extrae pares "carácter (romaji)" cuando aparecen — útil para programas de idiomas (ej. japonés).
// En programas sin caracteres (ej. piano) simplemente no encuentra nada y esa parte se ignora.
function progExtractCharacters(body) {
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

// Texto introductorio de la semana: usa "## Objetivo de la semana" si existe (formato viejo),
// o si no, todo el texto entre el título y el primer día / primer separador "---" (formato genérico).
function progExtractIntro(text) {
  const objMatch = text.match(/##\s*Objetivo de la semana\s*\n([\s\S]*?)(?=\n##\s|\n---)/i);
  if (objMatch) return objMatch[1].trim();
  const afterTitle = text.replace(/^#[^\n]*\n?/, '');
  const introMatch = afterTitle.match(/^([\s\S]*?)(?=\n#{2,4}\s*Día\s*\d+|\n---)/);
  if (!introMatch) return '';
  return introMatch[1].replace(/^#{1,4}[^\n]*\n?/, '').trim();
}

// Formato admitido del .md (flexible, sirve para el que ya venía generando Claude):
// # Semana N — Título (Nivel opcional)   ó   # Nombre del plan — Semana N
// ## Subtítulo opcional
// texto introductorio libre (objetivo, duración, materiales, etc.)
// ---
// ### Día N: Título    ó    ## Día N — Título
// - **Cualquier etiqueta (duración opcional):** contenido...
function parseProgramWeekFile(text) {
  const titleMatch = text.match(/^#\s*(.+)$/m);
  const fullTitle = titleMatch ? titleMatch[1].trim() : 'Semana';
  const weekNumMatch = fullTitle.match(/Semana\s*(\d+)/i);
  const levelMatch = fullTitle.match(/\(([^)]+)\)\s*$/);

  const subtitleMatch = text.match(/^#[^\n]*\n##\s*([^\n]+)/);
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : '';

  const objective = progExtractIntro(text);

  const days = [];
  const dayRe = /#{2,4}\s*Día\s*(\d+)\s*[:\-–—]?\s*([^\n]*)\n([\s\S]*?)(?=\n#{2,4}\s*Día\s*\d+|\n#{2,4}\s*Cómo vamos a trabajar|\n#{2,4}\s*Cierre|\n---|$)/g;
  let m;
  while ((m = dayRe.exec(text))) {
    const body = m[3];
    days.push({
      num: Number(m[1]),
      title: m[2].trim(),
      blocks: progExtractBlocks(body),
      characters: progExtractCharacters(body)
    });
  }

  return {
    title: fullTitle.replace(/\s*\([^)]+\)\s*$/, '').trim(),
    subtitle,
    level: levelMatch ? levelMatch[1].trim() : '',
    weekNumber: weekNumMatch ? Number(weekNumMatch[1]) : null,
    objective,
    rawText: text,
    days
  };
}

// ================= Carga de archivo =================
function handleProgramFileUpload(file, goalId) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseProgramWeekFile(String(reader.result));
      if (!parsed.days.length) {
        alert('No pude reconocer días en este archivo. Revisá que use el formato "## Día N — Título".');
        return;
      }
      const w = DB.Programs.addWeek(goalId, parsed);
      ProgState.openWeekId = w.id;
    } catch (err) {
      console.error(err);
      alert('No pude leer ese archivo. Asegurate de que sea el .md/.txt que te generó Claude.');
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ================= Render: Programa =================
function progWeekCardHTML(w) {
  const totalDays = w.days.length;
  const doneDays = w.days.filter(d => d.lessonDone).length;
  const testsDone = w.days.filter(d => d.testDone).length;
  const testsTotal = w.days.filter(d => d.blocks.some(b => b.isTest)).length;
  const open = ProgState.openWeekId === w.id;

  return `<div class="card jp-week-card">
    <div class="jp-week-header" data-action="prog-toggle-week" data-id="${w.id}">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="margin:0;">${esc(w.title)}</h3>
        </div>
        ${w.subtitle ? `<div class="ti-meta" style="margin-top:2px;">${esc(w.subtitle)}</div>` : ''}
        <div class="ti-meta" style="margin-top:4px;">${totalDays} días · ${doneDays}/${totalDays} lecciones${testsTotal ? ` · ${testsDone}/${testsTotal} pruebas` : ''} · subida ${fmtShortDate(w.uploadedAt)}</div>
      </div>
      <button class="icon-btn btn-sm" style="width:30px;height:30px;flex-shrink:0;" data-action="prog-delete-week" data-id="${w.id}" aria-label="Eliminar semana">✕</button>
      <span style="margin-left:6px;color:var(--text-muted);flex-shrink:0;">${open ? '▲' : '▼'}</span>
    </div>
    ${open ? `
      ${w.objective ? `<p class="goal-desc" style="margin-top:12px;">${mdInline(w.objective)}</p>` : ''}
      <div class="jp-days-list">
        ${w.days.map(d => progDayRowHTML(w.id, d)).join('')}
      </div>
    ` : ''}
  </div>`;
}

function progDayRowHTML(weekId, d) {
  const testBlocks = d.blocks.filter(b => b.isTest);
  const otherBlocks = d.blocks.filter(b => !b.isTest);
  return `<div class="jp-day-row ${d.lessonDone ? 'done' : ''}">
    <div class="jp-day-head">
      <button class="stamp" style="--size:24px" data-action="prog-toggle-lesson" data-week="${weekId}" data-day="${d.id}" aria-label="Marcar lección hecha">${stampSVG()}</button>
      <div style="flex:1;min-width:0;">
        <div class="jp-day-title">Día ${d.num}${d.title ? ' — ' + esc(d.title) : ''}</div>
        ${d.characters.length ? `<div class="ti-meta">${d.characters.map(c => esc(c.char)).join(' ')}</div>` : ''}
      </div>
    </div>
    ${otherBlocks.map(b => `<div class="jp-day-block"><span class="jp-block-label">${esc(b.label)}</span><p>${mdInline(b.content)}</p></div>`).join('')}
    ${testBlocks.map(b => `<div class="jp-day-block jp-test-block">
        <span class="jp-block-label">${esc(b.label)}</span>
        <p>${mdInline(b.content)}</p>
        <button class="btn btn-sm ${d.testDone ? 'btn-ghost' : 'btn-primary'}" data-action="prog-toggle-test" data-week="${weekId}" data-day="${d.id}">${d.testDone ? '✓ Prueba hecha' : 'Marcar prueba como hecha'}</button>
      </div>`).join('')}
  </div>`;
}

function renderProgramaPanel() {
  if (!ProgState.goalId) return;
  const weeks = DB.Programs.weeks(ProgState.goalId);
  document.getElementById('jp-weeks-list').innerHTML = weeks.length
    ? weeks.map(progWeekCardHTML).join('')
    : emptyStateHTML('Todavía no subiste ninguna semana', 'Subí el archivo .md que te genera Claude con la lección y la prueba');
}

// ================= Render: Caracteres (solo si este programa trajo caracteres, ej. japonés) =================
function progCharGroupsFor(tab) {
  if (tab === 'hiragana') return window.HIRAGANA_GROUPS;
  if (tab === 'katakana') return window.KATAKANA_GROUPS;
  return window.KANJI_N5_GROUPS;
}

function renderProgramaCaracteres() {
  const learned = DB.Programs.learnedChars(ProgState.goalId);
  const groups = progCharGroupsFor(ProgState.charTab);
  const isKanji = ProgState.charTab === 'kanji';

  const allChars = groups.flatMap(g => g.chars);
  const learnedCount = allChars.filter(c => learned.has(c[0])).length;
  document.getElementById('jp-char-progress').textContent = `${learnedCount}/${allChars.length} aprendidos (según las semanas que subiste)`;

  document.getElementById('jp-char-grid').innerHTML = groups.map(g => `
    <div class="jp-char-group">
      <div class="jp-char-group-label">${esc(g.label)}</div>
      <div class="char-grid">
        ${g.chars.map(c => {
          const isLearned = learned.has(c[0]);
          return `<button type="button" class="char-cell ${isLearned ? 'learned' : ''}" data-action="prog-char-info" data-char="${esc(c[0])}" data-romaji="${esc(c[1] || '')}" data-meaning="${esc(isKanji ? (c[2] || '') : '')}">
            <span class="cc-char">${esc(c[0])}</span>
            <span class="cc-romaji">${esc(c[1] || '')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function openProgCharInfo(char, romaji, meaning) {
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

// ================= Abrir el programa de un objetivo específico =================
function openPrograma(goalId) {
  ProgState.goalId = goalId;
  ProgState.openWeekId = null;
  ProgState.tab = 'programa';
  switchView('programa');
}

// ================= Render conjunto (llamado desde renderAll) =================
function renderPrograma() {
  if (!ProgState.goalId) return;
  const g = DB.Goals.get(ProgState.goalId);
  if (State.view === 'programa') {
    document.getElementById('header-title').textContent = g ? g.title : 'Programa';
    document.getElementById('header-eyebrow').textContent = 'programa';
  }

  const hasChars = DB.Programs.hasCharacters(ProgState.goalId);
  const charTabBtn = document.getElementById('jp-char-tab-btn');
  if (charTabBtn) charTabBtn.style.display = hasChars ? '' : 'none';
  if (!hasChars && ProgState.tab === 'caracteres') ProgState.tab = 'programa';

  document.querySelectorAll('#jp-main-tabs .chip').forEach(c => c.classList.toggle('active', c.dataset.jptab === ProgState.tab));
  document.getElementById('jp-programa-panel').style.display = ProgState.tab === 'programa' ? '' : 'none';
  document.getElementById('jp-caracteres-panel').style.display = ProgState.tab === 'caracteres' ? '' : 'none';

  renderProgramaPanel();
  if (hasChars) renderProgramaCaracteres();
}

// ================= Navegación interna =================
document.getElementById('jp-back').addEventListener('click', () => switchView('objetivos'));

document.querySelectorAll('#jp-main-tabs .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    ProgState.tab = chip.dataset.jptab;
    renderPrograma();
  });
});

document.querySelectorAll('#jp-char-tabs .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    ProgState.charTab = chip.dataset.chartab;
    document.querySelectorAll('#jp-char-tabs .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderProgramaCaracteres();
  });
});

document.getElementById('jp-upload-btn').addEventListener('click', () => {
  document.getElementById('jp-upload-file').click();
});
document.getElementById('jp-upload-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && ProgState.goalId) handleProgramFileUpload(file, ProgState.goalId);
  e.target.value = '';
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'prog-toggle-week') {
    const id = el.dataset.id;
    ProgState.openWeekId = ProgState.openWeekId === id ? null : id;
    renderProgramaPanel();
  } else if (action === 'prog-delete-week') {
    if (confirm('¿Eliminar esta semana del programa? Los caracteres que solo aparecían acá dejarán de marcarse como aprendidos.')) {
      DB.Programs.removeWeek(ProgState.goalId, el.dataset.id);
    }
  } else if (action === 'prog-toggle-lesson') {
    DB.Programs.toggleDay(ProgState.goalId, el.dataset.week, el.dataset.day, 'lessonDone');
  } else if (action === 'prog-toggle-test') {
    DB.Programs.toggleDay(ProgState.goalId, el.dataset.week, el.dataset.day, 'testDone');
  } else if (action === 'prog-char-info') {
    openProgCharInfo(el.dataset.char, el.dataset.romaji, el.dataset.meaning);
  }
});
