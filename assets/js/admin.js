const TEAMS_URL = '../../data/teams.json';
const MATCHES_URL = '../../data/matches.json';

let currentMatches = [];
let currentTeams = [];
let currentRegion = 'ALL';
let currentSearch = '';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('zh-CN');
}

function normalizeScore(value) {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function cloneMatches(matches) {
  return matches.map(m => ({ ...m }));
}

function teamLookup(teams) {
  const map = {};
  teams.forEach(t => {
    map[String(t.id)] = t;
  });
  return map;
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    const t = (a.time || '').localeCompare(b.time || '');
    if (t !== 0) return t;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function saveLocalOverride(data) {
  localStorage.setItem('matches_override', JSON.stringify(data));
}

function loadLocalOverride() {
  const raw = localStorage.getItem('matches_override');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLocalOverride() {
  localStorage.removeItem('matches_override');
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


function applyFormState(row, match) {
  row.querySelector('[data-home-score]').value = match.homeScore ?? '';
  row.querySelector('[data-away-score]').value = match.awayScore ?? '';
  row.querySelector('[data-status]').textContent =
    Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)
      ? '已结束'
      : '未开始';
}

function render() {
  const root = document.querySelector('[data-admin-root]');
  const teamMap = teamLookup(currentTeams);

  const filtered = sortMatches(currentMatches).filter(match => {
    const regionOk = currentRegion === 'ALL' || match.region === currentRegion;

    const search = currentSearch.trim().toLowerCase();
    const text = `${match.id} ${match.region} ${match.round} ${
      teamMap[match.homeTeamId]?.name ?? match.homeTeamId
    } ${
      teamMap[match.awayTeamId]?.name ?? match.awayTeamId
    }`.toLowerCase();

    return regionOk && (!search || text.includes(search));
  });

  document.querySelector('[data-count]').textContent = String(filtered.length);

  root.innerHTML = filtered.map(match => `
    <tr data-match-id="${escapeHtml(match.id)}">
      <td>${escapeHtml(match.id)}</td>
      <td>${escapeHtml(match.region)}</td>
      <td>${match.round}</td>
      <td>${escapeHtml(formatDate(match.date))}</td>
      <td>${escapeHtml(match.time || '—')}</td>
      <td>${escapeHtml(teamMap[match.homeTeamId]?.name ?? match.homeTeamId)}</td>
      <td>${escapeHtml(teamMap[match.awayTeamId]?.name ?? match.awayTeamId)}</td>

      <td><input type="number" min="0" data-home-score value="${match.homeScore ?? ''}"></td>
      <td><input type="number" min="0" data-away-score value="${match.awayScore ?? ''}"></td>

      <td><span data-status>${
        Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)
          ? '已结束'
          : '未开始'
      }</span></td>

      <td><button data-clear>清空</button></td>
    </tr>
  `).join('');

  root.querySelectorAll('tr[data-match-id]').forEach(row => {
    const id = row.dataset.matchId;
    const match = currentMatches.find(m => m.id === id);

    row.querySelector('[data-home-score]').addEventListener('input', e => {
      match.homeScore = normalizeScore(e.target.value);
      applyFormState(row, match);
    });

    row.querySelector('[data-away-score]').addEventListener('input', e => {
      match.awayScore = normalizeScore(e.target.value);
      applyFormState(row, match);
    });

    row.querySelector('[data-clear]').addEventListener('click', () => {
      match.homeScore = null;
      match.awayScore = null;
      applyFormState(row, match);
    });
  });
}

async function loadTournamentData() {
  const [matchRes, teamRes] = await Promise.all([
    fetch(MATCHES_URL),
    fetch(TEAMS_URL),
  ]);

  if (!matchRes.ok) throw new Error('matches.json 加载失败');
  if (!teamRes.ok) throw new Error('teams.json 加载失败');

  let matches = await matchRes.json();
  const teams = await teamRes.json();

  const override = loadLocalOverride();
  if (override) matches = override;

  return { teams, matches };
}

async function main() {
  const { teams, matches } = await loadTournamentData();

  currentTeams = teams;
  currentMatches = cloneMatches(matches);

  document.querySelector('[data-save]').addEventListener('click', () => {
    saveLocalOverride(currentMatches);
    downloadJson('matches.json', currentMatches);
    toast('已保存并下载 JSON');
  });

  document.querySelector('[data-clear-override]').addEventListener('click', () => {
    clearLocalOverride();
    location.reload();
  });

  document.querySelector('[data-reset]').addEventListener('click', () => {
    currentMatches = cloneMatches(matches);
    render();
    toast('已重置');
  });

  document.querySelector('[data-region-filter]').addEventListener('change', e => {
    currentRegion = e.target.value;
    render();
  });

  document.querySelector('[data-search]').addEventListener('input', e => {
    currentSearch = e.target.value;
    render();
  });

  render();
}

function toast(message) {
  const el = document.querySelector('[data-toast]');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

main().catch(err => {
  document.querySelector('[data-admin-shell]').innerHTML =
    `<div>加载失败：${escapeHtml(err.message)}</div>`;
});