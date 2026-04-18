const ADMIN_STORAGE_KEY = 'ctfAdminData';

const BASE_CHALLENGES = [
    {
        id: 'web_easy',
        name: 'SQL Injection 101',
        category: 'Web Exploitation',
        difficulty: 'easy',
        points: 100,
        flag: 'SAUR{sql_injection_bypassed}',
        status: 'Live',
        description: 'Find the SQL injection vulnerability in the login form and retrieve the admin flag.',
        hints: [{ text: 'Try a single quote in the username field.', cost: 25, locked: true }]
    },
    {
        id: 'web_hard',
        name: 'XSS & CSRF Exploitation',
        category: 'Web Exploitation',
        difficulty: 'hard',
        points: 200,
        flag: 'SAUR{xss_csrf_master}',
        status: 'Live',
        description: 'Exploit both XSS and CSRF vulnerabilities in the commented form.',
        hints: [{ text: 'Chain payload delivery with a reflected parameter.', cost: 50, locked: true }]
    },
    {
        id: 'crypto_easy',
        name: 'Caesar Cipher Decryption',
        category: 'Cryptography',
        difficulty: 'easy',
        points: 100,
        flag: 'SAUR{the_quick_brown_fox}',
        status: 'Live',
        description: 'Decrypt the message using Caesar cipher and submit the plaintext.',
        hints: [{ text: 'The shift is small and consistent.', cost: 25, locked: true }]
    },
    {
        id: 'crypto_hard',
        name: 'RSA Private Key Recovery',
        category: 'Cryptography',
        difficulty: 'hard',
        points: 200,
        flag: 'SAUR{rsa_private_key_exposed}',
        status: 'Live',
        description: 'Factor the modulus and recover the private key.',
        hints: [{ text: 'Start by checking if n is factorable with common methods.', cost: 50, locked: true }]
    },
    {
        id: 'binary_easy',
        name: 'Buffer Overflow Basics',
        category: 'Binary',
        difficulty: 'easy',
        points: 100,
        flag: 'SAUR{buffer_overflow_success}',
        status: 'Live',
        description: 'Craft an input that overflows the buffer and redirects execution.',
        hints: [{ text: 'Look for the hidden win function.', cost: 25, locked: true }]
    },
    {
        id: 'binary_hard',
        name: 'ROP Chain Exploitation',
        category: 'Binary',
        difficulty: 'hard',
        points: 200,
        flag: 'SAUR{rop_chain_master}',
        status: 'Live',
        description: 'Build a ROP chain to bypass protections and read the flag file.',
        hints: [{ text: 'Use gadgets to align the stack before system calls.', cost: 50, locked: true }]
    },
    {
        id: 'forensics_easy',
        name: 'Metadata Extraction',
        category: 'Forensics',
        difficulty: 'easy',
        points: 100,
        flag: 'SAUR{metadata_revealed}',
        status: 'Live',
        description: 'Analyze a JPEG image and extract hidden metadata.',
        hints: [{ text: 'The metadata is embedded in EXIF fields.', cost: 25, locked: true }]
    },
    {
        id: 'forensics_hard',
        name: 'Disk Image Recovery',
        category: 'Forensics',
        difficulty: 'hard',
        points: 200,
        flag: 'SAUR{deleted_files_recovered}',
        status: 'Live',
        description: 'Recover deleted files from a disk image using forensic tools.',
        hints: [{ text: 'Unallocated space holds the interesting fragments.', cost: 50, locked: true }]
    },
    {
        id: 'osint_easy',
        name: 'WHOIS & DNS Reconnaissance',
        category: 'OSINT',
        difficulty: 'easy',
        points: 100,
        flag: 'SAUR{osint_domain_enum}',
        status: 'Live',
        description: 'Perform WHOIS and DNS lookups on a domain and find the flag in contact details.',
        hints: [{ text: 'Subdomains and MX records are a good starting point.', cost: 25, locked: true }]
    },
    {
        id: 'osint_hard',
        name: 'Social Engineering & OSINT',
        category: 'OSINT',
        difficulty: 'hard',
        points: 200,
        flag: 'SAUR{osint_social_engineer}',
        status: 'Live',
        description: 'Gather intelligence from public sources to uncover credentials or hidden APIs.',
        hints: [{ text: 'Cross-reference public profiles and repositories.', cost: 50, locked: true }]
    }
];

