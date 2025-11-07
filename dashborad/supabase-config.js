// ==============================================
// SUPABASE CONFIGURATION
// Real-time database for applications and logs
// ==============================================

// Supabase Configuration
const SUPABASE_URL = 'https://xmtxeagxnqfczenqwizz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdHhlYWd4bnFmY3plbnF3aXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mzg3MTgsImV4cCI6MjA3ODAxNDcxOH0.NUTpXhNfoXkcCrWhGE2-j4V6p9VydN6EkLPUCBVqeh8';

// Initialize Supabase client (will be loaded from CDN in HTML)
let supabase = null;
let realtimeChannel = null;

// Initialize Supabase
function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not loaded. Make sure to include the Supabase CDN script.');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
        
        // Setup real-time subscription
        setupRealtimeSubscription();
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return false;
    }
}

// Setup Real-time Subscription for Applications
function setupRealtimeSubscription() {
    // Subscribe to applications table changes
    realtimeChannel = supabase
        .channel('applications-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'applications'
            },
            (payload) => {
                console.log('📡 Real-time update received:', payload);
                handleRealtimeUpdate(payload);
            }
        )
        .subscribe();
    
    console.log('🔴 Real-time subscription active');
}

// Handle Real-time Updates
function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'INSERT':
            addAdminLog('success', '➕ New Application', `${newRecord.name} applied for ${newRecord.course}`);
            break;
        case 'UPDATE':
            if (oldRecord.status !== newRecord.status) {
                const statusEmoji = newRecord.status === 'Approved' ? '✅' : newRecord.status === 'Rejected' ? '❌' : '⏳';
                addAdminLog('info', `${statusEmoji} Status Changed`, 
                    `${newRecord.name} • ${oldRecord.status} → ${newRecord.status} • By ${newRecord.approved_by || newRecord.rejected_by || 'Unknown'}`);
            }
            break;
        case 'DELETE':
            addAdminLog('warning', '🗑️ Application Deleted', `ID: ${oldRecord.id}`);
            break;
    }
    
    // Reload data from Supabase
    syncFromSupabase();
}

// ============================================
// SUPABASE CRUD OPERATIONS
// ============================================

// Sync Applications FROM Supabase (Read)
async function syncFromSupabase() {
    if (!supabase) return false;
    
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .order('applied_date', { ascending: false });
        
        if (error) throw error;
        
        // Update local applications array
        applications = data.map(app => ({
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
            approvedBy: app.approved_by,
            rejectedBy: app.rejected_by
        }));
        
        // Update UI
        updateAllStats();
        renderApplications();
        renderRecentApplications();
        updateCharts();
        
        console.log(`✅ Synced ${applications.length} applications from Supabase`);
        return true;
    } catch (error) {
        console.error('❌ Error syncing from Supabase:', error);
        addAdminLog('error', 'Sync Error', error.message);
        return false;
    }
}

// Save Application TO Supabase (Create/Update)
async function saveToSupabase(application) {
    if (!supabase) return false;
    
    try {
        const appData = {
            id: application.id,
            name: application.name,
            email: application.email,
            phone: application.phone,
            course: application.course,
            status: application.status,
            applied_date: application.appliedDate,
            approved_date: application.approvedDate || null,
            rejected_date: application.rejectedDate || null,
            payment_type: application.paymentType || null,
            payment_amount: application.paymentAmount || null,
            payment_status: application.paymentStatus || null,
            upi_transaction_id: application.upiTransactionId || null,
            installments_paid: application.installmentsPaid || 0,
            total_installments: application.totalInstallments || 0,
            rejection_reason: application.rejectionReason || null,
            approved_by: JSON.stringify(application.approvedBy || null),
            rejected_by: JSON.stringify(application.rejectedBy || null)
        };
        
        const { error } = await supabase
            .from('applications')
            .upsert(appData, { onConflict: 'id' });
        
        if (error) throw error;
        
        console.log('✅ Application saved to Supabase:', application.name);
        return true;
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        addAdminLog('error', 'Save Error', error.message);
        return false;
    }
}

// Save Admin Log TO Supabase
async function saveLogToSupabase(logType, title, message) {
    if (!supabase) return false;
    
    try {
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        
        const logData = {
            log_type: logType,
            title: title,
            message: message,
            username: sessionStorage.getItem('adminUsername') || 'Admin',
            device_type: deviceInfo.deviceType || 'Unknown',
            browser: deviceInfo.browser || 'Unknown',
            platform: deviceInfo.platform || 'Unknown',
            timestamp: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('admin_logs')
            .insert([logData]);
        
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('❌ Error saving log to Supabase:', error);
        return false;
    }
}

// Load Admin Logs FROM Supabase
async function loadLogsFromSupabase(limit = 100) {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('admin_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        console.log(`✅ Loaded ${data.length} logs from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error loading logs from Supabase:', error);
        return [];
    }
}

// Save Login Session TO Supabase
async function saveLoginSessionToSupabase() {
    if (!supabase) return false;
    
    try {
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        const loginTime = sessionStorage.getItem('loginTime');
        const username = sessionStorage.getItem('adminUsername') || 'Admin';
        
        const sessionData = {
            username: username,
            login_time: loginTime,
            device_type: deviceInfo.deviceType || 'Unknown',
            browser: deviceInfo.browser || 'Unknown',
            platform: deviceInfo.platform || 'Unknown',
            screen_resolution: deviceInfo.screenResolution || 'Unknown',
            user_agent: deviceInfo.userAgent || navigator.userAgent
        };
        
        const { error } = await supabase
            .from('login_sessions')
            .insert([sessionData]);
        
        if (error) throw error;
        
        console.log('✅ Login session saved to Supabase');
        
        // Also log it to admin logs
        await saveLogToSupabase('success', '🔐 Login Session', 
            `${username} logged in from ${deviceInfo.deviceType} • ${deviceInfo.browser}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error saving login session:', error);
        return false;
    }
}

// Load Recent Login Sessions FROM Supabase
async function loadRecentLoginSessions(limit = 10) {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('login_sessions')
            .select('*')
            .order('login_time', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        console.log(`✅ Loaded ${data.length} login sessions from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error loading login sessions:', error);
        return [];
    }
}

// Check Supabase Connection
async function checkSupabaseConnection() {
    if (!supabase) {
        return { connected: false, error: 'Supabase not initialized' };
    }
    
    try {
        const { error } = await supabase.from('applications').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        return { connected: true };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}
