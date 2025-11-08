// ==============================================
// SOULIX TECH ADMIN DASHBOARD - JavaScript
// Modern Application Management System
// ==============================================

let applications = [];
let notifications = 0;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Dashboard...');
    
    // ============================================
    // NEW SYSTEM: Use DataManager
    // ============================================
    
    if (!window.DataManager) {
        console.error('❌ DataManager not loaded');
        showToast('error', 'System Error', 'Data Manager failed to load');
        applications = getSampleApplications(); // Fallback
        return;
    }
    
    // Initialize DataManager
    const result = await window.DataManager.init();
    
    if (!result.success) {
        console.error('❌ DataManager initialization failed:', result.error);
        showToast('error', 'Connection Failed', 'Cannot connect to database');
        applications = getSampleApplications(); // Fallback
        return;
    }
    
    console.log('✅ DataManager initialized successfully');
    
    // Load applications from DataManager
    applications = window.DataManager.getAll();
    console.log(`📊 Loaded ${applications.length} applications`);
    
    // Save login session
    await window.DataManager.saveLoginSession();
    
    // Initialize UI components FIRST
    initNavigation();
    initMobileMenu();
    initDateTime();
    initScrollProgress();
    initBackToTop();
    initKeyboardShortcuts();
    initAdminLog(); // Initialize log panel BEFORE loading logs
    
    // NOW load and display old logs from Supabase (after panel is ready)
    console.log('📋 Loading previous session logs...');
    const logs = await window.DataManager.getLogs(50);
    if (logs && logs.length > 0) {
        console.log(`✅ Found ${logs.length} previous logs`);
        // Logs come from DB newest first, reverse to show oldest first
        // Then each log is inserted at top, so newest ends up at top
        logs.reverse().forEach(log => {
            addAdminLog(log.log_type, log.title, log.message, false, log.created_at);
        });
    } else {
        console.log('ℹ️ No previous logs found');
    }
    
    // NOW add session started log (will appear at top)
    addAdminLog('info', '🎯 Session Started', 
        `Admin ${sessionStorage.getItem('adminUsername') || 'User'} logged in - Dashboard initialized successfully`
    );
    
    // Listen for data updates from DataManager
    window.addEventListener('dataUpdated', function() {
        applications = window.DataManager.getAll();
        updateAllStats();
        renderApplications();
        renderRecentApplications();
        updateCharts();
    });
    
    // Start Google Sheets sync
    if (window.SheetsSync) {
        window.SheetsSync.start();
    }
    
    // Log login session details (local)
    logLoginSession();
    
    updateAllStats();
    renderApplications();
    renderRecentApplications();
    initCharts();
    initFilters();
    setupToastClose();
    addRippleEffect();
    addTooltips();
    
    // Update time every minute
    setInterval(initDateTime, 60000);
    
    // Auto-refresh stats every 30 seconds (debounced)
    let statsUpdateTimer;
    setInterval(function() {
        clearTimeout(statsUpdateTimer);
        statsUpdateTimer = setTimeout(() => {
            updateAllStats();
            addTooltips();
        }, 100);
    }, 30000);
    
    // Sync data across tabs/devices via Supabase real-time
    // (Real-time subscription handled in supabase-config.js)
    window.addEventListener('dataUpdated', function(e) {
        console.log('📡 Data updated event:', e.detail);
        updateAllStats();
        renderApplications();
        renderRecentApplications();
        updateCharts();
    });
});

// Log Login Session Details
function logLoginSession() {
    const deviceInfo = sessionStorage.getItem('deviceInfo');
    const loginTime = sessionStorage.getItem('loginTime');
    const username = sessionStorage.getItem('adminUsername') || 'Admin';
    
    if (deviceInfo && loginTime) {
        try {
            const info = JSON.parse(deviceInfo);
            const loginDate = new Date(loginTime);
            const timeAgo = getTimeAgo(loginDate);
            
            // Create detailed login log message
            const logMessage = `
                👤 User: ${username}
                📱 Device: ${info.deviceType}
                🌐 Browser: ${info.browser}
                💻 Platform: ${info.platform}
                📏 Screen: ${info.screenResolution}
                ⏰ Time: ${timeAgo}
            `.trim().replace(/\s+/g, ' ');
            
            addAdminLog('success', '🔐 Login Session', logMessage);
            
            // Log previous session if exists
            const loginSessions = JSON.parse(localStorage.getItem('loginSessions') || '[]');
            if (loginSessions.length > 1) {
                const prevSession = loginSessions[loginSessions.length - 2];
                if (prevSession) {
                    const prevTime = getTimeAgo(new Date(prevSession.loginTime));
                    addAdminLog('info', '📜 Previous Login', 
                        `${prevSession.deviceType} • ${prevSession.browser} • ${prevTime}`);
                }
            }
        } catch (e) {
            console.error('Error logging session:', e);
        }
    }
}

// Get time ago helper
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Keyboard Shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-box input');
            searchInput?.focus();
        }
        
        // Ctrl/Cmd + 1-6 = Navigate sections
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
            e.preventDefault();
            const sections = ['overview', 'applications', 'approved', 'rejected', 'analytics', 'courses'];
            const index = parseInt(e.key) - 1;
            document.querySelector(`[data-section="${sections[index]}"]`)?.click();
        }
        
        // Ctrl/Cmd + R = Refresh data
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            updateAllStats();
            renderApplications();
            renderRecentApplications();
            updateCharts();
            showToast('info', 'Refreshed', 'Data updated successfully!');
        }
    });
}