const state = {
    data: null,
    chart: null,
    currentChallengeId: null,
    search: '',
    category: 'all',
    difficulty: 'all',
    status: 'all'
};

document.addEventListener('DOMContentLoaded', function() {
    state.data = loadData();
    initParticles();
    bindEvents();
    renderAll();
});

window.addEventListener('storage', function(event) {
    if (event.key === ADMIN_STORAGE_KEY) {
        state.data = loadData();
        renderAll();
    }
});

function loadData() {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : buildDefaultData();

    if (!parsed.contest) {
        parsed.contest = { startHour: 10, durationHours: 8, freezeMinutes: 30, freezeLeaderboard: false };
    }
    if (!Array.isArray(parsed.teams)) {
        parsed.teams = [];
    }
    if (!Array.isArray(parsed.users)) {
        parsed.users = [];
    }
    if (!parsed.challengeStats || typeof parsed.challengeStats !== 'object') {
        parsed.challengeStats = {};
    }
    if (!Array.isArray(parsed.challenges)) {
        parsed.challenges = BASE_CHALLENGES.map(normalizeChallenge);
    }

    const challengeMap = new Map(parsed.challenges.map(function(challenge) {
        return [challenge.id, normalizeChallenge(challenge)];
    }));

    BASE_CHALLENGES.forEach(function(challenge) {
        if (!challengeMap.has(challenge.id)) {
            challengeMap.set(challenge.id, normalizeChallenge(challenge));
        }
    });

    parsed.challenges = Array.from(challengeMap.values()).map(function(challenge) {
        const stats = parsed.challengeStats[challenge.id] || {};
        return {
            ...challenge,
            solveCount: Number(stats.solveCount || challenge.solveCount || 0),
            firstBloodUser: stats.firstBloodUser || challenge.firstBloodUser || '',
            firstBloodAt: stats.firstBloodAt || challenge.firstBloodAt || '',
            firstBloodTeam: stats.firstBloodTeam || challenge.firstBloodTeam || '',
            recentSolves: Array.isArray(stats.recentSolves) ? stats.recentSolves : (challenge.recentSolves || [])
        };
    });

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
}

function buildDefaultData() {
    return {
        contest: {
            startHour: 10,
            durationHours: 8,
            freezeMinutes: 30,
            freezeLeaderboard: false
        },
        teams: [],
        users: [],
        challenges: BASE_CHALLENGES.map(normalizeChallenge),
        challengeStats: {}
    };
}

function normalizeChallenge(challenge, index) {
    return {
        id: challenge.id || `challenge_${Date.now()}_${index || 0}`,
        name: challenge.name || challenge.title || 'Untitled Challenge',
        category: challenge.category || 'Web Exploitation',
        difficulty: challenge.difficulty || 'easy',
        points: Number(challenge.points || 0),
        flag: challenge.flag || '',
        status: challenge.status || 'Draft',
        description: challenge.description || '',
        resources: Array.isArray(challenge.resources) ? challenge.resources.filter(function(resource) {
            return typeof resource === 'string' && resource.trim();
        }) : [],
        hints: Array.isArray(challenge.hints) ? challenge.hints.map(function(hint) {
            return {
                text: hint.text || '',
                cost: Number(hint.cost || 0),
                locked: hint.locked !== false
            };
        }) : [],
        solveCount: Number(challenge.solveCount || 0),
        firstBloodUser: challenge.firstBloodUser || '',
        firstBloodAt: challenge.firstBloodAt || '',
        firstBloodTeam: challenge.firstBloodTeam || '',
        recentSolves: Array.isArray(challenge.recentSolves) ? challenge.recentSolves : []
    };
}

function saveData() {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state.data));
}

