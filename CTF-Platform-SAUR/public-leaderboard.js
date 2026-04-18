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
let selectedTeamId = null;
let filters = {
    category: 'all',
    search: ''
};
let sortState = {
    key: 'rank',
    direction: 'asc'
};

const challengeScoreMap = {
    web_easy: 100, web_hard: 200,
    crypto_easy: 100, crypto_hard: 200,
    binary_easy: 100, binary_hard: 200,
    forensics_easy: 100, forensics_hard: 200,
    osint_easy: 100, osint_hard: 200
};

document.addEventListener('DOMContentLoaded', function() {
    data = loadData();
    bindEvents();
    initParticles();
    renderLeaderboard(true);

    if (refreshTimer) clearInterval(refreshTimer);
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
    return raw ? JSON.parse(raw) : { teams: [], challengeStats: {} };
}

function bindEvents() {
    const search = document.getElementById('teamSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const tableHead = document.querySelector('#leaderboardTable thead');
    const tableBody = document.querySelector('#leaderboardTable tbody');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const modalOverlay = document.getElementById('modalOverlay');

    if (search) {
        search.addEventListener('input', function(e) {
            filters.search = e.target.value.toLowerCase();
            renderLeaderboard(true);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', function(e) {
            filters.category = e.target.value;
            renderLeaderboard(true);
        });
    }

    if (tableHead) {
        tableHead.addEventListener('click', function(e) {
            const header = e.target.closest('th[data-sort]');
            if (!header) return;
            const key = header.getAttribute('data-sort');
            if (sortState.key === key) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = key;
                sortState.direction = 'desc';
            }
            renderLeaderboard(true);
        });
    }

    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            const row = e.target.closest('tr[data-team-id]');
            if (!row) return;
            const teamId = row.getAttribute('data-team-id');
            selectedTeamId = teamId;
            showTeamDetail();
        });
    }

    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', closeTeamDetail);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeTeamDetail);
    }
}

function renderLeaderboard(forceFullRender) {
    const ranked = rankTeams(data.teams);
    const filtered = ranked.filter(applyFilters);
    const sorted = sortTeams(filtered);

    renderStats(ranked);
    renderCharts(ranked);
    renderPodium(sorted);
    renderTable(sorted, forceFullRender);
    updateTableMeta(sorted.length);
}

function rankTeams(teams) {
    return teams.map(function(team) {
        const solved = Array.isArray(team.solvedChallenges) ? team.solvedChallenges.length : 0;
        const net = Math.max(0, (team.points || 0) - (team.penalty || 0));
        const lastSolveTime = team.lastSolveAt ? new Date(team.lastSolveAt).getTime() : 0;
        
        return {
            ...team,
            netScore: net,
            solvedCount: solved,
            lastSolveTimestamp: lastSolveTime,
            successRate: Math.round((solved / 10) * 100) || 0
        };
    }).sort(function(a, b) {
        if (b.netScore !== a.netScore) return b.netScore - a.netScore;
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return b.lastSolveTimestamp - a.lastSolveTimestamp;
    }).map(function(team, idx) {
        return { ...team, rank: idx + 1 };
    });
}

function applyFilters(team) {
    const matchName = !filters.search || team.name.toLowerCase().includes(filters.search);
    const matchCat = filters.category === 'all' || (team.solvedChallenges || []).some(function(cid) {
        return CATEGORY_MAP[cid] === filters.category;
    });
    return matchName && matchCat;
}

function sortTeams(teams) {
    const sorted = teams.slice();
    sorted.sort(function(a, b) {
        const dir = sortState.direction === 'asc' ? 1 : -1;
        switch (sortState.key) {
            case 'name': return a.name.localeCompare(b.name) * dir;
            case 'score': return (a.netScore - b.netScore) * dir * -1;
            case 'flags': return (a.solvedCount - b.solvedCount) * dir * -1;
            case 'lastSolve': return (a.lastSolveTimestamp - b.lastSolveTimestamp) * dir * -1;
            case 'accuracy': return (a.successRate - b.successRate) * dir * -1;
            default: return (a.rank - b.rank) * dir;
        }
    });
    return sorted.map(function(t, i) { return { ...t, displayRank: i + 1 }; });
}

