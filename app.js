// ========================================
// CONFIG & CONSTANTS
// ========================================

const CONFIG = {
    VALID_KEYS: [
        { code: "DEMO-1234-ABCD-5678", duration: "1day", type: "Trial" },
        { code: "TEST-KEY1-2025-GAME", duration: "1week", type: "Standard" },
        { code: "FREE-BETA-KEY9-2025", duration: "1month", type: "Premium" },
        { code: "PREMIUM-2025-ALPHA", duration: "lifetime", type: "Premium" },
        { code: "SPECIAL-ACCESS-2025", duration: "lifetime", type: "Premium" },
        { code: "ADMIN-2025-MASTER-KEY", duration: "lifetime", type: "Admin" }
    ],
    STORAGE_PREFIX: 'user_',
    CURRENT_USER_KEY: 'currentUser',
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 20,
    MIN_PASSWORD_LENGTH: 6,
    DURATIONS: {
        '1day': { ms: 24 * 60 * 60 * 1000, label: '1 Day' },
        '1week': { ms: 7 * 24 * 60 * 60 * 1000, label: '1 Week' },
        '1month': { ms: 30 * 24 * 60 * 60 * 1000, label: '1 Month' },
        'lifetime': { ms: null, label: 'Lifetime' }
    }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const Utils = {
    formatDate(date) {
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatDateTime(date) {
        return new Date(date).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    isExpired(expiryDate) {
        if (!expiryDate) return false;
        return new Date() > new Date(expiryDate);
    },

    getDaysRemaining(expiryDate) {
        if (!expiryDate) return 'Unlimited';
        const diff = new Date(expiryDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? `${days} days` : 'Expired';
    },

    calculateExpiryDate(duration) {
        if (duration === 'lifetime') return null;
        const ms = CONFIG.DURATIONS[duration]?.ms;
        if (!ms) return null;
        return new Date(Date.now() + ms).toISOString();
    },

    generateKey(prefix = 'GEN', duration = 'lifetime') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = [];
        segments.push(prefix.toUpperCase().padEnd(4, '0').substring(0, 4));
        for (let i = 0; i < 3; i++) {
            let segment = '';
            for (let j = 0; j < 4; j++) {
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            segments.push(segment);
        }
        return segments.join('-');
    }
};

// ========================================
// STORAGE UTILITY
// ========================================

const Storage = {
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    getAllUsers() {
        const users = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE_PREFIX)) {
                const user = this.get(key);
                if (user) users.push(user);
            }
        }
        return users;
    }
};

// ========================================
// VALIDATION
// ========================================

const Validator = {
    username(username) {
        if (!username) return { valid: false, message: 'Username is required' };
        if (username.length < CONFIG.MIN_USERNAME_LENGTH) {
            return { valid: false, message: `Username must be at least ${CONFIG.MIN_USERNAME_LENGTH} characters` };
        }
        if (username.length > CONFIG.MAX_USERNAME_LENGTH) {
            return { valid: false, message: `Username must be less than ${CONFIG.MAX_USERNAME_LENGTH} characters` };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Username can only contain letters, numbers and underscores' };
        }
        return { valid: true };
    },

    password(password) {
        if (!password) return { valid: false, message: 'Password is required' };
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return { valid: false, message: `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters` };
        }
        return { valid: true };
    },

    key(key) {
        if (!key) return { valid: false, message: 'Key is required' };
        const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        if (!keyPattern.test(key)) {
            return { valid: false, message: 'Invalid key format (use: XXXX-XXXX-XXXX-XXXX)' };
        }
        const keyData = CONFIG.VALID_KEYS.find(k => k.code === key);
        if (!keyData) return { valid: false, message: 'Invalid or expired key' };
        return { valid: true, data: keyData };
    }
};

// ========================================
// USER MANAGEMENT
// ========================================