function bindEvents() {
    document.getElementById('adminSearch').addEventListener('input', function(event) {
        state.search = event.target.value.toLowerCase();
        renderAll();
    });

    document.getElementById('categoryFilter').addEventListener('change', function(event) {
        state.category = event.target.value;
        renderAll();
    });

    document.getElementById('difficultyFilter').addEventListener('change', function(event) {
        state.difficulty = event.target.value;
        renderAll();
    });

    document.getElementById('statusFilter').addEventListener('change', function(event) {
        state.status = event.target.value;
        renderAll();
    });

    document.getElementById('createChallengeBtn').addEventListener('click', function() {
        openEditor(null);
    });

    document.getElementById('closeModalBtn').addEventListener('click', closeEditor);
    document.getElementById('challengeModal').addEventListener('click', function(event) {
        if (event.target === this) {
            closeEditor();
        }
    });

    document.getElementById('addHintBtn').addEventListener('click', function() {
        appendHintRow();
    });

    document.getElementById('saveDraftBtn').addEventListener('click', function() {
        persistEditor('Draft');
    });

    document.getElementById('publishNowBtn').addEventListener('click', function() {
        persistEditor('Live');
    });

    document.getElementById('challengeForm').addEventListener('input', updateMarkdownPreview);
    document.getElementById('challengeGrid').addEventListener('click', handleCardAction);

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeEditor();
        }
    });
}

function renderAll() {
    renderHeaderCounts();
    renderChallengeCards();
    renderAnalytics();
    renderChart();
}

function renderHeaderCounts() {
    document.getElementById('challengeCountLabel').textContent = `${state.data.challenges.length} challenges`;
}

function getFilteredChallenges() {
    return state.data.challenges.filter(function(challenge) {
        const stats = state.data.challengeStats[challenge.id] || {};
        const solveCount = Number(stats.solveCount || challenge.solveCount || 0);
        const query = [
            challenge.name,
            challenge.category,
            challenge.difficulty,
            challenge.status,
            challenge.description,
            ...(Array.isArray(challenge.hints) ? challenge.hints.map(function(hint) { return hint.text; }) : [])
        ].join(' ').toLowerCase();

        return (!state.search || query.includes(state.search)) &&
            (state.category === 'all' || challenge.category === state.category) &&
            (state.difficulty === 'all' || challenge.difficulty === state.difficulty) &&
            (state.status === 'all' || challenge.status === state.status) &&
            Number.isFinite(solveCount);
    });
}

function renderChallengeCards() {
    const grid = document.getElementById('challengeGrid');
    const challenges = getFilteredChallenges();

    if (!challenges.length) {
        grid.innerHTML = '<div class="empty-state">No challenges match the current filters.</div>';
        return;
    }

    grid.innerHTML = challenges.map(function(challenge) {
        const stats = state.data.challengeStats[challenge.id] || {};
        const solveCount = Number(stats.solveCount || challenge.solveCount || 0);

        return `
            <article class="challenge-card admin-challenge-card" data-id="${challenge.id}">
                <div class="challenge-card-top">
                    <div>
                        <div class="challenge-name">${escapeHtml(challenge.name)}</div>
                        <div class="challenge-meta-row">
                            <span class="meta-chip">${escapeHtml(challenge.category)}</span>
                            <span class="meta-chip">${escapeHtml(challenge.difficulty)}</span>
                            <span class="meta-chip">${challenge.points} pts</span>
                        </div>
                    </div>
                    <div class="status-badge ${challenge.status === 'Live' ? 'live' : 'draft'}">${challenge.status}</div>
                </div>

                <div class="challenge-card-body">
                    <div class="challenge-description-snippet">${escapeHtml(stripMarkdown(challenge.description || 'No description yet.'))}</div>
                    <div class="challenge-card-stats">
                        <div class="mini-stat">
                            <span>Solve Count</span>
                            <strong>${solveCount}</strong>
                        </div>
                        <div class="mini-stat">
                            <span>Hints</span>
                            <strong>${Array.isArray(challenge.hints) ? challenge.hints.length : 0}</strong>
                        </div>
                        <div class="mini-stat">
                            <span>First Blood</span>
                            <strong>${stats.firstBloodUser ? escapeHtml(stats.firstBloodUser) : 'Pending'}</strong>
                        </div>
                    </div>
                </div>

                <div class="challenge-card-actions">
                    <button class="card-action-btn" data-action="edit" data-id="${challenge.id}">Edit</button>
                    <button class="card-action-btn danger" data-action="delete" data-id="${challenge.id}">Delete</button>
                    <button class="card-action-btn" data-action="toggle" data-id="${challenge.id}">${challenge.status === 'Live' ? 'Draft' : 'Live'}</button>
                    <button class="card-action-btn" data-action="hint" data-id="${challenge.id}">Add Hint</button>
                </div>
            </article>
        `;
    }).join('');
}

function handleCardAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) {
        return;
    }

    const challengeId = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (action === 'edit') {
        openEditor(challengeId);
        return;
    }

    if (action === 'delete') {
        deleteChallenge(challengeId);
        return;
    }

    if (action === 'toggle') {
        toggleChallengeStatus(challengeId);
        return;
    }

    if (action === 'hint') {
        openEditor(challengeId, true);
    }
}

function toggleChallengeStatus(challengeId) {
    const challenge = state.data.challenges.find(function(item) {
        return item.id === challengeId;
    });

    if (!challenge) {
        return;
    }

    challenge.status = challenge.status === 'Live' ? 'Draft' : 'Live';
    saveData();
    renderAll();
}

function deleteChallenge(challengeId) {
    const challenge = state.data.challenges.find(function(item) {
        return item.id === challengeId;
    });

    if (!challenge) {
        return;
    }

    state.data.challenges = state.data.challenges.filter(function(item) {
        return item.id !== challengeId;
    });
    delete state.data.challengeStats[challengeId];
    saveData();
    renderAll();
}

function renderAnalytics() {
    renderFirstBloodList();
    renderUnsolvedList();
    renderQuickStats();
}

function renderFirstBloodList() {
    const target = document.getElementById('firstBloodList');
    const solvedChallenges = state.data.challenges
        .map(function(challenge) {
            const stats = state.data.challengeStats[challenge.id] || {};
            return {
                name: challenge.name,
                firstBloodUser: stats.firstBloodUser || '',
                firstBloodAt: stats.firstBloodAt || '',
                hasFirstBlood: !!stats.firstBloodUser
            };
        })
        .filter(function(item) {
            return item.hasFirstBlood;
        })
        .sort(function(a, b) {
            return new Date(b.firstBloodAt).getTime() - new Date(a.firstBloodAt).getTime();
        });

    if (!solvedChallenges.length) {
        target.innerHTML = '<div class="empty-state">No first bloods recorded yet.</div>';
        return;
    }

    target.innerHTML = solvedChallenges.map(function(item) {
        return `
            <div class="timeline-row glow-row">
                <div class="timeline-name">${escapeHtml(item.name)}</div>
                <div class="timeline-user">${escapeHtml(item.firstBloodUser)}</div>
                <div class="timeline-time">${formatTime(item.firstBloodAt)}</div>
            </div>
        `;
    }).join('');
}

function renderUnsolvedList() {
    const target = document.getElementById('unsolvedList');
    const unsolved = state.data.challenges.filter(function(challenge) {
        const stats = state.data.challengeStats[challenge.id] || {};
        return Number(stats.solveCount || challenge.solveCount || 0) === 0;
    });

    if (!unsolved.length) {
        target.innerHTML = '<div class="empty-state">Every challenge has at least one solve.</div>';
        return;
    }

    target.innerHTML = unsolved.map(function(challenge) {
        return `
            <div class="timeline-row warning-row">
                <div class="timeline-name">${escapeHtml(challenge.name)}</div>
                <div class="timeline-user">No solves</div>
                <div class="timeline-time">${escapeHtml(challenge.category)}</div>
            </div>
        `;
    }).join('');
}

