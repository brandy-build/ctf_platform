const ADMIN_STORAGE_KEY = 'ctfAdminData';
const PLAYER_STATE_KEY = 'ctfPlayerState';
const PROFILE_STORAGE_KEY = 'ctfUserProfile';

const PRESET_AVATARS = [
    'profile-images/avatar-1.jpg',
    'profile-images/avatar-2.jpg',
    'profile-images/avatar-3.png',
    'profile-images/avatar-4.jpg',
    'profile-images/avatar-5.jpg',
    'profile-images/avatar-6.jpg',
    'profile-images/avatar-7.jpg',
    'profile-images/avatar-8.jpg',
    'profile-images/avatar-9.jpg',
    'profile-images/avatar-10.jpg',
    'profile-images/avatar-11.jpg',
    'profile-images/avatar-12.jpg'
];

let adminData = null;
let playerState = null;
let userProfile = null;

document.addEventListener('DOMContentLoaded', function() {
    adminData = loadAdminData();
    playerState = loadPlayerState();
    userProfile = loadUserProfile();

    ensureValidTeam();
    renderAll();
    bindEvents();
    initParticles();
});

window.addEventListener('storage', function(e) {
    if (e.key === ADMIN_STORAGE_KEY || e.key === PLAYER_STATE_KEY || e.key === PROFILE_STORAGE_KEY) {
        adminData = loadAdminData();
        playerState = loadPlayerState();
        userProfile = loadUserProfile();
        ensureValidTeam();
        renderAll();
    }
});

function renderAll() {
    renderForm();
    renderSocialLinks();
    renderAvatarGallery();
    renderTeamCard();
}

function loadAdminData() {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) {
        return { teams: [], users: [] };
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.teams)) {
        parsed.teams = [];
    }
    if (!Array.isArray(parsed.users)) {
        parsed.users = [];
    }
    return parsed;
}

function loadPlayerState() {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    const state = raw ? JSON.parse(raw) : { activeTeamId: null, hintsUnlockedByTeam: {} };
    if (!state.hintsUnlockedByTeam || typeof state.hintsUnlockedByTeam !== 'object') {
        state.hintsUnlockedByTeam = {};
    }
    return state;
}

function loadUserProfile() {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
        const initial = {
            username: 'Player',
            email: '',
            phoneNumber: '',
            alternateEmail: '',
            socialLinks: {
                linkedIn: '',
                medium: ''
            },
            password: '',
            avatar: PRESET_AVATARS[0],
            settings: {
                emailAlerts: true,
                publicProfile: false,
                twoFactorReminder: false,
                preferredTheme: 'default'
            }
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed.avatar || parsed.avatar.endsWith('.svg')) {
        parsed.avatar = PRESET_AVATARS[0];
    }
    if (typeof parsed.phoneNumber !== 'string') {
        parsed.phoneNumber = '';
    }
    if (typeof parsed.alternateEmail !== 'string') {
        parsed.alternateEmail = '';
    }
    if (!parsed.socialLinks || typeof parsed.socialLinks !== 'object') {
        parsed.socialLinks = {};
    }
    if (typeof parsed.socialLinks.linkedIn !== 'string') {
        parsed.socialLinks.linkedIn = '';
    }
    if (typeof parsed.socialLinks.medium !== 'string') {
        parsed.socialLinks.medium = '';
    }
    if (!parsed.settings || typeof parsed.settings !== 'object') {
        parsed.settings = {};
    }
    if (typeof parsed.settings.emailAlerts !== 'boolean') {
        parsed.settings.emailAlerts = true;
    }
    if (typeof parsed.settings.publicProfile !== 'boolean') {
        parsed.settings.publicProfile = false;
    }
    if (typeof parsed.settings.twoFactorReminder !== 'boolean') {
        parsed.settings.twoFactorReminder = false;
    }
    if (typeof parsed.settings.preferredTheme !== 'string') {
        parsed.settings.preferredTheme = 'default';
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
}

function saveAdminData() {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminData));
}

function savePlayerState() {
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(playerState));
}

function saveUserProfile() {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
}

function ensureValidTeam() {
    const valid = adminData.teams.some(function(team) {
        return team.id === playerState.activeTeamId && team.status !== 'blocked';
    });

    if (!valid) {
        const firstActive = adminData.teams.find(function(team) {
            return team.status !== 'blocked';
        });
        playerState.activeTeamId = firstActive ? firstActive.id : null;
        savePlayerState();
    }
}

function renderForm() {
    document.getElementById('profileUsername').value = userProfile.username || '';
    document.getElementById('profileEmail').value = userProfile.email || '';
    document.getElementById('profilePhone').value = userProfile.phoneNumber || '';
    document.getElementById('profileAlternateEmail').value = userProfile.alternateEmail || '';
    document.getElementById('profilePassword').value = '';

    const teamSelect = document.getElementById('profileTeam');
    const activeTeams = adminData.teams.filter(function(team) {
        return team.status !== 'blocked';
    });

    if (!activeTeams.length) {
        teamSelect.innerHTML = '<option value="">No active teams available</option>';
        teamSelect.disabled = true;
    } else {
        teamSelect.disabled = false;
        teamSelect.innerHTML = activeTeams.map(function(team) {
            return `<option value="${team.id}">${team.name}</option>`;
        }).join('');

        teamSelect.value = playerState.activeTeamId || activeTeams[0].id;
    }

    document.getElementById('profilePreview').src = userProfile.avatar || PRESET_AVATARS[0];
}

