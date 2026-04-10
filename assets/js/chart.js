const TEAMS_URL = 'https://trilobit-coder.github.io/liming-cup-bracket/data/teams.json';
const MATCHES_URL = 'https://trilobit-coder.github.io/liming-cup-bracket/data/matches.json';

const root = document.querySelector('[data-chart-root]');

if (root) {
  init().catch(err => {
    root.innerHTML = `<div class="card">加载失败：${err.message}</div>`;
  });
}

async function init() {
  const { teams, matches } = await loadData();

  const standings = buildStandings(teams, matches);

  // 取前16
  const top16 = standings.slice(0, 16);

  const upper = top16.slice(0, 8);
  const lower = top16.slice(8, 16);

  const upperMatches = buildBracket(upper);
  const lowerMatches = buildBracket(lower);

  root.innerHTML = `
    <section class="card">
      <h2>淘汰赛对阵图（自动生成）</h2>

      <h3>胜者组（Upper Bracket）</h3>
      ${renderBracket(upperMatches)}

      <h3 style="margin-top:24px;">败者组（Lower Bracket）</h3>
      ${renderBracket(lowerMatches)}
    </section>
  `;
}

async function loadData() {
  const [teamsRes, matchesRes] = await Promise.all([
    fetch(TEAMS_URL),
    fetch(MATCHES_URL)
  ]);

  const teams = await teamsRes.json();
  const matches = await matchesRes.json();

  return { teams, matches };
}

/* ===== 积分榜计算 ===== */
function buildStandings(teams, matches) {
  const map = new Map();

  teams.forEach(team => {
    map.set(team.id, {
      ...team,
      points: 0,
      gf: 0,
      ga: 0,
    });
  });

  matches.forEach(m => {
    if (m.homeScore == null || m.awayScore == null) return;

    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);

    home.gf += m.homeScore;
    home.ga += m.awayScore;

    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) home.points += 3;
    else if (m.homeScore < m.awayScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  });

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
}

/* ===== 构建淘汰赛 ===== */
function buildBracket(teams) {
  if (teams.length !== 8) return [];

  return [
    [teams[0], teams[7]],
    [teams[1], teams[6]],
    [teams[2], teams[5]],
    [teams[3], teams[4]],
  ];
}

/* ===== 渲染 ===== */
function renderBracket(matches) {
  return `
    <div class="bracket">
      ${matches.map(match => `
        <div class="match">
          <div class="team">${match[0].name}</div>
          <div class="vs">vs</div>
          <div class="team">${match[1].name}</div>
        </div>
      `).join('')}
    </div>
  `;
}