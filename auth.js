// ============================================================
// TRENING AURA - Auth & User System (Firebase Realtime DB)
// ============================================================

// Firebase SDK loaded via CDN in HTML files (compat mode)
// This file assumes firebase app is already initialized

const AuraAuth = {
    db: null,

    // Initialize Firebase connection
    init() {
        if (this.db) return;
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.database();
        } catch(e) {
            console.error('Firebase init error:', e);
        }
    },

    // Get current logged-in user from localStorage (session)
    getCurrentUser() {
        const uid = localStorage.getItem('aura_current_uid');
        if (!uid) return null;
        const userData = localStorage.getItem('aura_user_' + uid);
        if (!userData) return null;
        const user = JSON.parse(userData);
        return { ...user, id: user.uid };
    },

    // Save current user session locally (cache)
    _saveSession(user) {
        localStorage.setItem('aura_current_uid', user.uid);
        localStorage.setItem('aura_user_' + user.uid, JSON.stringify(user));
    },

    // Register new user
    async register(name, email, password) {
        this.init();
        try {
            // Check if email exists
            const snapshot = await this.db.ref('users').orderByChild('email').equalTo(email).once('value');
            if (snapshot.exists()) {
                return { success: false, error: 'Email already registered' };
            }

            const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const user = {
                uid,
                id: uid,
                name,
                email,
                password,
                avatar: '',
                bio: '',
                joinDate: new Date().toLocaleDateString('ru-RU'),
                friends: {},
                friendRequests: {},
                sentRequests: {},
                createdAt: Date.now()
            };

            await this.db.ref('users/' + uid).set(user);
            this._saveSession(user);
            return { success: true, user };
        } catch(e) {
            console.error('Register error:', e);
            return { success: false, error: 'Connection error. Check internet.' };
        }
    },

    // Login
    async login(email, password) {
        this.init();
        try {
            const snapshot = await this.db.ref('users').orderByChild('email').equalTo(email).once('value');
            if (!snapshot.exists()) {
                return { success: false, error: 'Invalid email or password' };
            }
            let user = null;
            snapshot.forEach(child => { user = child.val(); });
            if (!user || user.password !== password) {
                return { success: false, error: 'Invalid email or password' };
            }
            user.id = user.uid;
            this._saveSession(user);
            return { success: true, user };
        } catch(e) {
            console.error('Login error:', e);
            return { success: false, error: 'Connection error. Check internet.' };
        }
    },

    // Logout
    logout() {
        const uid = localStorage.getItem('aura_current_uid');
        if (uid) localStorage.removeItem('aura_user_' + uid);
        localStorage.removeItem('aura_current_uid');
    },

    // Update user profile
    async updateProfile(updates) {
        this.init();
        const user = this.getCurrentUser();
        if (!user) return false;
        try {
            const safeUpdates = { ...updates };
            delete safeUpdates.uid;
            delete safeUpdates.id;
            await this.db.ref('users/' + user.uid).update(safeUpdates);
            // Update local cache
            const updated = { ...user, ...safeUpdates };
            this._saveSession(updated);
            return true;
        } catch(e) {
            console.error('Update profile error:', e);
            return false;
        }
    },

    // Get user by uid (from Firebase)
    async getUserById(uid) {
        this.init();
        try {
            const snap = await this.db.ref('users/' + uid).once('value');
            if (!snap.exists()) return null;
            const u = snap.val();
            return { ...u, id: u.uid };
        } catch(e) { return null; }
    },

    // Search users by name or email (excludes self)
    async searchUsers(query) {
        this.init();
        const current = this.getCurrentUser();
        query = query.toLowerCase().trim();
        if (!query) return [];
        try {
            const snap = await this.db.ref('users').once('value');
            if (!snap.exists()) return [];
            const results = [];
            snap.forEach(child => {
                const u = child.val();
                if (current && u.uid === current.uid) return;
                if (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)) {
                    results.push({ ...u, id: u.uid });
                }
            });
            return results;
        } catch(e) {
            console.error('Search error:', e);
            return [];
        }
    },

    // Send friend request
    async sendFriendRequest(toUid) {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return { success: false, error: 'Not logged in' };
        try {
            // Check already friends
            const friendSnap = await this.db.ref(`users/${current.uid}/friends/${toUid}`).once('value');
            if (friendSnap.exists()) return { success: false, error: 'Already friends' };

            // Check already sent
            const sentSnap = await this.db.ref(`users/${current.uid}/sentRequests/${toUid}`).once('value');
            if (sentSnap.exists()) return { success: false, error: 'Request already sent' };

            // Add to target's incoming requests
            await this.db.ref(`users/${toUid}/friendRequests/${current.uid}`).set({
                from: current.uid,
                name: current.name,
                email: current.email,
                time: Date.now()
            });

            // Track sent on sender's side
            await this.db.ref(`users/${current.uid}/sentRequests/${toUid}`).set(true);

            return { success: true };
        } catch(e) {
            console.error('Send request error:', e);
            return { success: false, error: 'Connection error' };
        }
    },

    // Get sent friend requests (array of uids)
    async getSentRequests() {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return [];
        try {
            const snap = await this.db.ref(`users/${current.uid}/sentRequests`).once('value');
            if (!snap.exists()) return [];
            return Object.keys(snap.val());
        } catch(e) { return []; }
    },

    // Accept friend request
    async acceptFriendRequest(fromUid) {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return false;
        try {
            // Add to each other's friends
            await this.db.ref(`users/${current.uid}/friends/${fromUid}`).set(true);
            await this.db.ref(`users/${fromUid}/friends/${current.uid}`).set(true);

            // Remove incoming request
            await this.db.ref(`users/${current.uid}/friendRequests/${fromUid}`).remove();

            // Remove from sender's sentRequests
            await this.db.ref(`users/${fromUid}/sentRequests/${current.uid}`).remove();

            return true;
        } catch(e) {
            console.error('Accept request error:', e);
            return false;
        }
    },

    // Decline friend request
    async declineFriendRequest(fromUid) {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return false;
        try {
            await this.db.ref(`users/${current.uid}/friendRequests/${fromUid}`).remove();
            await this.db.ref(`users/${fromUid}/sentRequests/${current.uid}`).remove();
            return true;
        } catch(e) { return false; }
    },

    // Remove a friend
    async removeFriend(friendUid) {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return false;
        try {
            await this.db.ref(`users/${current.uid}/friends/${friendUid}`).remove();
            await this.db.ref(`users/${friendUid}/friends/${current.uid}`).remove();
            return true;
        } catch(e) { return false; }
    },

    // Get friends list (full user objects)
    async getFriends() {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return [];
        try {
            const snap = await this.db.ref(`users/${current.uid}/friends`).once('value');
            if (!snap.exists()) return [];
            const friendUids = Object.keys(snap.val());
            const friends = [];
            for (const uid of friendUids) {
                const uSnap = await this.db.ref('users/' + uid).once('value');
                if (uSnap.exists()) {
                    const u = uSnap.val();
                    friends.push({ ...u, id: u.uid });
                }
            }
            return friends;
        } catch(e) {
            console.error('Get friends error:', e);
            return [];
        }
    },

    // Get incoming friend requests
    async getFriendRequests() {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return [];
        try {
            const snap = await this.db.ref(`users/${current.uid}/friendRequests`).once('value');
            if (!snap.exists()) return [];
            const reqs = [];
            snap.forEach(child => {
                const r = child.val();
                reqs.push({
                    id: r.from,
                    uid: r.from,
                    name: r.name,
                    email: r.email,
                    time: r.time
                });
            });
            return reqs;
        } catch(e) { return []; }
    },

    // Refresh current user data from Firebase
    async refreshCurrentUser() {
        this.init();
        const current = this.getCurrentUser();
        if (!current) return null;
        try {
            const snap = await this.db.ref('users/' + current.uid).once('value');
            if (!snap.exists()) return null;
            const user = snap.val();
            user.id = user.uid;
            this._saveSession(user);
            return user;
        } catch(e) { return current; }
    }
};

