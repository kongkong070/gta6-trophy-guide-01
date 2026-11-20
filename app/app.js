// Leonida Legend — offline GTA VI trophy tracker.
// Loads app/data/trophies.json (same folder, no network), keeps earned ticks in
// localStorage, and renders the checklist, kind/grade filters, spoiler mode and
// the per-trophy guide panel. Export/import move the earned list as JSON.

const STORAGE_KEY = 'leonida-legend-earned-v1';
const SPOILER_KEY = 'leonida-legend-spoilers-v1';

const ROADMAP = [
  { title: 'Stage 1 — Play the story, Chapters 1–2', text: 'Finish Chapters 1 and 2 and the opening mission Gone Fishing. From Chapter 2 mission Coffee Break you can switch between Jason and Lucia and call your partner into free roam — most partner trophies open up here. Scan every new vehicle with WAiNK and study animals with binoculars as you go; both count toward later trophies and the 100% checklist.' },
  { title: 'Stage 2 — The one thing you must not miss', text: 'In Chapter 1, after the mission Down to Earth, talk to Lucia in the kitchen in the morning and accept her invitation to meditate on the balcony. It is the only trophy PowerPyx flags as possibly missable. Keep a manual save at the start of every chapter anyway — there is no mission replay.' },
  { title: 'Stage 3 — Chapters 3–4 and the stranger questlines', text: 'Finish the story (Chapters 3 and 4, then the final mission). Along the way, take the calls and texts that start the stranger questlines — Andy (Lucia only, Chapter 3), Kenton (Chapter 1, Key Lento), Billy (Chapter 2, Thrillbilly Mud Club), Randy (Chapter 3, after Clonin\u2019 Keys, Makin\u2019 GS) and Tyrone (Chapter 3, Jason only) — and finish each one\u2019s final mission. Strangers & Freaks needs 8 stranger strands; the named questlines above do not all count toward it.' },
  { title: 'Stage 4 — Activities, robberies and collectibles', text: 'Work the open world: 250 stunts (397 exist), gold medals at all 12 shooting ranges (42 challenges), drone races at all 14 locations, 20 different races, 3 card sets (18 exist), WAiNK scans at 100 locations, 100 vehicles discovered, bank vaults, gang operations, and the money trophies. Most of this overlaps with the 100% checklist, so do it in the same pass.' },
  { title: 'Stage 5 — 100% completion, then the platinum', text: 'Open Progress > Stats > 100% Completion after the story and finish the checklist — it is closer to 60% true completion and needs only 70 of 80 challenges. A Long Road (gold) is the last big gate; Vice Got a Price! (platinum) pops when the other 54 are earned.' },
];

const params = new URLSearchParams(location.search);
const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailBody');
const searchBox = document.getElementById('searchBox');
const gradeFilter = document.getElementById('gradeFilter');
const earnedOnlyBox = document.getElementById('earnedOnly');
const spoilerBox = document.getElementById('spoilerToggle');
const statusMsg = document.getElementById('statusMsg');

let trophies = [];
let earned = new Set();
let activeKind = params.get('kind') || 'all';
let selectedId = null;

try { earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); } catch { earned = new Set(); }
if (params.get('spoiler') === '0') spoilerBox.checked = false;
if (params.get('spoiler') === '1') spoilerBox.checked = true;
try { if (localStorage.getItem(SPOILER_KEY) !== null && !params.has('spoiler')) spoilerBox.checked = localStorage.getItem(SPOILER_KEY) === '1'; } catch { /* private mode */ }

function saveEarned() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort())); } catch { /* private mode */ }
}

function saveSpoiler() {
  try { localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? '1' : '0'); } catch { /* private mode */ }
}

function isStory(t) { return (t.kinds || []).includes('story'); }
function spoilerHides(t) { return spoilerBox.checked && isStory(t) && !earned.has(t.name); }

function showStatus(text) {
  statusMsg.textContent = text;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { statusMsg.textContent = ''; }, 4000);
}