function renderSocialLinks() {
    const links = userProfile.socialLinks || {};
    document.getElementById('socialLinkedIn').value = links.linkedIn || '';
    document.getElementById('socialMedium').value = links.medium || '';
}

function renderSettings() {
    const settings = userProfile.settings || {};
    document.getElementById('settingEmailAlerts').checked = !!settings.emailAlerts;
    document.getElementById('settingPublicProfile').checked = !!settings.publicProfile;
    document.getElementById('settingTwoFactor').checked = !!settings.twoFactorReminder;
    document.getElementById('settingTheme').value = settings.preferredTheme || 'default';
}

function getActiveTeam() {
    return adminData.teams.find(function(team) {
        return team.id === playerState.activeTeamId;
    }) || null;
}

function getTeamIcon(team) {
    if (team && team.icon) {
        return team.icon;
    }

    const teamName = team && team.name ? team.name : 'Team';
    const initials = teamName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(function(word) {
            return word[0].toUpperCase();
        })
        .join('');

    const safeInitials = initials || 'TM';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#0a6cff'/><stop offset='100%' stop-color='#00d4ff'/></linearGradient></defs><rect width='200' height='200' rx='28' fill='url(#g)'/><circle cx='100' cy='100' r='66' fill='rgba(0,0,0,0.36)'/><text x='100' y='118' text-anchor='middle' font-family='Arial, sans-serif' font-size='56' fill='#e8f8ff' font-weight='700'>${safeInitials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderTeamCard() {
    const team = getActiveTeam();
    const nameEl = document.getElementById('teamCardName');
    const metaEl = document.getElementById('teamCardMeta');
    const iconEl = document.getElementById('teamIconPreview');
    const rankEl = document.getElementById('teamCardRank');
    const scoreEl = document.getElementById('teamCardScore');
    const countryEl = document.getElementById('teamCardCountry');
    const scoreStatEl = document.getElementById('teamCardScoreStat');
    const rankStatEl = document.getElementById('teamCardRankStat');
    const membersStatEl = document.getElementById('teamCardMembersStat');
    const solvedStatEl = document.getElementById('teamCardSolvedStat');
    const membersCaptionEl = document.getElementById('teamCardMembersCaption');
    const progressLabelEl = document.getElementById('teamCardProgressLabel');
    const progressFillEl = document.getElementById('teamCardProgressFill');
    const avatarsRow = document.getElementById('teamMemberAvatars');
    const teamJoinBtn = document.getElementById('teamJoinBtn');
    const teamLeaveBtn = document.getElementById('teamLeaveBtn');
    const teamManageBtn = document.getElementById('teamManageBtn');

    if (!team) {
        nameEl.textContent = 'No Active Team';
        metaEl.textContent = 'Select a team in credentials to join the dashboard.';
        iconEl.src = getTeamIcon(null);
        rankEl.textContent = '-';
        scoreEl.textContent = '0';
        countryEl.textContent = '-';
        scoreStatEl.textContent = '0';
        rankStatEl.textContent = '-';
        membersStatEl.textContent = '0';
        solvedStatEl.textContent = '0';
        membersCaptionEl.textContent = 'Max 5 shown';
        progressLabelEl.textContent = 'Challenges Solved (0/0)';
        progressFillEl.style.width = '0%';
        progressFillEl.textContent = '0%';
        avatarsRow.innerHTML = '<span class="team-avatar-empty">No active team selected</span>';
        teamJoinBtn.disabled = false;
        teamLeaveBtn.disabled = true;
        teamManageBtn.disabled = true;
        return;
    }

    iconEl.src = getTeamIcon(team);
    nameEl.textContent = team.name || 'Unnamed Team';

    const declaredMembers = Number(team.members) || 0;
    const memberUsers = adminData.users.filter(function(user) {
        return user.teamId === team.id;
    });
    const memberCount = memberUsers.length;
    const teamNet = Math.max(0, (Number(team.points) || 0) - (Number(team.penalty) || 0));
    const solvedCount = Array.isArray(team.solvedChallenges) ? team.solvedChallenges.length : (Number(team.solved) || 0);
    const totalChallenges = Object.values(challenges).reduce(function(acc, category) {
        return acc + category.challenges.length;
    }, 0);
    const rank = getTeamRank(team.id);
    const maxVisibleMembers = 5;
    const visibleMembers = memberUsers.slice(0, maxVisibleMembers);
    const extraMembers = Math.max(0, memberUsers.length - maxVisibleMembers);
    const progressPercent = totalChallenges > 0 ? Math.round((solvedCount / totalChallenges) * 100) : 0;

    metaEl.textContent = `${team.institution || 'Institution N/A'} | ${team.country || 'Country N/A'} | Members: ${memberCount || declaredMembers}`;
    rankEl.textContent = rank ? `#${rank}` : '-';
    scoreEl.textContent = String(teamNet);
    countryEl.textContent = team.country || '-';
    scoreStatEl.textContent = String(teamNet);
    rankStatEl.textContent = rank ? `#${rank}` : '-';
    membersStatEl.textContent = String(memberCount || declaredMembers || 0);
    solvedStatEl.textContent = String(solvedCount);
    membersCaptionEl.textContent = extraMembers > 0 ? `${extraMembers} more` : 'Max 5 shown';
    progressLabelEl.textContent = `Challenges Solved (${solvedCount}/${totalChallenges})`;
    progressFillEl.style.width = `${progressPercent}%`;
    progressFillEl.textContent = `${progressPercent}%`;

    if (!memberUsers.length) {
        avatarsRow.innerHTML = '<span class="team-avatar-empty">No mapped members yet</span>';
    } else {
        avatarsRow.innerHTML = visibleMembers.map(function(user) {
            const label = `${user.name || 'Unknown'} • ${user.role || 'member'}`;
            const initials = (user.name || 'U')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(function(word) {
                    return word[0].toUpperCase();
                })
                .join('');

            const avatarSrc = user.avatar || userProfile.avatar || PRESET_AVATARS[0];
            return `
                <div class="team-member-avatar" title="${label}">
                    <img src="${avatarSrc}" alt="${label}">
                    <span class="team-member-role">${user.role || 'member'}</span>
                </div>
            `;
        }).join('') + (extraMembers > 0 ? `<div class="team-member-more">+${extraMembers} more</div>` : '');
    }

    teamJoinBtn.disabled = true;
    teamLeaveBtn.disabled = false;
    teamManageBtn.disabled = false;
}

