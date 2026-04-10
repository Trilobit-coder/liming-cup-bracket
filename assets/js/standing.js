const TEAMS_URL = 'https://trilobit-coder.github.io/liming-cup-bracket/data/teams.json';
const MATCHES_URL = 'https://trilobit-coder.github.io/liming-cup-bracket/data/matches.json';

const root = document.querySelector('[data-standing-root]');

if (root) {
  initStandingPage().catch((error) => {
    root.innerHTML = `
      <div class="card">
        <h2>积分榜加载失败</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  });
}

async function initStandingPage() {
  const { teams, matches } = await loadTournamentData();

  const regions = ['全部', ...new Set(teams.map((t) => t.region).filter(Boolean))].sort();

  root.innerHTML = `
    <section class="card page-card">
      <div class="page-head">
        <div>
          <h2>积分榜</h2>
          <p>按胜、平、负和总分统计。</p>
        </div>
        <div class="page-head__meta">
          <span>共 ${teams.length} 支队伍</span>
          <span>已完成 ${matches.filter((m) => m.homeScore !== null && m.awayScore !== null).length} 场</span>
        </div>
      </div>

      <div class="filters">
        <label class="filter">
          <span>赛区</span>
          <select data-region-filter>
            ${regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="standing-wrap" data-standing-wrap></div>
    </section>
  `;

  const regionFilter = root.querySelector('[data-region-filter]');
  const wrap = root.querySelector('[data-standing-wrap]');

  function getFilteredTeams() {
    return regionFilter.value === '全部'
      ? teams
      : teams.filter((team) => team.region === regionFilter.value);
  }

  function getFilteredMatches(filteredTeams) {
    const allowedTeams = new Set(filteredTeams.map((team) => String(team.id)));

    return matches.filter((match) => {
      const home = String(match.homeTeamId);
      const away = String(match.awayTeamId);

      return allowedTeams.has(home) && allowedTeams.has(away);
    });
  }

  function render() {
    const filteredTeams = getFilteredTeams();
    const filteredMatches = getFilteredMatches(filteredTeams);
    const standings = buildStandings(filteredTeams, filteredMatches);

    if (standings.length === 0) {
      wrap.innerHTML = `<div class="empty">没有可显示的积分数据。</div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="standings-table">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>队伍</th>
              <th>赛区</th>
              <th>场</th>
              <th>胜</th>
              <th>平</th>
              <th>负</th>
              <th>积分</th>
            </tr>
          </thead>
          <tbody>
            ${standings
              .map(
                (row, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <strong>${escapeHtml(row.teamName)}</strong>
                      <div class="muted">ID: ${escapeHtml(row.teamId)}</div>
                    </td>
                    <td>${escapeHtml(row.region || '-')}</td>
                    <td>${row.played}</td>
                    <td>${row.wins}</td>
                    <td>${row.draws}</td>
                    <td>${row.losses}</td>
                    <td><strong>${row.points}</strong></td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  regionFilter.addEventListener('change', render);
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

function buildStandings(teams, matches) {
  const rows = teams.map((team) => ({
    team,
    teamId: String(team.id),
    teamName: team.name || String(team.id),
    region: team.region || '',
    seed: Number.isFinite(Number(team.seed)) ? Number(team.seed) : 9999,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));

  const rowMap = new Map();
  for (const row of rows) {
    rowMap.set(String(row.teamId), row);
  }

  for (const match of matches) {
    if (
      match.homeScore === null ||
      match.homeScore === undefined ||
      match.awayScore === null ||
      match.awayScore === undefined
    ) {
      continue;
    }

    const home = rowMap.get(String(match.homeTeamId));
    const away = rowMap.get(String(match.awayTeamId));

    if (!home || !away) continue;

    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

    home.played += 1;
    away.played += 1;

    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.teamName.localeCompare(b.teamName, 'zh-CN');
  });

  return rows;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}