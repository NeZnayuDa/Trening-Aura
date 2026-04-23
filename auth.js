// ============================================================
// TRENING AURA - Auth & User System (localStorage based)
// ============================================================

const AuraAuth = {
    // Get all registered users
    getUsers() {
        return JSON.parse(localStorage.getItem('aura_users') || '{}');
    },

    // Save all users
    saveUsers(users) {
        localStorage.setItem('aura_users', JSON.stringify(users));
    },

    // Get current logged-in user (returns user with .id alias for .uid)
    getCurrentUser() {
        const uid = localStorage.getItem('aura_current_uid');
        if (!uid) return null;
        const users = this.getUsers();
        const user = users[uid];
        if (!user) return null;
        // Ensure .id is always available as alias for .uid
        return { ...user, id: user.uid };
    },

    // Register new user
    register(name, email, password) {
        const users = this.getUsers();
        // Check if email already exists
        const existing = Object.values(users).find(u => u.email === email);
        if (existing) return { success: false, error: 'Email already registered' };

        const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const user = {
            uid,
            id: uid, // alias
            name,
            email,
            password, // In production use hashing; here it's demo
            avatar: '',
            bio: '',
            joinDate: new Date().toLocaleDateString('ru-RU'),
            friends: [],
            friendRequests: [],  // incoming: [{ from: uid, name, email, time }]
            sentRequests: [],    // outgoing: [uid, ...]
            createdAt: Date.now()
        };
        users[uid] = user;
        this.saveUsers(users);
        localStorage.setItem('aura_current_uid', uid);
        return { success: true, user };
    },

    // Login
    login(email, password) {
        const users = this.getUsers();
        const user = Object.values(users).find(u => u.email === email && u.password === password);
        if (!user) return { success: false, error: 'Invalid email or password' };
        localStorage.setItem('aura_current_uid', user.uid);
        return { success: true, user };
    },

    // Logout
    logout() {
        localStorage.removeItem('aura_current_uid');
    },

    // Update user profile
    updateProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return false;
        const users = this.getUsers();
        // Don't overwrite uid/id
        const safeUpdates = { ...updates };
        delete safeUpdates.uid;
        delete safeUpdates.id;
        users[user.uid] = { ...users[user.uid], ...safeUpdates };
        this.saveUsers(users);
        return true;
    },

    // Get user by uid
    getUserById(uid) {
        const users = this.getUsers();
        const u = users[uid];
        if (!u) return null;
        return { ...u, id: u.uid };
    },

    // Search users by name or email (excludes self)
    searchUsers(query) {
        const users = this.getUsers();
        const current = this.getCurrentUser();
        query = query.toLowerCase().trim();
        if (!query) return [];
        return Object.values(users)
            .filter(u => {
                if (current && u.uid === current.uid) return false;
                return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
            })
            .map(u => ({ ...u, id: u.uid }));
    },

    // Send friend request to another user
    sendFriendRequest(toUid) {
        const current = this.getCurrentUser();
        if (!current) return { success: false, error: 'Not logged in' };
        const users = this.getUsers();
        const target = users[toUid];
        if (!target) return { success: false, error: 'User not found' };

        // Already friends?
        if ((users[current.uid].friends || []).includes(toUid)) {
            return { success: false, error: 'Already friends' };
        }

        // Already sent?
        if ((users[current.uid].sentRequests || []).includes(toUid)) {
            return { success: false, error: 'Request already sent' };
        }

        // Add to target's incoming requests
        if (!target.friendRequests) target.friendRequests = [];
        if (!target.friendRequests.find(r => r.from === current.uid)) {
            target.friendRequests.push({
                from: current.uid,
                name: current.name,
                email: current.email,
                time: Date.now()
            });
        }
        users[toUid] = target;

        // Track sent requests on sender's side
        if (!users[current.uid].sentRequests) users[current.uid].sentRequests = [];
        if (!users[current.uid].sentRequests.includes(toUid)) {
            users[current.uid].sentRequests.push(toUid);
        }

        this.saveUsers(users);
        return { success: true };
    },

    // Get sent friend requests (array of uids)
    getSentRequests() {
        const current = this.getCurrentUser();
        if (!current) return [];
        const users = this.getUsers();
        return users[current.uid].sentRequests || [];
    },

    // Accept friend request
    acceptFriendRequest(fromUid) {
        const current = this.getCurrentUser();
        if (!current) return false;
        const users = this.getUsers();

        // Add to each other's friends list
        if (!users[current.uid].friends) users[current.uid].friends = [];
        if (!users[fromUid]) return false;
        if (!users[fromUid].friends) users[fromUid].friends = [];

        if (!users[current.uid].friends.includes(fromUid)) {
            users[current.uid].friends.push(fromUid);
        }
        if (!users[fromUid].friends.includes(current.uid)) {
            users[fromUid].friends.push(current.uid);
        }

        // Remove incoming request
        users[current.uid].friendRequests = (users[current.uid].friendRequests || [])
            .filter(r => r.from !== fromUid);

        // Remove from sender's sentRequests
        if (users[fromUid].sentRequests) {
            users[fromUid].sentRequests = users[fromUid].sentRequests.filter(uid => uid !== current.uid);
        }

        this.saveUsers(users);
        return true;
    },

    // Decline friend request
    declineFriendRequest(fromUid) {
        const current = this.getCurrentUser();
        if (!current) return false;
        const users = this.getUsers();

        // Remove incoming request
        users[current.uid].friendRequests = (users[current.uid].friendRequests || [])
            .filter(r => r.from !== fromUid);

        // Remove from sender's sentRequests
        if (users[fromUid] && users[fromUid].sentRequests) {
            users[fromUid].sentRequests = users[fromUid].sentRequests.filter(uid => uid !== current.uid);
        }

        this.saveUsers(users);
        return true;
    },

    // Remove a friend
    removeFriend(friendUid) {
        const current = this.getCurrentUser();
        if (!current) return false;
        const users = this.getUsers();

        // Remove from both sides
        if (users[current.uid].friends) {
            users[current.uid].friends = users[current.uid].friends.filter(uid => uid !== friendUid);
        }
        if (users[friendUid] && users[friendUid].friends) {
            users[friendUid].friends = users[friendUid].friends.filter(uid => uid !== current.uid);
        }

        this.saveUsers(users);
        return true;
    },

    // Get friends list (full user objects with .id)
    getFriends() {
        const current = this.getCurrentUser();
        if (!current) return [];
        const users = this.getUsers();
        return (users[current.uid].friends || [])
            .map(uid => users[uid])
            .filter(Boolean)
            .map(u => ({ ...u, id: u.uid }));
    },

    // Get incoming friend requests (full objects with from user info)
    getFriendRequests() {
        const current = this.getCurrentUser();
        if (!current) return [];
        const users = this.getUsers();
        const reqs = users[current.uid].friendRequests || [];
        // Return enriched objects with id field
        return reqs.map(r => {
            const fromUser = users[r.from];
            if (!fromUser) return null;
            return {
                id: fromUser.uid,
                uid: fromUser.uid,
                name: fromUser.name,
                email: fromUser.email,
                time: r.time
            };
        }).filter(Boolean);
    }
};