function renderRoadmap() {
  const ol = document.getElementById('roadmapSteps');
  ol.replaceChildren();
  for (const step of ROADMAP) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = step.title + ' — ';
    li.append(strong, document.createTextNode(step.text));
    ol.append(li);
  }
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  document.getElementById('progressCount').textContent = `${done} of ${total} earned`;
  document.getElementById('progressPct').textContent = total ? `${Math.round((done / total) * 100)}%` : '0%';
  document.getElementById('progressFill').style.width = total ? `${(done / total) * 100}%` : '0%';
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.name)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  const totals = {};
  for (const t of trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  document.getElementById('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${g} ${byGrade[g] || 0}/${totals[g] || 0}`).join(' · ');
}

function matchesFilters(t) {
  if (activeKind !== 'all') {
    if (activeKind === 'missable') { if (!t.missable) return false; }
    else if (activeKind === 'online') return false; // no online trophies exist
    else if (!(t.kinds || []).includes(activeKind)) return false;
  }
  if (gradeFilter.value !== 'all' && t.grade !== gradeFilter.value) return false;
  if (earnedOnlyBox.checked && !earned.has(t.name)) return false;
  const q = searchBox.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${(t.steps || []).join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderKindCounts() {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of trophies) {
    if (t.missable) counts.missable += 1;
    for (const k of t.kinds || []) if (k !== 'missable' && counts[k] !== undefined) counts[k] += 1;
  }
  for (const el of document.querySelectorAll('[data-count]')) {
    el.textContent = `(${counts[el.dataset.count] ?? 0})`;
  }
}

function renderList() {
  listEl.replaceChildren();
  const shown = trophies.filter(matchesFilters);
  document.getElementById('shownCount').textContent = `— showing ${shown.length} of ${trophies.length}`;
  document.getElementById('emptyMsg').hidden = shown.length > 0;
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy-item' + (earned.has(t.name) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveEarned();
      renderProgress();
      renderList();
      renderDetail();
    });
    box.addEventListener('click', (e) => e.stopPropagation());
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = spoilerHides(t) ? 'Hidden story trophy — earn it to reveal' : t.name;
    const desc = document.createElement('div');
    desc.className = 'trophy-desc' + (spoilerHides(t) ? ' spoiler-hidden' : '');
    desc.textContent = spoilerHides(t) ? 'Name and description hidden until earned (spoiler setting on).' : t.description;
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    for (const k of t.kinds || []) {
      const tag = document.createElement('span');
      tag.className = 'tag' + (k === 'story' ? ' story' : '');
      tag.textContent = k;
      tags.append(tag);
    }
    if (t.missable) {
      const tag = document.createElement('span');
      tag.className = 'tag missable';
      tag.textContent = '⚠ Missable';
      tags.append(tag);
    }
    if (t.stage) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `Roadmap stage ${t.stage}`;
      tags.append(tag);
    }
    body.append(name, desc, tags);
    const badge = document.createElement('span');
    badge.className = `grade-badge grade-${t.grade}`;
    badge.textContent = t.grade;
    li.append(box, body, badge);
    li.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    listEl.append(li);
  }
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    detailEl.innerHTML = '<p class="detail-empty">Pick a trophy from the checklist to see its guide, steps and sources here.</p>';
    return;
  }
  detailEl.replaceChildren();
  const grade = document.createElement('p');
  grade.className = 'detail-grade';
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${t.grade}`;
  badge.textContent = t.grade;
  grade.append(badge);
  const name = document.createElement('h3');
  name.className = 'detail-name';
  name.textContent = spoilerHides(t) ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = spoilerHides(t) ? 'Spoilers are hidden until this trophy is earned. Tick it in the checklist to reveal it.' : `Official description: ${t.description}`;
  detailEl.append(grade, name, desc);
  if (!spoilerHides(t)) {
    const guide = document.createElement('div');
    guide.className = 'detail-guide';
    for (const para of String(t.guide).split('\n\n')) {
      const p = document.createElement('p');
      p.textContent = para;
      guide.append(p);
    }
    detailEl.append(guide);
    if (t.steps && t.steps.length) {
      const ol = document.createElement('ol');
      ol.className = 'detail-steps';
      for (const s of t.steps) {
        const li = document.createElement('li');
        li.textContent = s;
        ol.append(li);
      }
      detailEl.append(ol);
    }
    const src = document.createElement('div');
    src.className = 'detail-sources';
    const label = document.createElement('strong');
    label.textContent = 'Sources for this guide:';
    src.append(label);
    for (const s of t.sources || []) {
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.name;
      a.target = '_blank';
      a.rel = 'noopener';
      src.append(a);
    }
    detailEl.append(src);
    const meta = document.createElement('p');
    meta.className = 'detail-meta';
    meta.textContent = `Kinds: ${(t.kinds || []).join(', ')} · Roadmap stage ${t.stage || '—'} · ${t.missable ? 'Possibly missable — see the warning above.' : 'Not missable: still earnable in free roam after the story.'}${t.hidden ? ' · Hidden on PlayStation until earned.' : ''}`;
    detailEl.append(meta);
  }
}

function wireControls() {
  document.getElementById('kindRow').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kind]');
    if (!btn) return;
    activeKind = btn.dataset.kind;
    for (const b of document.querySelectorAll('.kind-btn')) b.classList.toggle('active', b === btn);
    renderList();
  });
  gradeFilter.addEventListener('change', renderList);
  earnedOnlyBox.addEventListener('change', renderList);
  searchBox.addEventListener('input', renderList);
  spoilerBox.addEventListener('change', () => { saveSpoiler(); renderList(); renderDetail(); });
  document.getElementById('roadmapToggle').addEventListener('click', (e) => {
    const steps = document.getElementById('roadmapSteps');
    const hidden = steps.style.display === 'none';
    steps.style.display = hidden ? '' : 'none';
    e.currentTarget.textContent = hidden ? 'Hide roadmap' : 'Show roadmap';
    e.currentTarget.setAttribute('aria-expanded', String(hidden));
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showStatus(`Exported ${earned.size} earned trophies.`);
  });
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const names = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(names)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.name));
      earned = new Set(names.filter((n) => known.has(n)));
      saveEarned();
      renderProgress();
      renderList();
      renderDetail();
      showStatus(`Imported ${earned.size} earned trophies.`);
    } catch {
      showStatus('Import failed: that file is not a progress export from this guide.');
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned ticks?')) return;
    earned = new Set();
    saveEarned();
    renderProgress();
    renderList();
    renderDetail();
    showStatus('Progress reset.');
  });
}

async function boot() {
  renderRoadmap();
  const doc = await (await fetch('data/trophies.json')).json();
  trophies = doc.trophies || doc;
  if (params.get('trophy')) {
    const wanted = Number(params.get('trophy'));
    if (trophies.some((t) => t.id === wanted)) selectedId = wanted;
  }
  if (!selectedId && trophies.length) selectedId = trophies.find((t) => t.id === 28)?.id ?? trophies[0].id;
  for (const b of document.querySelectorAll('.kind-btn')) b.classList.toggle('active', b.dataset.kind === activeKind);
  wireControls();
  renderKindCounts();
  renderProgress();
  renderList();
  renderDetail();
}

boot();