const UserManager = {
    exists(username) {
        return Storage.get(CONFIG.STORAGE_PREFIX + username) !== null;
    },

    get(username) {
        return Storage.get(CONFIG.STORAGE_PREFIX + username);
    },

    create(username, password, keyData) {
        const isAdmin = keyData.type === 'Admin';
        const expiryDate = Utils.calculateExpiryDate(keyData.duration);
        
        const userData = {
            username,
            password,
            isAdmin,
            keys: [{
                code: keyData.code,
                game: 'Reverse',
                type: keyData.type,
                duration: keyData.duration,
                active: !Utils.isExpired(expiryDate),
                activatedDate: new Date().toISOString(),
                expiryDate: expiryDate
            }],
            joinDate: new Date().toISOString(),
            balance: 0,
            totalOrders: 0,
            lastLogin: new Date().toISOString()
        };
        
        return Storage.set(CONFIG.STORAGE_PREFIX + username, userData);
    },

    update(username, userData) {
        return Storage.set(CONFIG.STORAGE_PREFIX + username, userData);
    },

    delete(username) {
        return Storage.remove(CONFIG.STORAGE_PREFIX + username);
    },

    updateKeyStatus(user) {
        let changed = false;
        user.keys.forEach(key => {
            const wasActive = key.active;
            key.active = !Utils.isExpired(key.expiryDate);
            if (wasActive !== key.active) changed = true;
        });
        if (changed) this.update(user.username, user);
        return user;
    }
};

// ========================================
// AUTHENTICATION
// ========================================

const Auth = {
    login(username, password) {
        const user = UserManager.get(username);
        if (!user) return { success: false, message: 'User not found' };
        if (user.password !== password) return { success: false, message: 'Incorrect password' };
        
        user.lastLogin = new Date().toISOString();
        UserManager.updateKeyStatus(user);
        UserManager.update(username, user);
        Storage.set(CONFIG.CURRENT_USER_KEY, username);
        
        return { 
            success: true, 
            redirectTo: user.isAdmin ? 'admin.html' : 'dashboard.html'
        };
    },

    register(username, password, key) {
        const usernameValidation = Validator.username(username);
        if (!usernameValidation.valid) return { success: false, message: usernameValidation.message };
        
        const passwordValidation = Validator.password(password);
        if (!passwordValidation.valid) return { success: false, message: passwordValidation.message };
        
        const keyValidation = Validator.key(key);
        if (!keyValidation.valid) return { success: false, message: keyValidation.message };
        
        if (UserManager.exists(username)) return { success: false, message: 'Username already taken' };
        
        const allUsers = Storage.getAllUsers();
        const keyUsed = allUsers.some(user => user.keys.some(k => k.code === key));
        if (keyUsed) return { success: false, message: 'Key already used' };
        
        const created = UserManager.create(username, password, keyValidation.data);
        return created 
            ? { success: true, message: 'Account created successfully!' }
            : { success: false, message: 'Failed to create account' };
    },

    logout() {
        Storage.remove(CONFIG.CURRENT_USER_KEY);
    },

    getCurrentUser() {
        const username = Storage.get(CONFIG.CURRENT_USER_KEY);
        if (!username) return null;
        const user = UserManager.get(username);
        return user ? UserManager.updateKeyStatus(user) : null;
    },

    changePassword(currentPassword, newPassword, confirmPassword) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, message: 'Not logged in' };
        if (user.password !== currentPassword) return { success: false, message: 'Current password is incorrect' };
        
        const validation = Validator.password(newPassword);
        if (!validation.valid) return { success: false, message: validation.message };
        if (newPassword !== confirmPassword) return { success: false, message: 'Passwords do not match' };
        
        user.password = newPassword;
        UserManager.update(user.username, user);
        return { success: true, message: 'Password changed successfully' };
    }
};

// ========================================
// KEY MANAGEMENT
// ========================================

const KeyManager = {
    redeem(key, user) {
        if (!user) return { success: false, message: 'Not logged in' };
        
        const validation = Validator.key(key);
        if (!validation.valid) return { success: false, message: validation.message };
        if (user.keys.some(k => k.code === key)) return { success: false, message: 'You already have this key' };
        
        const expiryDate = Utils.calculateExpiryDate(validation.data.duration);
        user.keys.push({
            code: key,
            game: 'Reverse',
            type: validation.data.type,
            duration: validation.data.duration,
            active: !Utils.isExpired(expiryDate),
            activatedDate: new Date().toISOString(),
            expiryDate: expiryDate
        });
        
        UserManager.update(user.username, user);
        return { success: true, message: 'Key activated successfully!' };
    },

    getActiveCount(user) {
        return user.keys.filter(k => k.active).length;
    }
};