function renderStats(teams) {
    const total = teams.length;
    const avgScore = total > 0 ? Math.round(teams.reduce(function(sum, t) { return sum + t.netScore; }, 0) / total) : 0;
    const totalFlags = teams.reduce(function(sum, t) { return sum + t.solvedCount; }, 0);
    const topScore = total > 0 ? teams[0].netScore : 0;

    const els = {
        totalTeams: document.getElementById('totalTeams'),
        avgScore: document.getElementById('avgScore'),
        totalFlags: document.getElementById('totalFlags'),
        topScore: document.getElementById('topScore')
    };

    if (els.totalTeams) els.totalTeams.textContent = String(total);
    if (els.avgScore) els.avgScore.textContent = String(avgScore);
    if (els.totalFlags) els.totalFlags.textContent = String(totalFlags);
    if (els.topScore) els.topScore.textContent = String(topScore);
}

function renderCharts(teams) {
    if (typeof Chart === 'undefined') return;
    renderScoreProgressChart(teams);
    renderFlagTrendsChart(teams);
    renderCategoryAnalysisChart(teams);
}

function renderScoreProgressChart(teams) {
    const canvas = document.getElementById('scoreProgressChart');
    if (!canvas || !teams.length) return;

    const topTeams = teams.slice(0, 5);
    const labels = topTeams.map(function(_, i) { return 'T' + (i + 1); });

    destroyChart('scoreProgressChart');
    const chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: topTeams.map(function(team, idx) {
                const colors = ['#00d4ff', '#ff006e', '#ffbe0b', '#3a86ff', '#fb5607'];
                return {
                    label: team.name,
                    data: [team.netScore],
                    borderColor: colors[idx],
                    backgroundColor: colors[idx] + '20',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5
                };
            })
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9ab4dc', padding: 15 } }
            },
            scales: {
                x: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } },
                y: { ticks: { color: '#9ab4dc' }, grid: { color: 'rgba(0, 212, 255, 0.08)' } }
            }
        }
    });
    charts.push({ canvasId: 'scoreProgressChart', chart: chart });
}

function renderFlagTrendsChart(teams) {
    const canvas = document.getElementById('flagTrendsChart');
    if (!canvas || !teams.length) return;

    const timeBuckets = {
        '00:00': 0, '04:00': 0, '08:00': 0, '12:00': 0,
        '16:00': 0, '20:00': 0, '23:59': 0
    };

    teams.forEach(function(team) {
        (team.solveHistory || []).forEach(function(solve) {
            const date = new Date(solve.at);
            const hour = date.getHours();
            const key = Math.floor(hour / 4) * 4;
            const bucketKey = String(key).padStart(2, '0') + ':00';
            if (timeBuckets.hasOwnProperty(bucketKey)) {
                timeBuckets[bucketKey]++;
            }
        });
    });

    const labels = Object.keys(timeBuckets);
    const data = Object.values(timeBuckets);

    destroyChart('flagTrendsChart');
    const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flags Solved',
                data: data,
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
    charts.push({ canvasId: 'flagTrendsChart', chart: chart });
}

