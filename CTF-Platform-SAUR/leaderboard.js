const ADMIN_STORAGE_KEY = 'ctfAdminData';

const CATEGORY_MAP = {
    web_easy: 'Web Exploitation',
    web_hard: 'Web Exploitation',
    crypto_easy: 'Cryptography',
    crypto_hard: 'Cryptography',
    binary_easy: 'Binary',
    binary_hard: 'Binary',
    forensics_easy: 'Forensics',
    forensics_hard: 'Forensics',
    osint_easy: 'OSINT',
    osint_hard: 'OSINT'
};

let data = null;
let charts = [];
let refreshTimer = null;
let expandedTeamId = null;
let filters = {
    category: 'all',
    timeRange: 'all',
    search: ''
};
let sortState = {
    key: 'rank',
    direction: 'asc'
};

const challengeScoreMap = {
    web_easy: 100,
    web_hard: 200,
    crypto_easy: 100,
    crypto_hard: 200,
    binary_easy: 100,
    binary_hard: 200,
    forensics_easy: 100,
    forensics_hard: 200,
    osint_easy: 100,
    osint_hard: 200
};

document.addEventListener('DOMContentLoaded', function() {
    data = loadData();
    bindEvents();
    initParticles();
    renderLeaderboard(true);

    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(function() {
        data = loadData();
        renderLeaderboard(false);
    }, 1000);
});

window.addEventListener('storage', function(event) {
    if (event.key === ADMIN_STORAGE_KEY) {
        data = loadData();
        renderLeaderboard(false);
    }
});

function loadData() {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { contest: { freezeLeaderboard: false }, teams: [], challengeStats: {} };

    if (!parsed.contest) {
        parsed.contest = { freezeLeaderboard: false };
    }
    if (!Array.isArray(parsed.teams)) {
        parsed.teams = [];
    }
    if (!parsed.challengeStats || typeof parsed.challengeStats !== 'object') {
        parsed.challengeStats = {};
    }

    return parsed;
}

function bindEvents() {
    const search = document.getElementById('teamSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const tableHead = document.querySelector('#leaderboardTable thead');
    const tableBody = document.querySelector('#leaderboardTable tbody');

    if (search) {
        search.addEventListener('input', function(event) {
            filters.search = event.target.value.toLowerCase();
            renderLeaderboard(true);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', function(event) {
            filters.category = event.target.value;
            renderLeaderboard(true);
        });
    }

    if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', function(event) {
            filters.timeRange = event.target.value;
            renderLeaderboard(true);
        });
    }

    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', function() {
            expandedTeamId = null;
            renderLeaderboard(true);
        });
    }

    if (tableHead) {
        tableHead.addEventListener('click', function(event) {
            const header = event.target.closest('th[data-sort]');
            if (!header) {
                return;
            }

            const key = header.getAttribute('data-sort');
            if (sortState.key === key) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = key;
                sortState.direction = key === 'rank' ? 'asc' : 'desc';
            }
            renderLeaderboard(true);
        });
    }

    if (tableBody) {
        tableBody.addEventListener('click', function(event) {
            const row = event.target.closest('tr[data-team-id]');
            if (!row) {
                return;
            }

            const teamId = row.getAttribute('data-team-id');
            expandedTeamId = expandedTeamId === teamId ? null : teamId;
            renderLeaderboard(true);
        });
    }
}

function renderLeaderboard(forceFullRender) {
    const teams = rankTeams(data.teams).filter(applyFilters);
    const sorted = sortTeams(teams);

    renderStats(data.teams);
    renderCharts(data.teams);
    renderTopCards(sorted);
    renderMeta(sorted.length);
    renderFreezeBadge();
    renderTable(sorted, forceFullRender);
    renderDetailPanel(sorted);
}

function rankTeams(teams) {
    const ranked = teams.map(function(team) {
        const solvedChallenges = Array.isArray(team.solvedChallenges) ? team.solvedChallenges : [];
        const solveHistory = Array.isArray(team.solveHistory) ? team.solveHistory.slice() : [];
        const net = Math.max(0, (team.points || 0) - (team.penalty || 0));
        const recentSolve = team.lastSolveAt ? new Date(team.lastSolveAt).getTime() : Number.MAX_SAFE_INTEGER;

        return {
            ...team,
            net,
            solved: team.solved || solvedChallenges.length || 0,
            activity: isSuspicious(team) ? 'suspicious' : 'normal',
            lastSolveTimestamp: recentSolve,
            solveHistory,
            solvedChallengeDetails: solvedChallenges.map(function(challengeId) {
                const historyMatch = findSolveRecord(team, challengeId);
                return {
                    id: challengeId,
                    title: prettifyChallengeName(challengeId),
                    category: CATEGORY_MAP[challengeId] || 'General',
                    solvedAt: historyMatch ? historyMatch.at : team.lastSolveAt,
                    hintsUsed: historyMatch ? historyMatch.hintsUsed : 0,
                    points: challengeScoreMap[challengeId] || 0
                };
            })
        };
    });

    ranked.sort(function(a, b) {
        if (b.net !== a.net) {
            return b.net - a.net;
        }
        if (b.solved !== a.solved) {
            return b.solved - a.solved;
        }
        return a.lastSolveTimestamp - b.lastSolveTimestamp;
    });

    return ranked.map(function(team, index) {
        return { ...team, baseRank: index + 1 };
    });
}

