const TEAMS_URL = './data/teams.json';
const MATCHES_URL = './data/matches.json';

const root = document.querySelector('[data-schedule-root]');

if (root) {
  initSchedulePage().catch((error) => {
    root.innerHTML = `
      <div class="card">
        <h2>赛程加载失败</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  });
}

async function initSchedulePage() {
  const { teams, matches } = await loadTournamentData();
  const teamLookup = buildTeamLookup(teams);

  const regions = [
    '全部',
    ...[...new Set(teams.map((t) => t.region).filter(Boolean))].sort()
  ];

  const dates = [...new Set(matches.map((m) => m.date).filter(Boolean))].sort();

  root.innerHTML = `
    <section class="card page-card">
      <div class="page-head">
        <div>
          <h2>赛程</h2>
          <p>按日期查看所有对阵，并可按赛区筛选。</p>
        </div>
        <div class="page-head__meta">
          <span>共 ${matches.length} 场比赛</span>
          <span>共 ${teams.length} 支队伍</span>
        </div>
      </div>

      <div class="filters">
        <label class="filter">
          <span>赛区</span>
          <select data-region-filter>
            ${regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('')}
          </select>
        </label>

        <label class="filter">
          <span>日期</span>
          <select data-date-filter>
            <option value="全部">全部</option>
            ${dates.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(formatDateZh(date))}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="summary" data-summary></div>
      <div class="schedule-list" data-schedule-list></div>
    </section>
  `;

  const regionFilter = root.querySelector('[data-region-filter]');
  const dateFilter = root.querySelector('[data-date-filter]');
  const summary = root.querySelector('[data-summary]');
  const list = root.querySelector('[data-schedule-list]');

  const state = {
    region: '全部',
    date: '全部',
  };

  function getFilteredMatches() {
    return matches.filter((match) => {
      const regionOk = state.region === '全部' || match.region === state.region;
      const dateOk = state.date === '全部' || match.date === state.date;
      return regionOk && dateOk;
    });
  }

  function render() {
    const filtered = getFilteredMatches();
    const grouped = groupMatchesByDate(filtered);

    summary.innerHTML = `
      <div class="summary__item">
        <strong>${filtered.length}</strong>
        <span>场比赛</span>
      </div>
      <div class="summary__item">
        <strong>${grouped.size}</strong>
        <span>个日期</span>
      </div>
    `;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty">没有符合条件的赛程。</div>`;
      return;
    }

    list.innerHTML = [...grouped.entries()]
      .map(([date, dayMatches]) => {
        const dayHtml = dayMatches
          .map((match) => {
            const homeTeam = resolveTeam(match.homeTeamId, teamLookup);
            const awayTeam = resolveTeam(match.awayTeamId, teamLookup);

            return `
              <article class="match-card">
                <div class="match-card__top">
                  <span class="badge">#${escapeHtml(match.id || '-')}</span>
                  <span class="badge badge--soft">${escapeHtml(match.region || '未分区')}</span>
                  <span class="badge badge--soft">${escapeHtml(getMatchStatusLabel(match.status))}</span>
                </div>

                <div class="match-card__teams" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                  <div class="team-line">
                    <strong>${escapeHtml(homeTeam?.name || match.homeTeamId || '主队未命名')}</strong>
                  </div>

                  <div class="match-card__score" style="white-space:nowrap;">
                    ${escapeHtml(getMatchScoreText(match))}
                  </div>

                  <div class="team-line team-line--away">
                    <strong>${escapeHtml(awayTeam?.name || match.awayTeamId || '客队未命名')}</strong>
                  </div>
                </div>

                <div class="match-card__meta">
                  <span>${escapeHtml(formatTime(match.time))}</span>
                  <span>${escapeHtml(match.venue || '未指定场地')}</span>
                  <span>${escapeHtml(match.notes || '')}</span>
                </div>
              </article>
            `;
          })
          .join('');

        return `
          <section class="day-group">
            <h3>${escapeHtml(formatDateZh(date))}</h3>
            <div class="day-group__list">${dayHtml}</div>
          </section>
        `;
      })
      .join('');
  }

  regionFilter.addEventListener('change', (event) => {
    state.region = event.target.value;
    render();
  });

  dateFilter.addEventListener('change', (event) => {
    state.date = event.target.value;
    render();
  });

  render();
}

async function loadTournamentData() {
  const [matchRes, teamRes] = await Promise.all([
    fetch(MATCHES_URL),
    fetch(TEAMS_URL),
  ]);

  if (!matchRes.ok) {
    throw new Error(`比赛数据加载失败：${matchRes.status}`);
  }

  if (!teamRes.ok) {
    throw new Error(`队伍数据加载失败：${teamRes.status}`);
  }

  const matches = await matchRes.json();
  const teams = await teamRes.json();

  if (!Array.isArray(matches) || !Array.isArray(teams)) {
    throw new Error('teams.json 和 matches.json 必须都是数组');
  }

  return { teams, matches };
}

function buildTeamLookup(teams) {
  const lookup = new Map();
  for (const team of teams) {
    if (!team || team.id == null) continue;
    lookup.set(String(team.id), team);
  }
  return lookup;
}

function resolveTeam(teamId, teamLookup) {
  return teamLookup.get(String(teamId)) || null;
}

function groupMatchesByDate(matches) {
  const grouped = new Map();

  const sorted = [...matches].sort((a, b) => {
    const dateDiff = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateDiff !== 0) return dateDiff;

    const timeDiff = String(a.time || '').localeCompare(String(b.time || ''));
    if (timeDiff !== 0) return timeDiff;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  for (const match of sorted) {
    const key = match.date || '未指定日期';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(match);
  }

  return grouped;
}

function formatDateZh(dateStr) {
  if (!dateStr) return '未指定日期';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date);
}

function formatTime(timeStr) {
  return timeStr || '--:--';
}

function isMatchFinished(match) {
  return (
    match &&
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined
  );
}

function getMatchStatusLabel(status) {
  const map = {
    pending: '未开始',
    live: '进行中',
    finished: '已结束',
    cancelled: '取消',
  };
  return map[status] || status || '未开始';
}

function getMatchScoreText(match) {
  if (!isMatchFinished(match)) return 'VS';
  return `${match.homeScore} - ${match.awayScore}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}