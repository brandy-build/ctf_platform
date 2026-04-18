const ADMIN_STORAGE_KEY = 'ctfAdminData';
const PLAYER_STATE_KEY = 'ctfPlayerState';
const PROGRESS_STORAGE_KEY = 'ctfProgress';
const PROFILE_STORAGE_KEY = 'ctfUserProfile';

const challenges = {
    'Web Exploitation': {
        icon: 'fa-globe',
        color: '#00d4ff',
        challenges: [
            {
                id: 'web_easy',
                title: 'SQL Injection 101',
                difficulty: 'easy',
                points: 100,
                description: 'Find the SQL injection vulnerability in the login form and retrieve the admin flag. Hint: Try adding a single quote (\'1\'=\'1) in the username field.',
                flag: 'SAUR{sql_injection_bypassed}',
                category: 'Web Exploitation'
            },
            {
                id: 'web_hard',
                title: 'XSS & CSRF Exploitation',
                difficulty: 'hard',
                points: 200,
                description: 'Exploit both XSS and CSRF vulnerabilities in the commented form. You need to craft a malicious payload that steals session cookies and perform unauthorized actions.',
                flag: 'SAUR{xss_csrf_master}',
                category: 'Web Exploitation'
            }
        ]
    },
    Cryptography: {
        icon: 'fa-lock',
        color: '#ff6b00',
        challenges: [
            {
                id: 'crypto_easy',
                title: 'Caesar Cipher Decryption',
                difficulty: 'easy',
                points: 100,
                description: 'Decrypt the following message using Caesar cipher: "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj". Find the correct shift value and submit the decrypted message as the flag.',
                flag: 'SAUR{the_quick_brown_fox}',
                category: 'Cryptography'
            },
            {
                id: 'crypto_hard',
                title: 'RSA Private Key Recovery',
                difficulty: 'hard',
                points: 200,
                description: 'Given RSA public parameters, determine the private key. You have: n=6537424611447, e=65537. Factor the modulus to find p and q, then calculate d.',
                flag: 'SAUR{rsa_private_key_exposed}',
                category: 'Cryptography'
            }
        ]
    },
    Binary: {
        icon: 'fa-cog',
        color: '#00ff41',
        challenges: [
            {
                id: 'binary_easy',
                title: 'Buffer Overflow Basics',
                difficulty: 'easy',
                points: 100,
                description: 'Analyze a vulnerable C program with a fixed-size buffer. Craft an input that overflows the buffer and overwrites the return address to jump to a hidden function that prints the flag.',
                flag: 'SAUR{buffer_overflow_success}',
                category: 'Binary'
            },
            {
                id: 'binary_hard',
                title: 'ROP Chain Exploitation',
                difficulty: 'hard',
                points: 200,
                description: 'Perform a Return-Oriented Programming (ROP) attack on a binary with ASLR enabled. Construct a ROP chain to bypass protections and execute system calls to read the flag file.',
                flag: 'SAUR{rop_chain_master}',
                category: 'Binary'
            }
        ]
    },
    Forensics: {
        icon: 'fa-search',
        color: '#ff1744',
        challenges: [
            {
                id: 'forensics_easy',
                title: 'Metadata Extraction',
                difficulty: 'easy',
                points: 100,
                description: 'Analyze a JPEG image and extract hidden metadata. Use tools like exiftool to find embedded information. The GPS coordinates and timestamp contain clues to the flag.',
                flag: 'SAUR{metadata_revealed}',
                category: 'Forensics'
            },
            {
                id: 'forensics_hard',
                title: 'Disk Image Recovery',
                difficulty: 'hard',
                points: 200,
                description: 'Recover deleted files from a disk image using forensic tools. Mount the image and search for unallocated space containing fragments of the flag file. Reconstruct the deleted data.',
                flag: 'SAUR{deleted_files_recovered}',
                category: 'Forensics'
            }
        ]
    },
    OSINT: {
        icon: 'fa-user-secret',
        color: '#ff1493',
        challenges: [
            {
                id: 'osint_easy',
                title: 'WHOIS & DNS Reconnaissance',
                difficulty: 'easy',
                points: 100,
                description: 'Perform WHOIS and DNS lookups on a domain. Find hidden subdomains, MX records, and administrative contact information. The flag is hidden in the domain registrant\'s contact details.',
                flag: 'SAUR{osint_domain_enum}',
                category: 'OSINT'
            },
            {
                id: 'osint_hard',
                title: 'Social Engineering & Open Source Intelligence',
                difficulty: 'hard',
                points: 200,
                description: 'Gather intelligence from public sources: social media profiles, GitHub repositories, LinkedIn connections, and company websites. Piece together sensitive information to find credentials or hidden API endpoints.',
                flag: 'SAUR{osint_social_engineer}',
                category: 'OSINT'
            }
        ]
    }
};