function applyFilters(team) {
    const matchesSearch = !filters.search || team.name.toLowerCase().includes(filters.search);
    const matchesCategory = filters.category === 'all' || team.solvedChallengeDetails.some(function(challenge) {
        return challenge.category === filters.category;
    });
    const matchesTime = filters.timeRange === 'all' || withinRange(team.lastSolveAt, filters.timeRange);

    return matchesSearch && matchesCategory && matchesTime;
}

function sortTeams(teams) {
    const sorted = teams.slice();
    sorted.sort(function(a, b) {
        const direction = sortState.direction === 'asc' ? 1 : -1;

        switch (sortState.key) {
            case 'name':
                return a.name.localeCompare(b.name) * direction;
            case 'score':
                return (a.net - b.net) * direction * -1;
            case 'solved':
                return (a.solved - b.solved) * direction * -1;
            case 'lastSolveAt':
                return (a.lastSolveTimestamp - b.lastSolveTimestamp) * direction * -1;
            case 'activity':
                return a.activity.localeCompare(b.activity) * direction;
            case 'rank':
            default:
                return (a.baseRank - b.baseRank) * direction;
        }
    });

    return sorted.map(function(team, index) {
        return { ...team, rank: index + 1 };
    });
}

function renderTopCards(teams) {
    const topCards = document.getElementById('leaderboardTopCards');
    if (!topCards) {
        return;
    }

    if (!teams.length) {
        topCards.innerHTML = '';
        return;
    }

    topCards.innerHTML = teams.slice(0, 3).map(function(team, index) {
        const glowClass = index === 0 ? 'rank-glow-1' : index === 1 ? 'rank-glow-2' : 'rank-glow-3';
        return `
            <article class="summary-card top-rank-card ${glowClass}">
                <div class="summary-label">#${index + 1}</div>
                <div class="summary-value">${escapeHtml(team.name)}</div>
                <div class="top-meta">Score ${team.net} | Solved ${team.solved}</div>
            </article>
        `;
    }).join('');
}

function renderMeta(count) {
    const meta = document.getElementById('leaderboardMeta');
    if (meta) {
        meta.textContent = `${count} teams`;
    }
}

function renderTable(teams, forceFullRender) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    if (!tbody) {
        return;
    }

    if (!teams.length) {
        tbody.innerHTML = '<tr><td colspan="6">No teams match the current filters.</td></tr>';
        return;
    }

    const nextHtml = teams.map(function(team) {
        return buildRowHtml(team);
    }).join('');

    if (forceFullRender || tbody.innerHTML !== nextHtml) {
        tbody.innerHTML = nextHtml;
    }

    updateRowClasses(teams);
}

function buildRowHtml(team) {
    const activityClass = team.activity === 'suspicious' ? 'suspicious-indicator' : 'normal-indicator';
    const rowClass = team.rank <= 3 ? 'top-row' : '';

    return `
        <tr class="leaderboard-row ${rowClass}" data-team-id="${team.id}">
            <td>${team.rank}</td>
            <td>${escapeHtml(team.name)}</td>
            <td>${team.net}</td>
            <td>${team.solved}</td>
            <td>${formatTime(team.lastSolveAt)}</td>
            <td><span class="activity-pill ${activityClass}">${team.activity}</span></td>
        </tr>
        ${expandedTeamId === team.id ? buildDetailRowHtml(team) : ''}
    `;
}