// ========================================
// DASHBOARD
// ========================================

const Dashboard = {
    init(user) {
        this.updateStats(user);
        this.loadSubscriptions(user);
        this.loadKeys(user);
        this.updateSettings(user);
    },

    updateStats(user) {
        document.getElementById('balance').textContent = `€${user.balance.toFixed(2)}`;
        document.getElementById('active-keys').textContent = KeyManager.getActiveCount(user);
        document.getElementById('total-orders').textContent = user.totalOrders;
        document.getElementById('member-since').textContent = Utils.formatDate(user.joinDate);
    },

    loadSubscriptions(user) {
        const area = document.getElementById('subscriptions-area');
        if (user.keys.length === 0) {
            area.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">□</div>
                    <p>No active subscriptions</p>
                    <button class="btn-secondary" onclick="document.querySelector('[data-tab=keys]').click()">Redeem a Key</button>
                </div>`;
            return;
        }
        
        area.innerHTML = user.keys.map(key => `
            <div class="subscription-item">
                <div class="sub-info">
                    <h3>${key.game}</h3>
                    <p>Key: ${key.code}</p>
                    <p>Type: ${key.type} • Duration: ${CONFIG.DURATIONS[key.duration].label}</p>
                    <p>Activated: ${Utils.formatDate(key.activatedDate)}</p>
                    ${key.expiryDate ? `<p>Expires: ${Utils.formatDate(key.expiryDate)} (${Utils.getDaysRemaining(key.expiryDate)})</p>` : '<p>Never expires</p>'}
                </div>
                <div class="sub-status">
                    <span class="status-badge ${key.active ? 'active' : 'inactive'}">${key.active ? 'Active' : 'Expired'}</span>
                </div>
            </div>
        `).join('');
    },

    loadKeys(user) {
        const keysList = document.getElementById('keys-list');
        if (user.keys.length === 0) {
            keysList.innerHTML = '<p style="text-align:center;color:#666;margin-top:30px;">No keys activated yet</p>';
            return;
        }
        
        keysList.innerHTML = user.keys.map(key => `
            <div class="key-item">
                <div class="key-info">
                    <h4>${key.code}</h4>
                    <p>${key.game} • ${key.type} • ${CONFIG.DURATIONS[key.duration].label}</p>
                    <p>Activated: ${Utils.formatDate(key.activatedDate)}</p>
                    ${key.expiryDate ? `<p class="expiry-info">${Utils.getDaysRemaining(key.expiryDate)}</p>` : '<p class="expiry-info">Never expires</p>'}
                </div>
                <span class="badge ${key.active ? 'badge-success' : 'badge-inactive'}">${key.active ? 'Active' : 'Expired'}</span>
            </div>
        `).join('');
    },

    updateSettings(user) {
        document.getElementById('settings-username').textContent = user.username;
    },

    refresh(user) {
        const updatedUser = UserManager.get(user.username);
        this.updateStats(updatedUser);
        this.loadSubscriptions(updatedUser);
        this.loadKeys(updatedUser);
    }
};

// ========================================
// MODAL
// ========================================

const Modal = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }
};

// ========================================
// UI UTILITIES
// ========================================

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.error-toast, .success-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `${type === 'error' ? 'error' : 'success'}-toast`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// INITIALIZATION
// ========================================

if (window.location.pathname.includes('register') || window.location.pathname.includes('login')) {
    console.log('%c🔑 DEMO KEYS AVAILABLE:', 'color: #4ade80; font-weight: bold; font-size: 14px;');
    CONFIG.VALID_KEYS.forEach(key => {
        console.log(`%c  ${key.code} - ${key.type} (${CONFIG.DURATIONS[key.duration].label})`, 'color: #808080; font-size: 12px;');
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut { to { transform: translateX(400px); opacity: 0; } }
    .expiry-info { color: #fbbf24; font-weight: 600; margin-top: 4px; }
`;
document.head.appendChild(style);