// Back to Top Button
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });
    
    backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (navigator.vibrate) navigator.vibrate(20);
    });
}

// Scroll Progress Bar
function initScrollProgress() {
    const progressBar = document.getElementById('scrollProgress');
    if (!progressBar) return;
    
    window.addEventListener('scroll', function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// Add Ripple Effect to Buttons
function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn-action, .btn-login, .notification-btn');
    buttons.forEach(button => {
        if (!button.classList.contains('ripple')) {
            button.classList.add('ripple');
        }
    });
}

// Add Tooltips
function addTooltips() {
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn && !notificationBtn.getAttribute('data-tooltip')) {
        const pendingCount = document.getElementById('totalPending')?.textContent || '0';
        notificationBtn.setAttribute('data-tooltip', `${pendingCount} pending applications`);
        notificationBtn.classList.add('tooltip');
    }
}

// Confetti Animation
function createConfetti() {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear forwards`;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 4000);
    }
}

// Mobile Menu
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');
    
    function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
        toggle?.classList.remove('menu-open');
        document.body.style.overflow = '';
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
    }
    
    function openSidebar() {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('show');
        toggle?.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
    }
    
    if (toggle) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = sidebar.classList.contains('mobile-open');
            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeSidebar();
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    
    // Close menu when navigation item is clicked
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeSidebar();
        }
    });
    
    // Swipe to close sidebar
    let touchStartX = 0;
    let touchEndX = 0;
    
    if (sidebar) {
        sidebar.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        sidebar.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
    
    function handleSwipe() {
        // Swipe left to close (at least 100px)
        if (touchStartX - touchEndX > 100 && sidebar.classList.contains('mobile-open')) {
            closeSidebar();
        }
    }
}

// Load Data
// ============================================
// LOAD DATA FROM SUPABASE (NO LOCALSTORAGE)
// ============================================
async function loadDataFromSupabase() {
    if (typeof supabase === 'undefined' || !supabase) {
        console.error('❌ Supabase not available');
        applications = getSampleApplications();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .order('applied_date', { ascending: false });
        
        if (error) throw error;
        
        // Convert Supabase format to local format
        applications = (data || []).map(app => ({
            id: app.id,
            name: app.name,
            email: app.email,
            phone: app.phone,
            course: app.course,
            status: app.status,
            appliedDate: app.applied_date,
            approvedDate: app.approved_date,
            rejectedDate: app.rejected_date,
            paymentType: app.payment_type,
            paymentAmount: app.payment_amount,
            paymentStatus: app.payment_status,
            upiTransactionId: app.upi_transaction_id,
            installmentsPaid: app.installments_paid,
            totalInstallments: app.total_installments,
            rejectionReason: app.rejection_reason,
            approvedBy: app.approved_by ? JSON.parse(app.approved_by) : null,
            rejectedBy: app.rejected_by ? JSON.parse(app.rejected_by) : null
        }));
        
        console.log(`✅ Loaded ${applications.length} applications from Supabase`);
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
            detail: { timestamp: Date.now(), source: 'supabase' } 
        }));
        
    } catch (error) {
        console.error('❌ Error loading from Supabase:', error);
        applications = getSampleApplications();
    }
}

// Legacy loadData function - now just calls loadDataFromSupabase
function loadData() {
    console.warn('⚠️ loadData() is deprecated - using Supabase');
    // If Supabase available, load from there
    if (typeof loadDataFromSupabase === 'function') {
        loadDataFromSupabase();
    }
}

// ============================================
// SAVE DATA TO SUPABASE (NO LOCALSTORAGE)
// ============================================
function saveData() {
    console.log('💾 Saving data to Supabase...');
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { timestamp: Date.now(), source: 'save' } 
    }));
    
    // Note: Individual save functions (saveToSupabase, saveApprovedApplication, etc.)
    // are called directly when approving/rejecting, so we don't need to loop here
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section') + '-section';
            document.getElementById(sectionId)?.classList.add('active');
            
            const titles = {
                'overview': 'Dashboard Overview',
                'applications': 'Student Applications',
                'approved': 'Approved Students',
                'rejected': 'Rejected Applications',
                'analytics': 'Analytics & Insights',
                'courses': 'Course Management',
                'payments': 'Payment History'
            };
            
            const section = this.getAttribute('data-section');
            document.getElementById('page-title').textContent = titles[section] || 'Dashboard';
            
            // Render appropriate content
            if (section === 'applications') renderApplications();
            if (section === 'approved') renderApproved();
            if (section === 'rejected') renderRejected();
            if (section === 'payments') renderPaymentHistory();
        });
    });
    
    // View all link
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            document.querySelector(`[data-section="${section}"]`)?.click();
        });
    });
}

// Date Time
function initDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Update Stats
function updateAllStats() {
    // Data is already loaded from Supabase, just calculate stats
    const pending = applications.filter(app => app.status === 'Pending').length;
    const approved = applications.filter(app => app.status === 'Approved').length;
    const rejected = applications.filter(app => app.status === 'Rejected').length;
    const total = applications.length;
    
    // Animate number changes
    animateValue('totalPending', pending);
    animateValue('totalApproved', approved);
    animateValue('totalRejected', rejected);
    animateValue('totalApplications', total);
    
    // Update badges
    document.getElementById('pendingBadge').textContent = pending;
    document.getElementById('notificationCount').textContent = pending;
    
    // Update tab counts
    document.getElementById('allCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    
    const today = new Date().toDateString();
    const todayCount = applications.filter(app => new Date(app.appliedDate).toDateString() === today).length;
    document.getElementById('todayCount').textContent = todayCount;
    
    // Update course stats
    updateCourseStats();
    
    // Store last update timestamp to prevent stale data
    localStorage.setItem('lastStatsUpdate', Date.now().toString());
}

// Animate Number Change (Optimized)
function animateValue(id, endValue, duration = 500) {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    if (startValue === endValue) return;
    
    const startTime = performance.now();
    const delta = endValue - startValue;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(startValue + (delta * progress));
        
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function updateCourseStats() {
    const courses = ['Web Development', 'IoT & ESP32', 'C Programming', 'Python Programming'];
    
    courses.forEach(course => {
        // Match course names with or without price suffix
        // Use startsWith() to handle any separator
        const approved = applications.filter(app => {
            if (!app.course) return false;
            const courseName = app.course.trim();
            return (courseName === course || courseName.startsWith(course + ' ') || courseName.startsWith(course + '-')) 
                          && app.status === 'Approved';
        }).length;
        const pending = applications.filter(app => {
            if (!app.course) return false;
            const courseName = app.course.trim();
            return (courseName === course || courseName.startsWith(course + ' ') || courseName.startsWith(course + '-')) 
                   && app.status === 'Pending';
        }).length;
        
        // Update enrollment counts
        document.querySelectorAll(`.stat-value[data-course="${course}"][data-status="Approved"]`).forEach(el => {
            el.textContent = approved;
        });
        
        // Update pending counts
        document.querySelectorAll(`.pending-count[data-course="${course}"]`).forEach(el => {
            el.textContent = pending;
        });
        
        // Update progress bars
        const maxCapacity = 50; // Assumed max per course
        const percentage = Math.min((approved / maxCapacity) * 100, 100);
        document.querySelectorAll(`.progress-fill[data-course="${course}"]`).forEach(el => {
            el.style.width = percentage + '%';
            el.closest('.course-progress').querySelector('.progress-text').textContent = Math.round(percentage) + '% Capacity';
        });
    });
}

// Render Applications
function renderApplications(filter = 'all') {
    const grid = document.getElementById('applicationsGrid');
    let filtered = applications;
    
    if (filter === 'pending') {
        filtered = applications.filter(app => app.status === 'Pending');
    } else if (filter === 'today') {
        const today = new Date().toDateString();
        filtered = applications.filter(app => new Date(app.appliedDate).toDateString() === today);
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No applications found</h3><p>Applications will appear here</p></div>';
        return;
    }
    
    grid.innerHTML = filtered.map(app => `
        <div class="application-card">
            <div class="app-header">
                <div class="app-avatar">${app.name.charAt(0).toUpperCase()}</div>
                <span class="app-status ${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="app-body">
                <h3 class="app-name">${app.name}</h3>
                <div class="app-info">
                    <div class="info-item"><i class="fas fa-envelope"></i> ${app.email}</div>
                    <div class="info-item"><i class="fas fa-phone"></i> ${app.phone}</div>
                    <div class="info-item"><i class="fas fa-graduation-cap"></i> ${app.course}</div>
                    <div class="info-item"><i class="fas fa-calendar"></i> ${formatDate(app.appliedDate)}</div>
                </div>
            </div>
            <div class="app-footer">
                <button class="btn-action btn-view" onclick="viewApplication('${app.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                ${app.status === 'Pending' ? `
                    <button class="btn-action btn-approve" onclick="approveApplication('${app.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-action btn-reject" onclick="rejectApplication('${app.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderApproved() {
    const grid = document.getElementById('approvedGrid');
    const approved = applications.filter(app => app.status === 'Approved');
    
    if (approved.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>No approved students yet</h3></div>';
        return;
    }
    
    grid.innerHTML = approved.map(app => `
        <div class="application-card">
            <div class="app-header">
                <div class="app-avatar">${app.name.charAt(0).toUpperCase()}</div>
                <span class="app-status approved">Approved</span>
            </div>
            <div class="app-body">
                <h3 class="app-name">${app.name}</h3>
                <div class="app-info">
                    <div class="info-item"><i class="fas fa-envelope"></i> ${app.email}</div>
                    <div class="info-item"><i class="fas fa-phone"></i> ${app.phone}</div>
                    <div class="info-item"><i class="fas fa-graduation-cap"></i> ${app.course}</div>
                    <div class="info-item"><i class="fas fa-check-circle"></i> Approved ${formatDate(app.approvedDate || app.appliedDate)}</div>
                </div>
            </div>
            <div class="app-footer">
                <button class="btn-action btn-view" onclick="viewApplication('${app.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `).join('');
}