// ============================================================
// CHAT SYSTEM (localStorage based real-time simulation)
// ============================================================

const AuraChat = {
    // Get chat ID between two users (sorted for consistency)
    getChatId(uid1, uid2) {
        return [uid1, uid2].sort().join('_');
    },

    // Get all messages for a chat
    getMessages(chatId) {
        return JSON.parse(localStorage.getItem('aura_chat_' + chatId) || '[]');
    },

    // Send a message
    sendMessage(toUid, text) {
        const current = AuraAuth.getCurrentUser();
        if (!current || !text.trim()) return false;
        const chatId = this.getChatId(current.uid, toUid);
        const messages = this.getMessages(chatId);
        const msg = {
            id: Date.now(),
            from: current.uid,
            fromName: current.name,
            text: text.trim(),
            time: Date.now(),
            read: false
        };
        messages.push(msg);
        localStorage.setItem('aura_chat_' + chatId, JSON.stringify(messages));
        return msg;
    },

    // Format time
    formatTime(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
};

// ============================================================
// NAV HELPER - updates nav based on auth state
// ============================================================

function updateNavAuth() {
    const user = AuraAuth.getCurrentUser();
    const loginBtn = document.getElementById('nav-login-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const userNameEl = document.getElementById('nav-user-name');
    const initialsEl = document.getElementById('nav-avatar-initials');
    const badge = document.getElementById('nav-friend-req-badge');

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'flex';
        if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
        if (initialsEl) initialsEl.textContent = user.name.charAt(0).toUpperCase();
        // Show badge if friend requests pending
        if (badge) {
            const reqs = AuraAuth.getFriendRequests();
            if (reqs.length > 0) {
                badge.classList.remove('hidden');
                badge.classList.add('flex');
                badge.textContent = reqs.length;
            } else {
                badge.classList.add('hidden');
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = '';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}

// Run on every page load
document.addEventListener('DOMContentLoaded', updateNavAuth);
