// Challenge Data
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
    'Cryptography': {
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
    'Binary': {
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
    'Forensics': {
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
    'OSINT': {
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

// State Management
let completedChallenges = new Set();
let totalScore = 0;
let currentChallenge = null;
let currentCategory = null;

// Initialize the platform
document.addEventListener('DOMContentLoaded', function() {
    renderCategories();
    loadFromLocalStorage();
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

// Live Clock
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

// Right-side time dial (8-hour contest countdown)
function updateCountdownDial() {
    const dial = document.getElementById('countdownDial');
    const valueEl = document.getElementById('countdownValue');
    const labelEl = document.getElementById('countdownLabel');
    if (!dial || !valueEl || !labelEl) return;

    const now = new Date();
    const start = new Date(now);
    start.setHours(10, 0, 0, 0);
    const contestDurationSeconds = 8 * 60 * 60;

    const elapsedSeconds = now < start ? 0 : Math.floor((now - start) / 1000);
    const remainingSeconds = Math.max(0, contestDurationSeconds - elapsedSeconds);

    const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(remainingSeconds % 60).padStart(2, '0');

    valueEl.textContent = `${hours}:${minutes}:${seconds}`;
    labelEl.textContent = 'Time Remaining';
}

// Render Category Cards - Compact Tile Layout
function renderCategories() {
    const container = document.getElementById('categoriesSections');
    container.innerHTML = '';

    Object.entries(challenges).forEach(([categoryName, categoryData]) => {
        // Create category section
        const section = document.createElement('div');
        section.className = 'category-section';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'category-section-header';
        sectionHeader.innerHTML = `<h3 class="category-section-title">${categoryName}</h3>`;
        section.appendChild(sectionHeader);
        
        // Create challenges grid
        const grid = document.createElement('div');
        grid.className = 'challenges-grid';
        
        categoryData.challenges.forEach(challenge => {
            const isSolved = completedChallenges.has(challenge.id);
            const labelText = isSolved ? 'SOLVED' : challenge.title;
            const labelClass = isSolved ? 'solved' : 'inactive';

            const card = document.createElement('div');
            card.className = `challenge-card ${isSolved ? 'completed' : ''}`;
            
            card.innerHTML = `
                <button class="challenge-label ${labelClass}" onclick="openChallenge('${challenge.id}', '${categoryName}')">${labelText}</button>
            `;
            
            grid.appendChild(card);
        });
        
        section.appendChild(grid);
        container.appendChild(section);
    });
}

// Update Stats
function updateStats() {
    const flagCount = completedChallenges.size;
    document.getElementById('flagCount').textContent = `${flagCount}/10`;
    document.getElementById('scoreCount').textContent = totalScore;
}

// Open challenge overlay window (modal)
function openChallenge(challengeId, categoryName) {
    const challenge = challenges[categoryName].challenges.find(c => c.id === challengeId);
    if (!challenge) return;

    currentChallenge = challenge;
    currentCategory = categoryName;

    document.getElementById('modalTitle').textContent = challenge.title;
    document.getElementById('difficultyBadge').textContent = challenge.difficulty.toUpperCase();
    document.getElementById('difficultyBadge').className = `difficulty-badge ${challenge.difficulty}`;
    document.getElementById('modalDescription').textContent = challenge.description;
    document.getElementById('pointsValue').textContent = `${challenge.points} pts`;

    const resources = getChallengeResources(challenge.id);
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = resources.map(resource => `<li>${resource}</li>`).join('');

    const feedback = document.getElementById('feedback');
    feedback.textContent = '';
    feedback.className = 'feedback';
    document.getElementById('flagInput').value = '';

    const modal = document.getElementById('challengeModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('challengeModal');
    modal.classList.remove('active');
    currentChallenge = null;
    currentCategory = null;
}

// Submit Flag
function submitFlag() {
    if (!currentChallenge || !currentCategory) return;

    const input = document.getElementById('flagInput');
    const feedback = document.getElementById('feedback');
    const userInput = input.value.trim();

    if (!userInput) {
        feedback.textContent = 'Please enter a flag';
        feedback.className = 'feedback error';
        return;
    }

    // Case-insensitive comparison and flexible matching
    const normalizedInput = userInput.toLowerCase();
    const normalizedFlag = currentChallenge.flag.toLowerCase();

    if (normalizedInput === normalizedFlag) {
        // Correct flag
        if (!completedChallenges.has(currentChallenge.id)) {
            completedChallenges.add(currentChallenge.id);
            totalScore += currentChallenge.points;
            
            saveToLocalStorage();
            updateStats();
            renderCategories();

            feedback.textContent = `Correct! You earned ${currentChallenge.points} points!`;
            feedback.className = 'feedback success';
        } else {
            feedback.textContent = 'You already captured this flag!';
            feedback.className = 'feedback success';
        }
    } else {
        // Incorrect flag
        feedback.textContent = 'Incorrect flag. Try again!';
        feedback.className = 'feedback error';
    }
}

// LocalStorage Management
function saveToLocalStorage() {
    const data = {
        completedChallenges: Array.from(completedChallenges),
        totalScore: totalScore
    };
    localStorage.setItem('ctfProgress', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('ctfProgress');
    if (data) {
        const parsed = JSON.parse(data);
        completedChallenges = new Set(parsed.completedChallenges);
        totalScore = parsed.totalScore;
        updateStats();
        renderCategories();
    }
}

function getChallengeResources(challengeId) {
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

// Particle animation for background
function createParticles() {
    const container = document.querySelector('.particle-background');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = 'rgba(0, 212, 255, 0.5)';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${Math.random() * 10 + 5}s infinite`;
        container.appendChild(particle);
    }
}

// Animation keyframes for particles
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

// Create particles on load
window.addEventListener('load', createParticles);