function renderQuickStats() {
    const target = document.getElementById('quickStatsGrid');
    const totalChallenges = state.data.challenges.length;
    const totalSolves = state.data.challenges.reduce(function(acc, challenge) {
        const stats = state.data.challengeStats[challenge.id] || {};
        return acc + Number(stats.solveCount || challenge.solveCount || 0);
    }, 0);
    const activeTeams = state.data.teams.filter(function(team) {
        return team.status !== 'blocked';
    }).length;
    const mostSolved = state.data.challenges
        .map(function(challenge) {
            const stats = state.data.challengeStats[challenge.id] || {};
            return { name: challenge.name, solveCount: Number(stats.solveCount || challenge.solveCount || 0) };
        })
        .sort(function(a, b) {
            if (b.solveCount !== a.solveCount) {
                return b.solveCount - a.solveCount;
            }
            return a.name.localeCompare(b.name);
        })[0];

    const quickStats = [
        { label: 'Total Challenges', value: totalChallenges },
        { label: 'Total Solves', value: totalSolves },
        { label: 'Active Teams', value: activeTeams },
        { label: 'Most Solved', value: mostSolved ? mostSolved.name : 'N/A' }
    ];

    target.innerHTML = quickStats.map(function(stat) {
        return `
            <div class="quick-stat-card">
                <span class="quick-stat-label">${escapeHtml(stat.label)}</span>
                <strong class="quick-stat-value">${escapeHtml(String(stat.value))}</strong>
            </div>
        `;
    }).join('');
}