function getTeamRank(teamId) {
    const rankedTeams = adminData.teams
        .map(function(item) {
            return {
                id: item.id,
                score: Math.max(0, (Number(item.points) || 0) - (Number(item.penalty) || 0)),
                solved: Array.isArray(item.solvedChallenges) ? item.solvedChallenges.length : (Number(item.solved) || 0)
            };
        })
        .sort(function(a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            if (b.solved !== a.solved) {
                return b.solved - a.solved;
            }
            return a.id.localeCompare(b.id);
        });

    return rankedTeams.findIndex(function(team) {
        return team.id === teamId;
    }) + 1;
}

function renderAvatarGallery() {
    const gallery = document.getElementById('avatarGallery');
    gallery.innerHTML = PRESET_AVATARS.map(function(avatar) {
        const selected = userProfile.avatar === avatar ? 'selected' : '';
        return `
            <button class="avatar-choice ${selected}" data-avatar="${avatar}" type="button" aria-label="Select avatar">
                <img src="${avatar}" alt="Avatar option">
            </button>
        `;
    }).join('');

    gallery.querySelectorAll('.avatar-choice').forEach(function(button) {
        button.addEventListener('click', function() {
            const avatar = button.getAttribute('data-avatar');
            userProfile.avatar = avatar;
            saveUserProfile();
            document.getElementById('profilePreview').src = avatar;
            renderAvatarGallery();
            setStatus('avatarStatus', 'Avatar selected from profile images.', true);
        });
    });
}

function bindEvents() {
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();

        userProfile.username = document.getElementById('profileUsername').value.trim();
        userProfile.email = document.getElementById('profileEmail').value.trim();
        userProfile.phoneNumber = document.getElementById('profilePhone').value.trim();
        userProfile.alternateEmail = document.getElementById('profileAlternateEmail').value.trim();
        userProfile.socialLinks = {
            linkedIn: document.getElementById('socialLinkedIn').value.trim(),
            medium: document.getElementById('socialMedium').value.trim()
        };

        const newPassword = document.getElementById('profilePassword').value;
        if (newPassword) {
            userProfile.password = newPassword;
        }

        const teamSelect = document.getElementById('profileTeam');
        if (!teamSelect.disabled) {
            playerState.activeTeamId = teamSelect.value;
            savePlayerState();
        }

        saveUserProfile();
        renderTeamCard();
        setStatus('profileStatus', 'Profile credentials, social links, and active team updated.', true);
    });

    document.getElementById('teamJoinBtn').addEventListener('click', function() {
        document.getElementById('profileTeam').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('teamLeaveBtn').addEventListener('click', function() {
        playerState.activeTeamId = null;
        savePlayerState();
        renderAll();
        setStatus('profileStatus', 'You left the active team selection.', true);
    });

    document.getElementById('teamManageBtn').addEventListener('click', function() {
        document.querySelector('.profile-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('avatarUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setStatus('avatarStatus', 'Please upload a valid image file.', false);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const dataUrl = event.target.result;
            userProfile.avatar = dataUrl;
            saveUserProfile();
            document.getElementById('profilePreview').src = dataUrl;
            renderAvatarGallery();
            setStatus('avatarStatus', 'Custom profile image uploaded successfully.', true);
        };
        reader.readAsDataURL(file);
    });
}

function setStatus(elementId, text, success) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = success ? 'feedback success' : 'feedback error';
}

function initParticles() {
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