function renderRejected() {
    const grid = document.getElementById('rejectedGrid');
    const rejected = applications.filter(app => app.status === 'Rejected');
    
    if (rejected.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-times-circle"></i><h3>No rejected applications</h3></div>';
        return;
    }
    
    grid.innerHTML = rejected.map(app => `
        <div class="application-card">
            <div class="app-header">
                <div class="app-avatar">${app.name.charAt(0).toUpperCase()}</div>
                <span class="app-status rejected">Rejected</span>
            </div>
            <div class="app-body">
                <h3 class="app-name">${app.name}</h3>
                <div class="app-info">
                    <div class="info-item"><i class="fas fa-envelope"></i> ${app.email}</div>
                    <div class="info-item"><i class="fas fa-phone"></i> ${app.phone}</div>
                    <div class="info-item"><i class="fas fa-graduation-cap"></i> ${app.course}</div>
                    <div class="info-item"><i class="fas fa-times-circle"></i> Rejected ${formatDate(app.rejectedDate || app.appliedDate)}</div>
                </div>
            </div>
            <div class="app-footer">
                <button class="btn-action btn-view" onclick="viewApplication('${app.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecentApplications() {
    const list = document.getElementById('recentApplicationsList');
    const recent = applications.slice(-5).reverse();
    
    if (recent.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent applications</p></div>';
        return;
    }
    
    list.innerHTML = recent.map(app => `
        <div class="recent-app-item">
            <div class="app-avatar" style="width: 45px; height: 45px; font-size: 1.2rem;">${app.name.charAt(0).toUpperCase()}</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--dark);">${app.name}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">${app.course}</div>
            </div>
            <span class="app-status ${app.status.toLowerCase()}" style="padding: 0.25rem 0.75rem; font-size: 0.7rem;">${app.status}</span>
        </div>
    `).join('');
}

// Actions
function viewApplication(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('applicationDetailContent');
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div class="app-avatar" style="width: 80px; height: 80px; font-size: 2.5rem; margin: 0 auto 1rem;">${app.name.charAt(0).toUpperCase()}</div>
            <h2 style="margin-bottom: 0.5rem;">${app.name}</h2>
            <span class="app-status ${app.status.toLowerCase()}">${app.status}</span>
        </div>
        <div style="display: grid; gap: 1.5rem; max-height: 60vh; overflow-y: auto; padding-right: 10px;">
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Contact Information</div>
                <div style="display: grid; gap: 0.75rem;">
                    <div class="info-item"><i class="fas fa-envelope"></i> ${app.email || 'Not provided'}</div>
                    <div class="info-item"><i class="fas fa-phone"></i> ${app.phone || 'Not provided'}</div>
                </div>
            </div>
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Course Details</div>
                <div class="info-item"><i class="fas fa-graduation-cap"></i> ${app.course || 'Not specified'}</div>
            </div>
            ${app.paymentType || app.upiTransactionId ? `
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Payment Information</div>
                <div style="display: grid; gap: 0.75rem;">
                    ${app.paymentType ? `<div class="info-item"><i class="fas fa-credit-card"></i> Payment Type: <strong>${app.paymentType}</strong></div>` : ''}
                    ${app.upiTransactionId ? `<div class="info-item"><i class="fas fa-receipt"></i> UPI Transaction ID: <strong>${app.upiTransactionId}</strong></div>` : ''}
                    ${app.paymentStatus ? `<div class="info-item"><i class="fas fa-wallet"></i> Payment Status: <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; ${app.paymentStatus === 'Paid' ? 'background: #d1fae5; color: #065f46;' : app.paymentStatus === 'Installment' ? 'background: #fef3c7; color: #92400e;' : 'background: #fee2e2; color: #991b1b;'}">${app.paymentStatus}</span></div>` : ''}
                    ${app.paymentType && app.paymentType.toLowerCase().includes('installment') ? `<div class="info-item"><i class="fas fa-calendar-check"></i> Installments Paid: <strong>${app.installmentsPaid || 0} / ${app.totalInstallments || 2}</strong></div>` : ''}
                </div>
            </div>
            ` : ''}
            ${app.yearOfStudy ? `
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Academic Information</div>
                <div style="display: grid; gap: 0.75rem;">
                    <div class="info-item"><i class="fas fa-calendar-alt"></i> Year: ${app.yearOfStudy}</div>
                    ${app.branch ? `<div class="info-item"><i class="fas fa-code-branch"></i> Branch: ${app.branch}</div>` : ''}
                    ${app.preferredDomain ? `<div class="info-item"><i class="fas fa-star"></i> Preferred Domain: ${app.preferredDomain}</div>` : ''}
                </div>
            </div>
            ` : ''}
            ${app.technicalSkills ? `
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Technical Skills</div>
                <div class="info-item" style="white-space: pre-wrap;"><i class="fas fa-laptop-code"></i> ${app.technicalSkills}</div>
            </div>
            ` : ''}
            ${app.goals ? `
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Goals & Objectives</div>
                <div class="info-item" style="white-space: pre-wrap;"><i class="fas fa-bullseye"></i> ${app.goals}</div>
            </div>
            ` : ''}
            ${app.financialSupport ? `
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Financial Support</div>
                <div class="info-item" style="white-space: pre-wrap;"><i class="fas fa-hand-holding-usd"></i> ${app.financialSupport}</div>
            </div>
            ` : ''}
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Application Date</div>
                <div class="info-item"><i class="fas fa-calendar"></i> ${new Date(app.appliedDate).toLocaleString()}</div>
            </div>
            ${app.status === 'Pending' ? `
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-action btn-approve" style="flex: 1;" onclick="approveApplication('${app.id}'); document.getElementById('detailModal').classList.remove('show');">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-action btn-reject" style="flex: 1;" onclick="rejectApplication('${app.id}'); document.getElementById('detailModal').classList.remove('show');">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            ` : ''}
            <div style="margin-top: 1rem;">
                <button class="btn-action" style="width: 100%; background: #ef4444; border-color: #dc2626;" onclick="deleteApplication('${app.id}'); document.getElementById('detailModal').classList.remove('show');">
                    <i class="fas fa-trash"></i> Delete Application
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function approveApplication(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    // Payment confirmation dialog
    let paymentConfirmed = false;
    let paymentDetails = '';
    
    if (app.paymentType && app.paymentType.toLowerCase().includes('installment')) {
        // Installment payment
        const installmentAmount = prompt(
            `Approve ${app.name}'s application?\n\n` +
            `Payment Type: ${app.paymentType}\n` +
            `Current Installments Paid: ${app.installmentsPaid || 0} / ${app.totalInstallments || 2}\n\n` +
            `Enter installment amount received (or cancel):`
        );
        
        if (installmentAmount !== null && installmentAmount.trim() !== '') {
            app.installmentsPaid = (app.installmentsPaid || 0) + 1;
            app.paymentAmount = installmentAmount;
            app.paymentStatus = app.installmentsPaid >= app.totalInstallments ? 'Paid' : 'Installment';
            paymentConfirmed = true;
            paymentDetails = `Installment ${app.installmentsPaid}/${app.totalInstallments}: ₹${installmentAmount}`;
        } else {
            return; // Cancelled
        }
    } else {
        // Full payment
        const paymentAmount = prompt(
            `Approve ${app.name}'s application?\n\n` +
            `Payment Type: ${app.paymentType || 'Full Payment'}\n` +
            `${app.upiTransactionId ? 'UPI Transaction ID: ' + app.upiTransactionId : ''}\n\n` +
            `Confirm full payment amount received:`
        );
        
        if (paymentAmount !== null && paymentAmount.trim() !== '') {
            app.paymentAmount = paymentAmount;
            app.paymentStatus = 'Paid';
            paymentConfirmed = true;
            paymentDetails = `Full Payment: ₹${paymentAmount}`;
        } else {
            return; // Cancelled
        }
    }
    
    if (paymentConfirmed) {
        // Get device info for logging
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        
        // Prepare payment details for DataManager
        const payment = {
            amount: app.paymentAmount,
            type: app.paymentType || 'Full Payment',
            status: app.paymentStatus || 'Paid',
            transactionId: app.upiTransactionId || null,
            installmentsPaid: app.installmentsPaid || null,
            totalInstallments: app.totalInstallments || null
        };
        
        console.log('💾 Approving application via DataManager...', app.name);
        
        // Use DataManager to approve (handles all database operations)
        if (window.DataManager) {
            window.DataManager.approve(id, payment).then(result => {
                if (result.success) {
                    console.log('✅ Application approved successfully');
                    
                    // Update local application object
                    app.status = 'Approved';
                    app.approvedDate = new Date().toISOString();
                    app.approvedBy = {
                        username: sessionStorage.getItem('adminUsername') || 'Admin',
                        device: deviceInfo.deviceType || 'Unknown',
                        browser: deviceInfo.browser || 'Unknown',
                        timestamp: new Date().toISOString()
                    };
                    
                    // Trigger UI update event
                    window.dispatchEvent(new Event('dataUpdated'));
                } else {
                    console.error('❌ Approval failed:', result.error);
                    showToast('error', 'Approval Failed', result.error);
                    return;
                }
            }).catch(err => {
                console.error('❌ DataManager.approve error:', err);
                showToast('error', 'Database Error', 'Failed to save approval');
                return;
            });
        } else {
            console.error('❌ DataManager not available!');
        }
        
        // Log the approval action with details
        addAdminLog('success', '✅ Application Approved', 
            `${app.name} • ${app.course} • ${paymentDetails} • From ${deviceInfo.deviceType || 'Desktop'}`);
        
        // Send Email & SMS (simulated)
        sendApprovalNotification(app);
        
        // Haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
        
        // Confetti celebration!
        createConfetti();
        
        // Show success toast with payment info
        showToast('success', 'Application Approved!', 
            `${app.name} approved!\n${paymentDetails}\nEmail & SMS sent.`);
        
        // Force immediate UI update
        setTimeout(() => {
            updateAllStats();
            renderApplications();
            renderRecentApplications();
            updateCharts();
            addTooltips();
        }, 100);
    }
}