let completedChallenges = new Set();
let totalScore = 0;
let currentChallenge = null;
let currentCategory = null;
let adminData = null;
let playerState = null;
let userProfile = null;

document.addEventListener('DOMContentLoaded', function() {
    adminData = loadAdminData();
    playerState = loadPlayerState(adminData);
    userProfile = loadUserProfile();
    loadFromLocalStorage();

    ensureValidActiveTeam();
    renderTeamSelector();
    renderProfileNav();
    renderCategories();
    updateStats();
    updateClock();
    updateCountdownDial();

    setInterval(updateClock, 1000);
    setInterval(updateCountdownDial, 1000);

    const modal = document.getElementById('challengeModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        const modalEl = document.getElementById('challengeModal');
        if (!modalEl || !modalEl.classList.contains('active')) {
            return;
        }

        if (e.key === 'Enter') {
            submitFlag();
        }

        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

window.addEventListener('storage', function(e) {
    if (e.key === ADMIN_STORAGE_KEY || e.key === PLAYER_STATE_KEY || e.key === PROGRESS_STORAGE_KEY) {
        adminData = loadAdminData();
        playerState = loadPlayerState(adminData);
        userProfile = loadUserProfile();
        loadFromLocalStorage();
        ensureValidActiveTeam();
        renderTeamSelector();
        renderProfileNav();
        renderCategories();
        updateStats();
    }
});

function loadUserProfile() {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
        const initial = {
            username: 'Player',
            email: '',
            avatar: 'profile-images/avatar-1.jpg'
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed.avatar || parsed.avatar.endsWith('.svg')) {
        parsed.avatar = 'profile-images/avatar-1.jpg';
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
}

function renderProfileNav() {
    const avatarEl = document.getElementById('profileNavAvatar');
    if (!avatarEl) {
        return;
    }

    avatarEl.src = userProfile.avatar || 'profile-images/avatar-1.jpg';
    avatarEl.alt = `${userProfile.username || 'Player'} avatar`;
}

function buildDefaultAdminData() {
    const challengeConfig = {};
    Object.values(challenges).forEach(function(category) {
        category.challenges.forEach(function(challenge) {
            challengeConfig[challenge.id] = {
                releaseLink: '',
                hint: 'No hint configured by admin.',
                hintCost: 50,
                isReleased: true
            };
        });
    });

    return {
        contest: {
            startHour: 10,
            durationHours: 8,
            freezeMinutes: 30,
            freezeLeaderboard: false
        },
        teams: [
            {
                id: `team_${Date.now()}`,
                name: 'Red Foxes',
                institution: 'Security Club',
                country: 'IN',
                members: 4,
                status: 'active',
                points: 0,
                penalty: 0,
                solved: 0,
                lastSolveAt: null,
                solvedChallenges: [],
                hintsPurchased: 0
            }
        ],
        users: [
            {
                id: `user_${Date.now()}`,
                name: 'admin',
                email: 'admin@jarvis.local',
                role: 'admin',
                teamId: null,
                status: 'active'
            }
        ],
        challengeConfig
    };
}

function loadAdminData() {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    let data = raw ? JSON.parse(raw) : buildDefaultAdminData();

    if (!data.challengeConfig) {
        data.challengeConfig = {};
    }

    Object.values(challenges).forEach(function(category) {
        category.challenges.forEach(function(challenge) {
            if (!data.challengeConfig[challenge.id]) {
                data.challengeConfig[challenge.id] = {
                    releaseLink: '',
                    hint: 'No hint configured by admin.',
                    hintCost: 50,
                    isReleased: true
                };
            }
        });
    });

    if (Array.isArray(data.challenges)) {
        data.challenges.forEach(function(challenge) {
            if (!challenge || !challenge.id) {
                return;
            }

            if (!data.challengeConfig[challenge.id]) {
                data.challengeConfig[challenge.id] = {
                    releaseLink: '',
                    hint: 'No hint configured by admin.',
                    hintCost: 50,
                    isReleased: true
                };
            }

            if (Array.isArray(challenge.resources)) {
                data.challengeConfig[challenge.id].resources = challenge.resources.filter(function(resource) {
                    return typeof resource === 'string' && resource.trim();
                });
            }
        });
    }

    if (!Array.isArray(data.teams)) {
        data.teams = [];
    }

    if (!Array.isArray(data.users)) {
        data.users = [];
    }

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
    return data;
}

function loadPlayerState(currentAdminData) {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    let state = raw ? JSON.parse(raw) : { activeTeamId: null, hintsUnlockedByTeam: {} };
    if (!state.hintsUnlockedByTeam || typeof state.hintsUnlockedByTeam !== 'object') {
        state.hintsUnlockedByTeam = {};
    }

    if (!state.activeTeamId && currentAdminData.teams.length > 0) {
        state.activeTeamId = currentAdminData.teams[0].id;
    }

    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    return state;
}

function saveAdminData() {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminData));
}

function savePlayerState() {
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(playerState));
}

function ensureValidActiveTeam() {
    const teamExists = adminData.teams.some(function(team) {
        return team.id === playerState.activeTeamId;
    });

    if (!teamExists) {
        playerState.activeTeamId = adminData.teams.length ? adminData.teams[0].id : null;
        savePlayerState();
    }
}

function getActiveTeam() {
    return adminData.teams.find(function(team) {
        return team.id === playerState.activeTeamId;
    }) || null;
}

function renderTeamSelector() {
    const select = document.getElementById('teamSelect');
    if (!select) {
        return;
    }

    if (!adminData.teams.length) {
        select.innerHTML = '<option value="">No Teams</option>';
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = adminData.teams
        .filter(function(team) {
            return team.status !== 'blocked';
        })
        .map(function(team) {
            return `<option value="${team.id}">${team.name}</option>`;
        })
        .join('');

    select.value = playerState.activeTeamId;

    select.onchange = function() {
        playerState.activeTeamId = select.value;
        savePlayerState();
        updateStats();
        renderCategories();
    };
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const liveTime = document.getElementById('liveTime');
    if (liveTime) {
        liveTime.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function updateCountdownDial() {
    const dial = document.getElementById('countdownDial');
    const valueEl = document.getElementById('countdownValue');
    const labelEl = document.getElementById('countdownLabel');
    if (!dial || !valueEl || !labelEl) {
        return;
    }

    const now = new Date();
    const start = new Date(now);
    const startHour = Number(adminData.contest.startHour) || 10;
    const durationHours = Number(adminData.contest.durationHours) || 8;
    start.setHours(startHour, 0, 0, 0);

    const contestDurationSeconds = durationHours * 60 * 60;
    const elapsedSeconds = now < start ? 0 : Math.floor((now - start) / 1000);
    const remainingSeconds = Math.max(0, contestDurationSeconds - elapsedSeconds);

    const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(remainingSeconds % 60).padStart(2, '0');

    valueEl.textContent = `${hours}:${minutes}:${seconds}`;
    labelEl.textContent = remainingSeconds === 0 ? 'Contest Finished' : 'Time Remaining';
}

function renderCategories() {
    const container = document.getElementById('categoriesSections');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    Object.entries(challenges).forEach(function(entry) {
        const categoryName = entry[0];
        const categoryData = entry[1];
        const section = document.createElement('div');
        section.className = 'category-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'category-section-header';
        sectionHeader.innerHTML = `<h3 class="category-section-title">${categoryName}</h3>`;
        section.appendChild(sectionHeader);

        const grid = document.createElement('div');
        grid.className = 'challenges-grid';

        categoryData.challenges.forEach(function(challenge) {
            const config = adminData.challengeConfig[challenge.id] || {};
            const released = config.isReleased !== false;
            const activeTeam = getActiveTeam();
            const teamSolved = activeTeam ? (activeTeam.solvedChallenges || []).includes(challenge.id) : false;

            const isSolved = completedChallenges.has(challenge.id) || teamSolved;
            const labelText = !released ? 'NOT RELEASED' : (isSolved ? 'SOLVED' : challenge.title);
            const labelClass = !released ? 'inactive unreleased' : (isSolved ? 'solved' : 'inactive');

            const card = document.createElement('div');
            card.className = `challenge-card ${isSolved ? 'completed' : ''}`;
            card.innerHTML = `<button class="challenge-label ${labelClass}" onclick="openChallenge('${challenge.id}', '${categoryName}')">${labelText}</button>`;
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

function updateStats() {
    const activeTeam = getActiveTeam();
    const totalChallenges = Object.values(challenges).reduce(function(acc, category) {
        return acc + category.challenges.length;
    }, 0);

    const solvedCount = activeTeam ? (activeTeam.solvedChallenges || []).length : completedChallenges.size;
    const displayScore = activeTeam ? Math.max(0, (activeTeam.points || 0) - (activeTeam.penalty || 0)) : totalScore;

    const flagCountEl = document.getElementById('flagCount');
    const scoreEl = document.getElementById('scoreCount');
    if (flagCountEl) {
        flagCountEl.textContent = `${solvedCount}/${totalChallenges}`;
    }
    if (scoreEl) {
        scoreEl.textContent = displayScore;
    }
}

function openChallenge(challengeId, categoryName) {
    const challenge = challenges[categoryName].challenges.find(function(item) {
        return item.id === challengeId;
    });
    if (!challenge) {
        return;
    }

    currentChallenge = challenge;
    currentCategory = categoryName;

    const config = adminData.challengeConfig[challenge.id] || {};
    const released = config.isReleased !== false;

    document.getElementById('modalTitle').textContent = challenge.title;
    document.getElementById('difficultyBadge').textContent = challenge.difficulty.toUpperCase();
    document.getElementById('difficultyBadge').className = `difficulty-badge ${challenge.difficulty}`;
    document.getElementById('modalDescription').textContent = challenge.description;
    document.getElementById('pointsValue').textContent = `${challenge.points} pts`;

    const releaseLink = document.getElementById('challengeReleaseLink');
    const metaPanel = document.getElementById('challengeMetaPanel');
    if (config.releaseLink) {
        releaseLink.href = config.releaseLink;
        releaseLink.textContent = 'Open Challenge Link';
    } else {
        releaseLink.removeAttribute('href');
        releaseLink.textContent = 'No release link configured';
    }
    metaPanel.classList.toggle('hidden', !released);

    renderHintState();

    const resources = getChallengeResources(challenge.id);
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = resources.map(function(resource) {
        return `<li>${resource}</li>`;
    }).join('');

    const feedback = document.getElementById('feedback');
    feedback.textContent = released ? '' : 'This challenge is not released yet by admin.';
    feedback.className = released ? 'feedback' : 'feedback error';

    const input = document.getElementById('flagInput');
    input.value = '';
    input.disabled = !released;

    const submitBtn = document.querySelector('.flag-input-container .submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !released;
    }

    const modal = document.getElementById('challengeModal');
    modal.classList.add('active');
}

function renderHintState() {
    const hintPanel = document.getElementById('hintPanel');
    const hintText = document.getElementById('hintText');
    const hintCostLabel = document.getElementById('hintCostLabel');
    const buyBtn = document.getElementById('buyHintBtn');

    if (!currentChallenge || !hintPanel || !hintText || !hintCostLabel || !buyBtn) {
        return;
    }

    const config = adminData.challengeConfig[currentChallenge.id] || {};
    const released = config.isReleased !== false;
    const cost = Number(config.hintCost) || 0;
    const team = getActiveTeam();

    if (!team) {
        hintPanel.classList.add('hidden');
        return;
    }

    hintPanel.classList.remove('hidden');
    hintCostLabel.textContent = `${cost} pts`;

    const unlockedForTeam = playerState.hintsUnlockedByTeam[team.id] || [];
    const unlocked = unlockedForTeam.includes(currentChallenge.id);

    if (!released) {
        hintText.textContent = 'Hint locked because challenge is not released.';
        buyBtn.disabled = true;
        buyBtn.textContent = 'Unavailable';
        return;
    }

    if (unlocked) {
        hintText.textContent = config.hint || 'No hint configured by admin.';
        buyBtn.disabled = true;
        buyBtn.textContent = 'Hint Unlocked';
        return;
    }

    hintText.textContent = 'Hint is locked. Spend points to unlock this hint.';
    buyBtn.disabled = false;
    buyBtn.textContent = 'Unlock Hint';
}

function buyHint() {
    if (!currentChallenge) {
        return;
    }

    const team = getActiveTeam();
    const feedback = document.getElementById('feedback');
    if (!team) {
        feedback.textContent = 'No active team selected.';
        feedback.className = 'feedback error';
        return;
    }

    const config = adminData.challengeConfig[currentChallenge.id] || {};
    const cost = Number(config.hintCost) || 0;
    const netScore = Math.max(0, (team.points || 0) - (team.penalty || 0));

    if (netScore < cost) {
        feedback.textContent = `Not enough points. Required: ${cost} pts.`;
        feedback.className = 'feedback error';
        return;
    }

    const unlocked = playerState.hintsUnlockedByTeam[team.id] || [];
    if (unlocked.includes(currentChallenge.id)) {
        renderHintState();
        return;
    }

    team.penalty = (team.penalty || 0) + cost;
    team.hintsPurchased = (team.hintsPurchased || 0) + 1;
    unlocked.push(currentChallenge.id);
    playerState.hintsUnlockedByTeam[team.id] = unlocked;

    saveAdminData();
    savePlayerState();
    updateStats();
    renderHintState();
    feedback.textContent = `Hint unlocked for ${cost} points.`;
    feedback.className = 'feedback success';
}

function closeModal() {
    const modal = document.getElementById('challengeModal');
    modal.classList.remove('active');
    currentChallenge = null;
    currentCategory = null;
}

function submitFlag() {
    if (!currentChallenge || !currentCategory) {
        return;
    }

    const input = document.getElementById('flagInput');
    const feedback = document.getElementById('feedback');
    const userInput = input.value.trim();
    const config = adminData.challengeConfig[currentChallenge.id] || {};

    if (config.isReleased === false) {
        feedback.textContent = 'This challenge is not released yet by admin.';
        feedback.className = 'feedback error';
        return;
    }

    if (!userInput) {
        feedback.textContent = 'Please enter a flag';
        feedback.className = 'feedback error';
        return;
    }

    const normalizedInput = userInput.toLowerCase();
    const normalizedFlag = currentChallenge.flag.toLowerCase();

    if (normalizedInput !== normalizedFlag) {
        feedback.textContent = 'Incorrect flag. Try again!';
        feedback.className = 'feedback error';
        return;
    }

    const team = getActiveTeam();
    if (!team) {
        feedback.textContent = 'No active team selected. Ask admin to create a team.';
        feedback.className = 'feedback error';
        return;
    }

    if (!completedChallenges.has(currentChallenge.id)) {
        completedChallenges.add(currentChallenge.id);
        totalScore += currentChallenge.points;
    }

    if (!Array.isArray(team.solvedChallenges)) {
        team.solvedChallenges = [];
    }

    if (!team.solvedChallenges.includes(currentChallenge.id)) {
        team.solvedChallenges.push(currentChallenge.id);
        team.solved = team.solvedChallenges.length;
        team.points = (team.points || 0) + currentChallenge.points;
        team.lastSolveAt = new Date().toISOString();
            if (!Array.isArray(team.solveHistory)) {
                team.solveHistory = [];
            }
            team.solveHistory.push({
                challengeId: currentChallenge.id,
                challengeName: currentChallenge.title,
                at: team.lastSolveAt,
                hintsUsed: (playerState.hintsUnlockedByTeam[team.id] || []).includes(currentChallenge.id) ? 1 : 0
            });
            team.solveHistory = team.solveHistory.slice(-50);
        feedback.textContent = `Correct! Team ${team.name} earned ${currentChallenge.points} points.`;

        if (!adminData.challengeStats) {
            adminData.challengeStats = {};
        }

        const challengeStats = adminData.challengeStats[currentChallenge.id] || {
            solveCount: 0,
            firstBloodUser: '',
            firstBloodAt: '',
            firstBloodTeam: '',
            recentSolves: []
        };

        challengeStats.solveCount = (challengeStats.solveCount || 0) + 1;
        challengeStats.recentSolves = Array.isArray(challengeStats.recentSolves) ? challengeStats.recentSolves : [];
        challengeStats.recentSolves.unshift({
            user: userProfile.username || team.name || 'Unknown',
            team: team.name || 'Unknown',
            at: team.lastSolveAt
        });
        challengeStats.recentSolves = challengeStats.recentSolves.slice(0, 5);

        if (!challengeStats.firstBloodUser) {
            challengeStats.firstBloodUser = userProfile.username || team.name || 'Unknown';
            challengeStats.firstBloodAt = team.lastSolveAt;
            challengeStats.firstBloodTeam = team.name || 'Unknown';
        }

        adminData.challengeStats[currentChallenge.id] = challengeStats;
    } else {
        feedback.textContent = `Correct, but ${team.name} already solved this challenge.`;
    }

    feedback.className = 'feedback success';
    saveAdminData();
    saveToLocalStorage();
    updateStats();
    renderCategories();
}

function saveToLocalStorage() {
    const data = {
        completedChallenges: Array.from(completedChallenges),
        totalScore
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
}

function loadFromLocalStorage() {
    const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!data) {
        return;
    }

    const parsed = JSON.parse(data);
    completedChallenges = new Set(parsed.completedChallenges || []);
    totalScore = parsed.totalScore || 0;
}

function getChallengeResources(challengeId) {
    const config = adminData.challengeConfig[challengeId] || {};
    if (Array.isArray(config.resources) && config.resources.length > 0) {
        return config.resources;
    }

    const resources = {
        web_easy: ['OWASP SQL Injection Cheat Sheet', 'Browser DevTools Network Tab'],
        web_hard: ['OWASP XSS Prevention Cheat Sheet', 'CSRF attack/defense guides'],
        crypto_easy: ['dCode Caesar Cipher Tool', 'ROT shift reference table'],
        crypto_hard: ['RsaCtfTool', 'modulus factorization references'],
        binary_easy: ['GDB basics', 'pwndbg pattern create/find'],
        binary_hard: ['ROPgadget', 'libc database'],
        forensics_easy: ['exiftool', 'strings command'],
        forensics_hard: ['sleuthkit/autopsy', 'photorec'],
        osint_easy: ['whois', 'nslookup/dig'],
        osint_hard: ['GitHub dorks', 'theHarvester']
    };
    return resources[challengeId] || ['No resources listed'];
}

function createParticles() {
    const container = document.querySelector('.particle-background');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    for (let i = 0; i < 20; i += 1) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = `${Math.random() * 3 + 1}px`;
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = 'rgba(0, 212, 255, 0.5)';
        particle.style.borderRadius = '50%';
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

window.addEventListener('load', createParticles);
