// ============================================================
// AURA USER MODULE — Shared across all arena pages
// Reads user from localStorage (set by auth.js / AuraAuth)
// ============================================================

const AuraUser = (() => {
    let _user = null;

    function load() {
        // Try AuraAuth first, then fallback to localStorage
        if (typeof AuraAuth !== 'undefined') {
            try { AuraAuth.init(); } catch(e) {}
            _user = AuraAuth.getCurrentUser();
        }
        if (!_user) {
            try {
                const raw = localStorage.getItem('aura_user');
                if (raw) _user = JSON.parse(raw);
            } catch(e) {}
        }
        return _user;
    }

    function get() { return _user; }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }

    function getDisplayName(name) {
        if (!name) return 'OPERATOR';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
        return parts[0];
    }

    // Inject user info into navbar avatar + name
    function injectNavbar() {
        const u = _user;
        const initials = getInitials(u ? (u.name || u.displayName) : null);
        const name = u ? (u.name || u.displayName || 'OPERATOR') : 'GUEST';

        // Avatar containers
        document.querySelectorAll('[data-nav-avatar]').forEach(el => {
            el.textContent = initials;
        });
        document.querySelectorAll('[data-nav-name]').forEach(el => {
            el.textContent = name;
        });
        // Profile link
        document.querySelectorAll('[data-nav-avatar-img]').forEach(el => {
            // Replace img with initials div
            const parent = el.parentElement;
            parent.innerHTML = `<span style="font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:14px;color:#abd600;">${initials}</span>`;
        });

        // If logged in → show user section, hide guest
        if (u) {
            document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('[data-user-only]').forEach(el => el.classList.remove('hidden'));
        } else {
            document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('[data-user-only]').forEach(el => el.classList.add('hidden'));
        }
    }

    // Inject profile card stats
    function injectProfile() {
        const u = _user;
        if (!u) return;

        const name = u.name || u.displayName || 'OPERATOR';
        const goal = u.goal || 'Max Performance';
        const level = u.level || 1;
        const xp = u.xp || 0;
        const xpNeeded = level * 1000;
        const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));
        const rank = u.rank || '—';

        document.querySelectorAll('[data-profile-name]').forEach(el => el.textContent = name);
        document.querySelectorAll('[data-profile-goal]').forEach(el => el.textContent = goal);
        document.querySelectorAll('[data-profile-level]').forEach(el => el.textContent = 'XP Level ' + level);
        document.querySelectorAll('[data-profile-xp]').forEach(el => el.textContent = xp.toLocaleString() + ' / ' + xpNeeded.toLocaleString());
        document.querySelectorAll('[data-profile-xp-bar]').forEach(el => { el.style.width = xpPct + '%'; });
        document.querySelectorAll('[data-profile-rank]').forEach(el => el.textContent = 'Rank #' + rank);
        document.querySelectorAll('[data-profile-initials]').forEach(el => {
            el.textContent = getInitials(name);
        });
    }

    function init() {
        load();
        injectNavbar();
        injectProfile();
    }

    return { init, get, load, getInitials, getDisplayName };
})();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => AuraUser.init());