function renderChart() {
    const context = document.getElementById('solveChart').getContext('2d');
    const labels = state.data.challenges.map(function(challenge) { return challenge.name; });
    const solves = state.data.challenges.map(function(challenge) {
        const stats = state.data.challengeStats[challenge.id] || {};
        return Number(stats.solveCount || challenge.solveCount || 0);
    });

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: '#050814',
                titleColor: '#dff7ff',
                bodyColor: '#ffffff',
                borderColor: '#00d4ff',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        return ` Solves: ${context.raw}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#9ab4dc' },
                grid: { color: 'rgba(0, 212, 255, 0.08)' }
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#9ab4dc', precision: 0 },
                grid: { color: 'rgba(0, 212, 255, 0.08)' }
            }
        }
    };

    if (!state.chart) {
        state.chart = new Chart(context, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Solves',
                    data: solves,
                    borderWidth: 1,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.42)',
                    hoverBackgroundColor: 'rgba(65, 240, 255, 0.82)'
                }]
            },
            options: chartOptions
        });
        return;
    }

    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = solves;
    state.chart.update();
}

function openEditor(challengeId, focusHints) {
    state.currentChallengeId = challengeId;
    const challenge = challengeId ? state.data.challenges.find(function(item) { return item.id === challengeId; }) : null;
    document.getElementById('challengeModal').classList.remove('hidden');
    document.getElementById('challengeModal').setAttribute('aria-hidden', 'false');
    document.getElementById('modalTitle').textContent = challenge ? 'Edit Challenge' : 'Create Challenge';

    document.getElementById('challengeId').value = challenge ? challenge.id : '';
    document.getElementById('challengeName').value = challenge ? challenge.name : '';
    document.getElementById('challengeCategory').value = challenge ? challenge.category : 'Web Exploitation';
    document.getElementById('challengeDifficulty').value = challenge ? challenge.difficulty : 'easy';
    document.getElementById('challengePoints').value = challenge ? challenge.points : 100;
    document.getElementById('challengeFlag').value = challenge ? challenge.flag : '';
    document.getElementById('challengeStatus').value = challenge ? challenge.status : 'Draft';
    document.getElementById('challengeDescription').value = challenge ? challenge.description : '';
    document.getElementById('challengeResources').value = challenge && Array.isArray(challenge.resources)
        ? challenge.resources.join('\n')
        : '';

    renderHintRows(challenge ? challenge.hints : []);
    updateMarkdownPreview();

    if (focusHints) {
        setTimeout(function() {
            document.getElementById('hintList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 25);
    }
}

function closeEditor() {
    state.currentChallengeId = null;
    document.getElementById('challengeModal').classList.add('hidden');
    document.getElementById('challengeModal').setAttribute('aria-hidden', 'true');
}

function renderHintRows(hints) {
    const target = document.getElementById('hintList');
    const rows = Array.isArray(hints) ? hints : [];
    target.innerHTML = '';

    if (!rows.length) {
        appendHintRow();
        return;
    }

    rows.forEach(function(hint) {
        appendHintRow(hint);
    });
}

function appendHintRow(hint) {
    const row = document.createElement('div');
    row.className = 'hint-row';
    row.innerHTML = `
        <input type="text" class="hint-text-input" placeholder="Hint text" value="${escapeAttribute(hint && hint.text ? hint.text : '')}">
        <input type="number" class="hint-cost-input" min="0" step="5" placeholder="Cost" value="${hint && typeof hint.cost !== 'undefined' ? hint.cost : 25}">
        <select class="hint-lock-input">
            <option value="true" ${!hint || hint.locked !== false ? 'selected' : ''}>Locked</option>
            <option value="false" ${hint && hint.locked === false ? 'selected' : ''}>Unlocked</option>
        </select>
        <button class="icon-button hint-remove-btn" type="button" aria-label="Remove hint"><i class="fas fa-trash"></i></button>
    `;

    row.querySelector('.hint-remove-btn').addEventListener('click', function() {
        row.remove();
        updateMarkdownPreview();
    });

    row.querySelectorAll('input, select').forEach(function(input) {
        input.addEventListener('input', updateMarkdownPreview);
        input.addEventListener('change', updateMarkdownPreview);
    });

    document.getElementById('hintList').appendChild(row);
}

function collectHints() {
    return Array.from(document.querySelectorAll('#hintList .hint-row')).map(function(row) {
        return {
            text: row.querySelector('.hint-text-input').value.trim(),
            cost: Number(row.querySelector('.hint-cost-input').value || 0),
            locked: row.querySelector('.hint-lock-input').value === 'true'
        };
    }).filter(function(hint) {
        return !!hint.text;
    });
}

function collectResources() {
    const resourcesField = document.getElementById('challengeResources');
    if (!resourcesField) {
        return [];
    }

    return resourcesField.value
        .split('\n')
        .map(function(resource) {
            return resource.trim();
        })
        .filter(function(resource) {
            return !!resource;
        });
}

function persistEditor(forcedStatus) {
    const idInput = document.getElementById('challengeId').value.trim();
    const existingIndex = state.data.challenges.findIndex(function(item) {
        return item.id === idInput;
    });

    const challenge = normalizeChallenge({
        id: idInput || `challenge_${Date.now()}`,
        name: document.getElementById('challengeName').value.trim(),
        category: document.getElementById('challengeCategory').value,
        difficulty: document.getElementById('challengeDifficulty').value,
        points: Number(document.getElementById('challengePoints').value || 0),
        flag: document.getElementById('challengeFlag').value.trim(),
        status: forcedStatus || document.getElementById('challengeStatus').value,
        description: document.getElementById('challengeDescription').value.trim(),
        resources: collectResources(),
        hints: collectHints()
    });

    if (existingIndex >= 0) {
        state.data.challenges[existingIndex] = {
            ...state.data.challenges[existingIndex],
            ...challenge,
            id: state.data.challenges[existingIndex].id
        };
    } else {
        state.data.challenges.push(challenge);
        if (!state.data.challengeStats[challenge.id]) {
            state.data.challengeStats[challenge.id] = { solveCount: 0, recentSolves: [] };
        }
    }

    saveData();
    closeEditor();
    renderAll();
}

function updateMarkdownPreview() {
    const editor = document.getElementById('challengeDescription');
    const preview = document.getElementById('markdownPreview');
    if (!editor || !preview) {
        return;
    }

    const markdown = editor.value || 'No description yet.';
    if (window.marked && typeof window.marked.parse === 'function') {
        preview.innerHTML = window.marked.parse(markdown);
    } else {
        preview.textContent = markdown;
    }
}

function formatTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function stripMarkdown(text) {
    return String(text || '')
        .replace(/[#*_>`\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/\n/g, ' ');
}

function initParticles() {
    const container = document.querySelector('.particle-background');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    for (let index = 0; index < 24; index += 1) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = `${Math.random() * 3 + 1}px`;
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = 'rgba(0, 212, 255, 0.5)';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animation = `float ${Math.random() * 10 + 5}s infinite`;
        container.appendChild(particle);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.5;
        }
        50% {
            transform: translateY(-30px) translateX(10px);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