// ============================================================
// CHAT SYSTEM (Firebase Realtime Database)
// ============================================================

const AuraChat = {
    getChatId(uid1, uid2) {
        return [uid1, uid2].sort().join('_');
    },

    // Listen to messages in real-time
listenMessages(chatId, callback) {
    AuraAuth.init();
    return AuraAuth.db.ref('chats/' + chatId + '/messages')
        .orderByChild('time')
        .on('value', snapshot => {

            const msgs = [];

            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    msgs.push({
                        key: child.key,
                        ...child.val()
                    });
                });
            }

            // 🔥 ВАЖНО — сортировка
            msgs.sort((a, b) => a.time - b.time);

            callback(msgs);
        });
},

    // Stop listening
    stopListening(chatId) {
        AuraAuth.init();
        AuraAuth.db.ref('chats/' + chatId + '/messages').off();
    },

    // Send a message
    async sendMessage(toUid, text) {
        AuraAuth.init();
        const current = AuraAuth.getCurrentUser();
        if (!current || !text.trim()) return false;
        const chatId = this.getChatId(current.uid, toUid);
        try {
            await AuraAuth.db.ref('chats/' + chatId + '/messages').push({
                senderId: current.uid,
                senderName: current.name,
                text: text.trim(),
                time: Date.now(),
                read: false
            });
            return true;
        } catch(e) {
            console.error('Send message error:', e);
            return false;
        }
    },

    formatTime(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
};

// ============================================================
// NAV HELPER
// ============================================================

async function updateNavAuth() {
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
        if (badge) {
            try {
                const reqs = await AuraAuth.getFriendRequests();
                if (reqs.length > 0) {
                    badge.classList.remove('hidden');
                    badge.classList.add('flex');
                    badge.textContent = reqs.length;
                } else {
                    badge.classList.add('hidden');
                }
            } catch(e) {}
        }
    } else {
        if (loginBtn) loginBtn.style.display = '';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    AuraAuth.init();
    updateNavAuth();
});