function renderCategoryAnalysisChart(teams) {
    const canvas = document.getElementById('categoryAnalysisChart');
    if (!canvas || !teams.length) return;

    const categoryCounts = {};
    teams.forEach(function(team) {
        (team.solvedChallenges || []).forEach(function(cid) {
            const cat = CATEGORY_MAP[cid] || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    const colors = ['#00d4ff', '#ff006e', '#ffbe0b', '#3a86ff', '#fb5607', '#8338ec'];

    destroyChart('categoryAnalysisChart');
    const chart = new Chart(canvas.getContext('2d'), {
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
    charts.push({ canvasId: 'categoryAnalysisChart', chart: chart });
}

function destroyChart(canvasId) {
    const index = charts.findIndex(function(c) { return c.canvasId === canvasId; });
    if (index >= 0) {
        charts[index].chart.destroy();
        charts.splice(index, 1);
    }
}

function renderPodium(teams) {
    const section = document.getElementById('podiumSection');
    if (!section) return;

    if (teams.length < 1) {
        section.innerHTML = '<p style="text-align: center; color: #9ab4dc;">No teams yet.</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const topThree = teams.slice(0, 3);

    section.innerHTML = topThree.map(function(team, idx) {
        return `
            <div class="podium-card rank-${idx + 1}">
                <div class="medal">${medals[idx]}</div>
                <div class="podium-name">${escapeHtml(team.name)}</div>
                <div class="podium-score">${team.netScore} pts</div>
                <div class="podium-flags">${team.solvedCount} flags</div>
            </div>
        `;
    }).join('');
}

function renderTable(teams, forceFullRender) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    if (!tbody) return;

    if (!teams.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9ab4dc;">No teams match filters.</td></tr>';
        return;
    }

    const html = teams.map(function(team) {
        return `
            <tr data-team-id="${team.id}" class="lb-row">
                <td>${team.displayRank}</td>
                <td><strong>${escapeHtml(team.name)}</strong></td>
                <td>${team.netScore}</td>
                <td>${team.solvedCount}/10</td>
                <td>${formatTime(team.lastSolveAt)}</td>
                <td>${team.successRate}%</td>
            </tr>
        `;
    }).join('');

    if (forceFullRender) {
        tbody.innerHTML = html;
    }
}

function updateTableMeta(count) {
    const meta = document.getElementById('tableMeta');
    if (meta) meta.textContent = count + ' teams ranked';
}

function showTeamDetail() {
    const team = data.teams.find(function(t) { return t.id === selectedTeamId; });
    if (!team) return;

    const ranked = rankTeams(data.teams);
    const rankedTeam = ranked.find(function(t) { return t.id === selectedTeamId; });

    document.getElementById('detailTeamName').textContent = escapeHtml(team.name);
    document.getElementById('detailRank').textContent = '#' + (rankedTeam ? rankedTeam.rank : '?');
    document.getElementById('detailScore').textContent = rankedTeam ? String(rankedTeam.netScore) : '0';
    document.getElementById('detailFlags').textContent = String(team.solvedChallenges ? team.solvedChallenges.length : 0);
    document.getElementById('detailFirstBlood').textContent = team.firstBlood || '-';
    document.getElementById('detailRate').textContent = (rankedTeam ? rankedTeam.successRate : 0) + '%';

    const solvedHtml = (team.solvedChallenges || []).map(function(cid) {
        return `<div class="solved-badge">${escapeHtml(formatChallengeName(cid))}</div>`;
    }).join('');
    document.getElementById('detailSolvedList').innerHTML = solvedHtml || '<div style="color: #9ab4dc;">No flags captured yet.</div>';

    renderDetailChart(team);
    document.getElementById('teamDetailModal').classList.add('active');
}

function closeTeamDetail() {
    document.getElementById('teamDetailModal').classList.remove('active');
    selectedTeamId = null;
}

function renderDetailChart(team) {
    const canvas = document.getElementById('detailChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const history = team.solveHistory || [];
    let score = 0;
    const data = history.map(function(solve, idx) {
        score += challengeScoreMap[solve.challengeId] || 0;
        return { label: String(idx + 1), score: score };
    });

    if (!data.length) {
        data.push({ label: 'Start', score: 0 });
    }

    destroyChart('detailChartCanvas');
    const chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(function(d) { return d.label; }),
            datasets: [{
                label: 'Team Score',
                data: data.map(function(d) { return d.score; }),
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 3
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
    charts.push({ canvasId: 'detailChartCanvas', chart: chart });
}

function formatTime(isoTime) {
    if (!isoTime) return '-';
    const date = new Date(isoTime);
    return isNaN(date.getTime()) ? '-' : String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function formatChallengeName(cid) {
    return String(cid).replace(/_/g, ' ').replace(/\b\w/g, function(m) { return m.toUpperCase(); });
}

function escapeHtml(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initParticles() {
    const container = document.querySelector('.particle-background');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.width = (Math.random() * 3 + 1) + 'px';
        p.style.height = p.style.width;
        p.style.backgroundColor = 'rgba(0, 212, 255, 0.35)';
        p.style.left = (Math.random() * 100) + '%';
        p.style.top = (Math.random() * 100) + '%';
        p.style.animation = `float ${Math.random() * 10 + 5}s linear infinite`;
        container.appendChild(p);
    }
}