function rejectApplication(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    // Simple confirmation dialog
    const dialogMessage = `Reject application from ${app.name} for ${app.course}?`;
    
    if (confirm(dialogMessage)) {
        // Reject immediately without asking for reason
        rejectApplicationWithReason(id, 'Application rejected by admin');
    }
}

function rejectApplicationWithReason(id, reason) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    // Get device info for logging
    const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
    
    console.log('🚫 Rejecting application via DataManager...', app.name);
    
    // Use DataManager to reject (handles database operations)
    if (window.DataManager) {
        window.DataManager.reject(id, reason || 'Not specified').then(result => {
            if (result.success) {
                console.log('✅ Application rejected successfully');
                
                // Update local application object
                app.status = 'Rejected';
                app.rejectedDate = new Date().toISOString();
                app.rejectionReason = reason || 'Not specified';
                app.rejectedBy = {
                    username: sessionStorage.getItem('adminUsername') || 'Admin',
                    device: deviceInfo.deviceType || 'Unknown',
                    browser: deviceInfo.browser || 'Unknown',
                    timestamp: new Date().toISOString()
                };
                
                // Trigger UI update event
                window.dispatchEvent(new Event('dataUpdated'));
            } else {
                console.error('❌ Rejection failed:', result.error);
                showToast('error', 'Rejection Failed', result.error);
                return;
            }
        }).catch(err => {
            console.error('❌ DataManager.reject error:', err);
            showToast('error', 'Database Error', 'Failed to save rejection');
            return;
        });
    } else {
        console.error('❌ DataManager not available!');
    }
    
    // Send rejection notification
    sendRejectionNotification(app);
    
    // Log activity with device info
    addAdminLog('error', '❌ Application Rejected', 
        `${app.name} • ${app.course} • Reason: ${reason} • From ${deviceInfo.deviceType || 'Desktop'}`);
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    // Show toast
    showToast('error', 'Application Rejected', `${app.name}'s application has been rejected and notified.`);
    
    // Force immediate UI update
    setTimeout(() => {
        updateAllStats();
        renderApplications();
        renderRecentApplications();
        updateCharts();
    }, 100);
}