function buildDetailRowHtml(team) {
    return `
        <tr class="detail-row">
            <td colspan="6">
                <div class="team-detail-shell">
                    <div class="team-detail-title">${escapeHtml(team.name)} details</div>
                    <div class="team-detail-grid">
                        <div class="team-detail-block">
                            <div class="team-detail-label">Solved Challenges</div>
                            <div class="team-detail-list">${renderSolvedList(team)}</div>
                        </div>
                        <div class="team-detail-block">
                            <div class="team-detail-label">Score Progression</div>
                            <canvas id="scoreProgressChart" height="180"></canvas>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderSolvedList(team) {
    if (!team.solvedChallengeDetails.length) {
        return '<div class="empty-detail">No solves recorded.</div>';
    }

    return team.solvedChallengeDetails.map(function(item) {
        return `
            <div class="detail-item">
                <div class="detail-item-title">${escapeHtml(item.title)}</div>
                <div class="detail-item-meta">${formatTime(item.solvedAt)} | Hints used: ${item.hintsUsed}</div>
            </div>
        `;
    }).join('');
}

function renderDetailPanel(teams) {
    const panel = document.getElementById('teamDetailPanel');
    if (!panel) {
        return;
    }

    if (!expandedTeamId) {
        panel.classList.add('hidden');
        destroyChart();
        return;
    }

    const team = teams.find(function(item) {
        return item.id === expandedTeamId;
    });

    if (!team) {
        panel.classList.add('hidden');
        destroyChart();
        return;
    }

    panel.classList.remove('hidden');
    document.getElementById('teamDetailTitle').textContent = `${team.name} details`;
    document.getElementById('teamSolvedList').innerHTML = renderSolvedList(team);
    renderScoreChart(team);
}

function renderScoreChart(team) {
    const canvas = document.getElementById('scoreProgressChart');
    if (!canvas || typeof Chart === 'undefined') {
        return;
    }

    const progress = buildScoreProgress(team);
    destroyChart();
    const newChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: progress.map(function(point) { return point.label; }),
            datasets: [{
                label: 'Score',
                data: progress.map(function(point) { return point.score; }),
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.15,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } },
                y: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } }
            }
        }
    });
    charts.push(newChart);
}

function buildScoreProgress(team) {
    const history = Array.isArray(team.solveHistory) ? team.solveHistory : [];
    let score = 0;

    if (!history.length) {
        return [{ label: 'Start', score: 0 }];
    }

    return history.map(function(entry, index) {
        score += challengeScoreMap[entry.challengeId] || 0;
        return {
            label: String(index + 1),
            score
        };
    });
}

function renderStats(teams) {
    const totalTeams = teams.length;
    const avgScore = totalTeams > 0 ? Math.round(teams.reduce(function(sum, t) { return sum + Math.max(0, (t.points || 0) - (t.penalty || 0)); }, 0) / totalTeams) : 0;
    const avgSolved = totalTeams > 0 ? Math.round(teams.reduce(function(sum, t) { return sum + (t.solved || 0); }, 0) / totalTeams * 10) / 10 : 0;
    const totalSolves = teams.reduce(function(sum, t) { return sum + (t.solved || 0); }, 0);

    const statTeams = document.getElementById('statTeams');
    const statAvgScore = document.getElementById('statAvgScore');
    const statAvgSolved = document.getElementById('statAvgSolved');
    const statTotalSolves = document.getElementById('statTotalSolves');

    if (statTeams) statTeams.textContent = String(totalTeams);
    if (statAvgScore) statAvgScore.textContent = String(avgScore);
    if (statAvgSolved) statAvgSolved.textContent = String(avgSolved);
    if (statTotalSolves) statTotalSolves.textContent = String(totalSolves);
}

function renderCharts(teams) {
    if (typeof Chart === 'undefined') {
        return;
    }

    renderScoreDistribution(teams);
    renderCategoryChart(teams);
    renderSolveTimeline(teams);
}

function renderScoreDistribution(teams) {
    const canvas = document.getElementById('scoreDistributionChart');
    if (!canvas) {
        return;
    }

    const scores = teams.map(function(t) { return Math.max(0, (t.points || 0) - (t.penalty || 0)); });
    const maxScore = Math.max.apply(null, scores) || 1000;
    const binSize = Math.ceil(maxScore / 10);
    const bins = Array(10).fill(0);

    scores.forEach(function(score) {
        const bin = Math.min(Math.floor(score / binSize), 9);
        bins[bin]++;
    });

    const canvasContext = canvas.getContext('2d');
    const existingChart = Chart.helpers && canvas.chart ? canvas.chart : null;
    if (existingChart) {
        existingChart.destroy();
    }

    const chart = new Chart(canvasContext, {
        type: 'bar',
        data: {
            labels: bins.map(function(_, i) { return `${i * binSize}-${(i + 1) * binSize}`; }),
            datasets: [{
                label: 'Teams',
                data: bins,
                backgroundColor: '#00d4ff',
                borderColor: '#00d4ff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } },
                y: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } }
            }
        }
    });
    charts.push(chart);
}

function renderCategoryChart(teams) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) {
        return;
    }

    const categoryCounts = {};
    teams.forEach(function(team) {
        (team.solvedChallengeDetails || []).forEach(function(challenge) {
            const cat = challenge.category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    const colors = ['#00d4ff', '#ff006e', '#ffbe0b', '#3a86ff', '#fb5607', '#8338ec'];

    const canvasContext = canvas.getContext('2d');
    const existingChart = canvas.chart;
    if (existingChart) {
        existingChart.destroy();
    }

    const chart = new Chart(canvasContext, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#000814',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ab4dc', padding: 15 }
                }
            }
        }
    });
    charts.push(chart);
}

function renderSolveTimeline(teams) {
    const canvas = document.getElementById('solveTimelineChart');
    if (!canvas) {
        return;
    }

    const timeSlots = {
        '00:00-03:00': 0,
        '03:00-06:00': 0,
        '06:00-09:00': 0,
        '09:00-12:00': 0,
        '12:00-15:00': 0,
        '15:00-18:00': 0,
        '18:00-21:00': 0,
        '21:00-24:00': 0
    };

    teams.forEach(function(team) {
        (team.solveHistory || []).forEach(function(solve) {
            const date = new Date(solve.at);
            const hour = date.getHours();
            const slot = Math.floor(hour / 3);
            const slotKey = Object.keys(timeSlots)[slot];
            if (slotKey) {
                timeSlots[slotKey]++;
            }
        });
    });

    const labels = Object.keys(timeSlots);
    const data = Object.values(timeSlots);

    const canvasContext = canvas.getContext('2d');
    const existingChart = canvas.chart;
    if (existingChart) {
        existingChart.destroy();
    }

    const chart = new Chart(canvasContext, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Solves',
                data: data,
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#00d4ff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, labels: { color: '#9ab4dc' } } },
            scales: {
                x: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } },
                y: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } }
            }
        }
    });
    charts.push(chart);
}

function destroyChart() {
    charts.forEach(function(c) {
        if (c) c.destroy();
    });
    charts = [];
}

function findSolveRecord(team, challengeId) {
    const history = Array.isArray(team.solveHistory) ? team.solveHistory : [];
    return history.find(function(item) {
        return item.challengeId === challengeId;
    }) || null;
}

function prettifyChallengeName(challengeId) {
    return String(challengeId)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function(match) {
            return match.toUpperCase();
        });
}

function isSuspicious(team) {
    const solved = Array.isArray(team.solvedChallenges) ? team.solvedChallenges.length : 0;
    return solved >= 8 || (team.penalty || 0) > (team.points || 0) * 0.5;
}

function withinRange(lastSolveAt, range) {
    if (!lastSolveAt) {
        return false;
    }

    const map = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
    };

    const maxAge = map[range];
    if (!maxAge) {
        return true;
    }

    return (Date.now() - new Date(lastSolveAt).getTime()) <= maxAge;
}

function updateRowClasses(teams) {
    const body = document.querySelector('#leaderboardTable tbody');
    if (!body) {
        return;
    }

    const rows = body.querySelectorAll('tr[data-team-id]');
    rows.forEach(function(row) {
        const teamId = row.getAttribute('data-team-id');
        const team = teams.find(function(item) {
            return item.id === teamId;
        });

        if (!team) {
            return;
        }

        row.classList.toggle('top-row', team.rank <= 3);
        row.classList.toggle('suspicious-row', team.activity === 'suspicious');
    });
}

function renderFreezeBadge() {
    const badge = document.getElementById('freezeBadge');
    if (!badge) {
        return;
    }

    if (data.contest && data.contest.freezeLeaderboard) {
        badge.classList.remove('hidden');
        badge.textContent = 'Leaderboard freeze is ON.';
        return;
    }

    badge.classList.add('hidden');
}

function formatTime(isoTime) {
    if (!isoTime) {
        return '-';
    }

    const date = new Date(isoTime);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function initParticles() {
    const container = document.querySelector('.particle-background');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    for (let i = 0; i < 12; i += 1) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = `${Math.random() * 3 + 1}px`;
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = 'rgba(0, 212, 255, 0.35)';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animation = `float ${Math.random() * 10 + 5}s linear infinite`;
        container.appendChild(particle);
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0% { transform: translateY(0); opacity: 0.35; }
        50% { transform: translateY(-18px); opacity: 0.7; }
        100% { transform: translateY(0); opacity: 0.35; }
    }
`;
document.head.appendChild(style);