function deleteApplication(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    // Confirmation dialog
    if (!confirm(`⚠️ DELETE APPLICATION?\n\nStudent: ${app.name}\nEmail: ${app.email}\nCourse: ${app.course}\nStatus: ${app.status}\n\nThis action CANNOT be undone!\n\nClick OK to permanently delete.`)) {
        return;
    }
    
    console.log('🗑️ Deleting application via DataManager...', app.name);
    
    // Use DataManager to delete (handles database operations)
    if (window.DataManager) {
        window.DataManager.delete(id).then(result => {
            if (result.success) {
                console.log('✅ Application deleted successfully');
                
                // Log the deletion
                addAdminLog('warning', '🗑️ Application Deleted', 
                    `${app.name} • ${app.course} • Status: ${app.status} • Permanently removed from database`);
                
                // Show success message
                showToast('success', 'Application Deleted', `${app.name}'s application has been permanently deleted.`);
                
                // Trigger UI update event
                window.dispatchEvent(new Event('dataUpdated'));
            } else {
                console.error('❌ Deletion failed:', result.error);
                showToast('error', 'Deletion Failed', result.error);
            }
        }).catch(err => {
            console.error('❌ DataManager.delete error:', err);
            showToast('error', 'Database Error', 'Failed to delete application');
        });
    } else {
        console.error('❌ DataManager not available!');
    }
}

// Notifications (Simulated Email/SMS)
async function sendApprovalNotification(app) {
    addAdminLog('info', 'Sending Approval Email', `Sending to ${app.email}...`);
    
    // Send real email via Brevo API
    if (typeof window.sendApprovalEmail === 'function') {
        try {
            const result = await window.sendApprovalEmail(
                app.email,
                app.name,
                app.upiTransactionId || app.id,
                app.course || '',
                'approve'
            );
            
            if (result.success) {
                console.log('✅ Approval email sent to:', app.email);
                addAdminLog('success', 'Email Sent Successfully', `✅ Approval email sent to ${app.name} (${app.email})`);
            } else {
                console.warn('⚠️ Email sending failed:', result.error);
                addAdminLog('error', 'Email Failed', `❌ Failed to send to ${app.email}: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Error sending email:', error);
            addAdminLog('error', 'Email Error', `❌ Error sending to ${app.email}: ${error.message}`);
        }
    } else {
        console.warn('⚠️ Email function not available. Make sure sheets-integration.js is loaded.');
        addAdminLog('warning', 'Email Function Unavailable', 'sheets-integration.js not loaded');
    }
}

function sendRejectionNotification(app) {
    addAdminLog('info', 'Sending Rejection Email', `Sending to ${app.email}...`);
    
    // Send rejection email using Netlify function (uses reject template)
    if (typeof window.sendApprovalEmail === 'function') {
        window.sendApprovalEmail(
            app.email,
            app.name,
            app.upiTransactionId || app.id,
            app.course || '',
            'reject',
            app.rejectionReason || ''
        ).then(result => {
            if (result && result.success) {
                console.log('✅ Rejection email sent to:', app.email);
                addAdminLog('success', 'Rejection Email Sent', `✅ Email sent to ${app.name} (${app.email})`);
            } else {
                console.warn('⚠️ Rejection email failed:', result && result.error);
                addAdminLog('error', 'Email Failed', `❌ Failed to send rejection email: ${result && result.error}`);
            }
        }).catch(err => {
            console.error('❌ Error sending rejection email:', err);
            addAdminLog('error', 'Email Error', `❌ Error: ${err.message}`);
        });
    } else {
        console.warn('⚠️ Email function not available. Make sure sheets-integration.js is loaded.');
        addAdminLog('warning', 'Email Function Unavailable', 'sheets-integration.js not loaded');
    }
}

// Toast Notification
let toastTimeout = null;
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    
    // Clear any existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    
    // Remove show class first to reset animation
    toast.classList.remove('show');
    
    // Small delay to allow reset
    setTimeout(() => {
        toast.className = `toast ${type}`;
        toast.querySelector('.toast-title').textContent = title;
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('show');
        
        // Auto-dismiss after 4 seconds
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toastTimeout = null;
        }, 4000);
    }, 50);
}

function setupToastClose() {
    document.querySelector('.toast-close')?.addEventListener('click', function() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
        
        // Clear timeout when manually closed
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            toastTimeout = null;
        }
    });
}

// Modal Close
document.getElementById('closeDetailModal')?.addEventListener('click', function() {
    document.getElementById('detailModal').classList.remove('show');
});

document.getElementById('detailModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('show');
    }
});

// Filters
function initFilters() {
    // Tab filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            renderApplications(filter);
        });
    });
    
    // Search filters
    document.getElementById('searchApplications')?.addEventListener('input', function() {
        filterApplications(this.value);
    });
    
    document.getElementById('searchApproved')?.addEventListener('input', function() {
        filterApproved(this.value);
    });
    
    document.getElementById('searchRejected')?.addEventListener('input', function() {
        filterRejected(this.value);
    });
    
    document.getElementById('filterCourseApp')?.addEventListener('change', function() {
        filterApplicationsByCourse(this.value);
    });
}

function filterApplications(searchTerm) {
    const filtered = applications.filter(app =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.phone.includes(searchTerm)
    );
    
    const grid = document.getElementById('applicationsGrid');
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No results found</h3></div>';
    } else {
        renderApplications();
    }
}

function filterApplicationsByCourse(course) {
    const grid = document.getElementById('applicationsGrid');
    const filtered = course ? applications.filter(app => app.course === course) : applications;
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No applications for this course</h3></div>';
        return;
    }
    
    grid.innerHTML = filtered.map(app => `
        <div class="application-card">
            <div class="app-header">
                <div class="app-avatar">${app.name.charAt(0).toUpperCase()}</div>
                <span class="app-status ${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="app-body">
                <h3 class="app-name">${app.name}</h3>
                <div class="app-info">
                    <div class="info-item"><i class="fas fa-envelope"></i> ${app.email}</div>
                    <div class="info-item"><i class="fas fa-phone"></i> ${app.phone}</div>
                    <div class="info-item"><i class="fas fa-graduation-cap"></i> ${app.course}</div>
                    <div class="info-item"><i class="fas fa-calendar"></i> ${formatDate(app.appliedDate)}</div>
                </div>
            </div>
            <div class="app-footer">
                <button class="btn-action btn-view" onclick="viewApplication('${app.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                ${app.status === 'Pending' ? `
                    <button class="btn-action btn-approve" onclick="approveApplication('${app.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-action btn-reject" onclick="rejectApplication('${app.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Charts
function initCharts() {
    initApplicationTrendChart();
    initCourseDistributionChart();
    initApplicationStatsChart();
    initStatusDistributionChart();
    initWeeklyFlowChart();
}

function updateCharts() {
    const charts = [
        window.applicationTrendChart,
        window.courseDistributionChart,
        window.applicationStatsChart,
        window.statusDistributionChart,
        window.weeklyFlowChart
    ];
    
    charts.forEach(chart => {
        if (chart) chart.destroy();
    });
    
    initCharts();
}

function initApplicationTrendChart() {
    const ctx = document.getElementById('applicationTrendChart');
    if (!ctx) return;
    
    // Group by date
    const dates = {};
    applications.forEach(app => {
        const date = new Date(app.appliedDate).toLocaleDateString();
        dates[date] = (dates[date] || 0) + 1;
    });
    
    const sortedDates = Object.keys(dates).sort((a, b) => new Date(a) - new Date(b));
    const counts = sortedDates.map(date => dates[date]);
    
    window.applicationTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.length > 0 ? sortedDates : ['No Data'],
            datasets: [{
                label: 'Applications',
                data: counts.length > 0 ? counts : [0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
}

function initCourseDistributionChart() {
    const ctx = document.getElementById('courseDistributionChart');
    if (!ctx) return;
    
    const courses = {};
    applications.forEach(app => {
        courses[app.course] = (courses[app.course] || 0) + 1;
    });
    
    window.courseDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(courses),
            datasets: [{
                data: Object.values(courses),
                backgroundColor: ['#6366f1', '#ec4899', '#3b82f6', '#10b981']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function initApplicationStatsChart() {
    const ctx = document.getElementById('applicationStatsChart');
    if (!ctx) return;
    
    const pending = applications.filter(app => app.status === 'Pending').length;
    const approved = applications.filter(app => app.status === 'Approved').length;
    const rejected = applications.filter(app => app.status === 'Rejected').length;
    
    window.applicationStatsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                label: 'Count',
                data: [pending, approved, rejected],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
}

function initStatusDistributionChart() {
    const ctx = document.getElementById('statusDistributionChart');
    if (!ctx) return;
    
    const pending = applications.filter(app => app.status === 'Pending').length;
    const approved = applications.filter(app => app.status === 'Approved').length;
    const rejected = applications.filter(app => app.status === 'Rejected').length;
    
    window.statusDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                data: [pending, approved, rejected],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function initWeeklyFlowChart() {
    const ctx = document.getElementById('weeklyFlowChart');
    if (!ctx) return;
    
    // Last 7 days
    const days = [];
    const pendingData = [];
    const approvedData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        days.push(dateStr);
        
        pendingData.push(applications.filter(app => 
            new Date(app.appliedDate).toLocaleDateString() === dateStr && app.status === 'Pending'
        ).length);
        
        approvedData.push(applications.filter(app => 
            new Date(app.appliedDate).toLocaleDateString() === dateStr && app.status === 'Approved'
        ).length);
    }
    
    window.weeklyFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Pending',
                    data: pendingData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Approved',
                    data: approvedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Sample Data (Fallback only if no Google Sheets data)
function getSampleApplications() {
    return [];
}

// ==============================================
// PAYMENT HISTORY FUNCTIONS
// ==============================================

function renderPaymentHistory() {
    const paymentList = document.getElementById('paymentHistoryList');
    if (!paymentList) return;
    
    const filter = document.getElementById('paymentStatusFilter')?.value || 'all';
    
    // Filter approved applications with payment info
    const paidApplications = applications.filter(app => 
        app.status === 'Approved' && 
        (app.paymentAmount || app.paymentType) &&
        (filter === 'all' || app.paymentStatus === filter)
    );
    
    if (paidApplications.length === 0) {
        paymentList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No payment records found</p>
            </div>
        `;
        return;
    }
    
    paymentList.innerHTML = paidApplications.map(app => {
        const isInstallment = app.paymentType && app.paymentType.toLowerCase().includes('installment');
        const paymentIcon = isInstallment ? 'fa-calendar-check' : 'fa-check-circle';
        const statusColor = app.paymentStatus === 'Paid' ? '#10b981' : app.paymentStatus === 'Installment' ? '#f59e0b' : '#ef4444';
        
        return `
            <div class="payment-item" style="display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; background: white; border-radius: 12px; margin-bottom: 1rem; border-left: 4px solid ${statusColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${statusColor}20; display: flex; align-items: center; justify-content: center; color: ${statusColor};">
                            <i class="fas ${paymentIcon}"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 600;">${app.name}</h4>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary);">
                                <i class="fas fa-envelope"></i> ${app.email}
                                ${app.phone ? `<span style="margin-left: 12px;"><i class="fas fa-phone"></i> ${app.phone}</span>` : ''}
                            </p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                        <div>
                            <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Course</span>
                            <p style="margin: 4px 0 0 0; font-weight: 500;">${app.course}</p>
                        </div>
                        <div>
                            <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Payment Type</span>
                            <p style="margin: 4px 0 0 0; font-weight: 500;">${app.paymentType || 'Full Payment'}</p>
                        </div>
                        ${app.upiTransactionId ? `
                        <div>
                            <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Transaction ID</span>
                            <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 13px;">${app.upiTransactionId}</p>
                        </div>
                        ` : ''}
                        ${isInstallment ? `
                        <div>
                            <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Installments</span>
                            <p style="margin: 4px 0 0 0; font-weight: 500;">${app.installmentsPaid || 0} / ${app.totalInstallments || 2} Paid</p>
                        </div>
                        ` : ''}
                        <div>
                            <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Approved Date</span>
                            <p style="margin: 4px 0 0 0; font-size: 13px;">${new Date(app.approvedDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; margin-left: 1.5rem;">
                    <div style="font-size: 24px; font-weight: 700; color: ${statusColor};">
                        ${app.paymentAmount ? '₹' + app.paymentAmount : '-'}
                    </div>
                    <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                        ${app.paymentStatus || 'Pending'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    // Update payment stats
    updatePaymentStats();
}

function updatePaymentStats() {
    const approvedApps = applications.filter(app => app.status === 'Approved');
    
    const fullPayments = approvedApps.filter(app => app.paymentStatus === 'Paid').length;
    const installmentPayments = approvedApps.filter(app => app.paymentStatus === 'Installment').length;
    const totalRevenue = approvedApps
        .filter(app => app.paymentAmount)
        .reduce((sum, app) => sum + (parseFloat(app.paymentAmount) || 0), 0);
    
    const fullPaymentElem = document.getElementById('totalPaidPayments');
    const installmentElem = document.getElementById('totalInstallmentPayments');
    const revenueElem = document.getElementById('totalRevenue');
    
    if (fullPaymentElem) animateValue(fullPaymentElem, fullPayments);
    if (installmentElem) animateValue(installmentElem, installmentPayments);
    if (revenueElem) {
        let start = 0;
        const duration = 800;
        const startTime = performance.now();
        
        function animateRevenue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(totalRevenue * progress);
            revenueElem.textContent = '₹' + current.toLocaleString();
            if (progress < 1) requestAnimationFrame(animateRevenue);
        }
        requestAnimationFrame(animateRevenue);
    }
}

// Add payment filter listener
document.addEventListener('DOMContentLoaded', function() {
    const paymentFilter = document.getElementById('paymentStatusFilter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', renderPaymentHistory);
    }
});

