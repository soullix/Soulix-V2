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
        console.error('❌ Supabase client not loaded. Make sure to include the Supabase CDN script.');
        addAdminLog('warning', 'Supabase Not Available', 'Using localStorage only - data will not sync across devices');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
        addAdminLog('success', '🔗 Supabase Connected', 'Real-time database active - data syncs across all devices');
        
        // Setup real-time subscription
        setupRealtimeSubscription();
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        addAdminLog('error', 'Supabase Error', error.message);
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
    if (!supabase) {
        console.warn('⚠️ Supabase not initialized - skipping sync');
        return false;
    }
    
    try {
        console.log('🔄 Syncing applications from Supabase...');
        
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .order('applied_date', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 Received ${data ? data.length : 0} applications from Supabase`);
        
        if (!data || data.length === 0) {
            console.log('⚠️ No data in Supabase, keeping localStorage data');
            return false;
        }
        
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
        
        // Save to localStorage as backup
        localStorage.setItem('soulixApplications', JSON.stringify(applications));
        
        // Update UI
        updateAllStats();
        renderApplications();
        renderRecentApplications();
        updateCharts();
        
        console.log(`✅ Successfully synced ${applications.length} applications from Supabase`);
        addAdminLog('success', '📥 Data Synced', `Loaded ${applications.length} applications from Supabase database`);
        
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
        // Helper to convert dates to ISO format for PostgreSQL
        function toISO(dateStr) {
            if (!dateStr) return null;
            try {
                const date = new Date(dateStr);
                return date.toISOString();
            } catch (e) {
                return null;
            }
        }
        
        const appData = {
            id: application.id,
            name: application.name,
            email: application.email,
            phone: application.phone,
            course: application.course,
            status: application.status,
            applied_date: toISO(application.appliedDate),
            approved_date: toISO(application.approvedDate),
            rejected_date: toISO(application.rejectedDate),
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

// ============================================
// SAVE APPROVED APPLICATION
// ============================================
async function saveApprovedApplication(application) {
    if (!supabase) return false;
    
    try {
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        
        // Helper to convert dates to ISO format
        function toISO(dateStr) {
            if (!dateStr) return null;
            try {
                const date = new Date(dateStr);
                return date.toISOString();
            } catch (e) {
                return null;
            }
        }
        
        const approvedData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            payment_type: application.paymentType || null,
            payment_amount: application.paymentAmount || null,
            payment_status: application.paymentStatus || null,
            upi_transaction_id: application.upiTransactionId || null,
            installments_paid: application.installmentsPaid || 0,
            total_installments: application.totalInstallments || 0,
            applied_date: toISO(application.appliedDate),
            approved_date: toISO(application.approvedDate) || new Date().toISOString(),
            approved_by_username: sessionStorage.getItem('adminUsername') || 'Admin',
            approved_by_device: deviceInfo.deviceType || 'Unknown',
            approved_by_browser: deviceInfo.browser || 'Unknown',
            approved_by_platform: deviceInfo.platform || 'Unknown'
        };
        
        const { error } = await supabase
            .from('approved_applications')
            .insert([approvedData]);
        
        if (error) throw error;
        
        // Also delete from pending_applications if exists
        await supabase
            .from('pending_applications')
            .delete()
            .eq('application_id', application.id);
        
        console.log('✅ Approved application saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving approved application:', error);
        return false;
    }
}

// ============================================
// SAVE REJECTED APPLICATION
// ============================================
async function saveRejectedApplication(application) {
    if (!supabase) return false;
    
    try {
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        
        // Helper to convert dates to ISO format
        function toISO(dateStr) {
            if (!dateStr) return null;
            try {
                const date = new Date(dateStr);
                return date.toISOString();
            } catch (e) {
                return null;
            }
        }
        
        const rejectedData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            rejection_reason: application.rejectionReason || 'Not specified',
            applied_date: toISO(application.appliedDate),
            rejected_date: toISO(application.rejectedDate) || new Date().toISOString(),
            rejected_by_username: sessionStorage.getItem('adminUsername') || 'Admin',
            rejected_by_device: deviceInfo.deviceType || 'Unknown',
            rejected_by_browser: deviceInfo.browser || 'Unknown',
            rejected_by_platform: deviceInfo.platform || 'Unknown'
        };
        
        const { error } = await supabase
            .from('rejected_applications')
            .insert([rejectedData]);
        
        if (error) throw error;
        
        // Also delete from pending_applications if exists
        await supabase
            .from('pending_applications')
            .delete()
            .eq('application_id', application.id);
        
        console.log('✅ Rejected application saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving rejected application:', error);
        return false;
    }
}

// ============================================
// SAVE PENDING APPLICATION
// ============================================
async function savePendingApplication(application) {
    if (!supabase) return false;
    
    try {
        const pendingData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            payment_type: application.paymentType || null,
            upi_transaction_id: application.upiTransactionId || null,
            applied_date: application.appliedDate
        };
        
        const { error } = await supabase
            .from('pending_applications')
            .upsert(pendingData, { onConflict: 'application_id' });
        
        if (error) throw error;
        
        console.log('✅ Pending application saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving pending application:', error);
        return false;
    }
}

// ============================================
// SAVE PAYMENT TRANSACTION
// ============================================
async function savePaymentTransaction(application) {
    if (!supabase) return false;
    
    try {
        const deviceInfo = JSON.parse(sessionStorage.getItem('deviceInfo') || '{}');
        
        const paymentData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            payment_type: application.paymentType || 'Full Payment',
            payment_amount: application.paymentAmount || '0',
            payment_status: application.paymentStatus || 'Paid',
            upi_transaction_id: application.upiTransactionId || null,
            installment_number: application.installmentsPaid || 0,
            total_installments: application.totalInstallments || 0,
            approved_by_username: sessionStorage.getItem('adminUsername') || 'Admin',
            approved_by_device: deviceInfo.deviceType || 'Unknown',
            approved_by_browser: deviceInfo.browser || 'Unknown',
            notes: `Payment confirmed for ${application.course}`
        };
        
        const { error } = await supabase
            .from('payments')
            .insert([paymentData]);
        
        if (error) throw error;
        
        console.log('✅ Payment transaction saved to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving payment transaction:', error);
        return false;
    }
}

// ============================================
// GET ALL APPROVED APPLICATIONS
// ============================================
async function getApprovedApplications() {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('approved_applications')
            .select('*')
            .order('approved_date', { ascending: false });
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Error fetching approved applications:', error);
        return [];
    }
}

// ============================================
// GET ALL REJECTED APPLICATIONS
// ============================================
async function getRejectedApplications() {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('rejected_applications')
            .select('*')
            .order('rejected_date', { ascending: false });
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Error fetching rejected applications:', error);
        return [];
    }
}

// ============================================
// GET ALL PENDING APPLICATIONS
// ============================================
async function getPendingApplications() {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('pending_applications')
            .select('*')
            .order('applied_date', { ascending: false });
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Error fetching pending applications:', error);
        return [];
    }
}

// ============================================
// GET ALL PAYMENTS
// ============================================
async function getAllPayments() {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        return [];
    }
}

// ============================================
// AUTO-MIGRATE LOCALSTORAGE TO SUPABASE
// ============================================
async function autoMigrateToSupabase() {
    if (!supabase) {
        console.warn('⚠️ Supabase not available, skipping auto-migration');
        return { success: 0, failed: 0, skipped: 0 };
    }
    
    try {
        // Check if migration already done
        const migrationFlag = localStorage.getItem('supabaseMigrationDone');
        if (migrationFlag === 'true') {
            console.log('✅ Migration already completed previously');
            return { success: 0, failed: 0, skipped: 0, alreadyDone: true };
        }
        
        console.log('🚀 Starting auto-migration to Supabase...');
        
        // Get data from localStorage
        const data = localStorage.getItem('soulixApplications');
        if (!data) {
            console.log('📭 No data in localStorage to migrate');
            localStorage.setItem('supabaseMigrationDone', 'true');
            return { success: 0, failed: 0, skipped: 0 };
        }
        
        const applications = JSON.parse(data);
        console.log(`📊 Found ${applications.length} applications to check`);
        
        let success = 0;
        let failed = 0;
        let skipped = 0;
        
        for (const app of applications) {
            try {
                // Check if already exists in Supabase
                const { data: existing } = await supabase
                    .from('applications')
                    .select('id')
                    .eq('id', app.id)
                    .single();
                
                if (existing) {
                    console.log(`⏭️ Skipped: ${app.name} (already in Supabase)`);
                    skipped++;
                    continue;
                }
                
                // Helper to convert dates to ISO format
                function toISO(dateStr) {
                    if (!dateStr) return null;
                    try {
                        const date = new Date(dateStr);
                        return date.toISOString();
                    } catch (e) {
                        return null;
                    }
                }
                
                // Convert to Supabase format
                const supabaseApp = {
                    id: app.id,
                    name: app.name,
                    email: app.email,
                    phone: app.phone,
                    course: app.course,
                    status: app.status,
                    applied_date: toISO(app.appliedDate),
                    approved_date: toISO(app.approvedDate),
                    rejected_date: toISO(app.rejectedDate),
                    payment_type: app.paymentType || null,
                    payment_amount: app.paymentAmount || null,
                    payment_status: app.paymentStatus || null,
                    upi_transaction_id: app.upiTransactionId || null,
                    installments_paid: app.installmentsPaid || 0,
                    total_installments: app.totalInstallments || 0,
                    rejection_reason: app.rejectionReason || null,
                    approved_by: app.approvedBy ? JSON.stringify(app.approvedBy) : null,
                    rejected_by: app.rejectedBy ? JSON.stringify(app.rejectedBy) : null
                };
                
                const { error } = await supabase
                    .from('applications')
                    .insert([supabaseApp]);
                
                if (error) throw error;
                
                console.log(`✅ Migrated: ${app.name}`);
                success++;
                
            } catch (error) {
                console.error(`❌ Failed to migrate ${app.name}:`, error.message);
                failed++;
            }
        }
        
        // Mark migration as complete
        localStorage.setItem('supabaseMigrationDone', 'true');
        
        console.log(`🎉 Migration complete: ${success} success, ${skipped} skipped, ${failed} failed`);
        
        if (success > 0) {
            addAdminLog('success', '📦 Data Migrated', `Successfully migrated ${success} applications to Supabase`);
        }
        
        return { success, failed, skipped };
        
    } catch (error) {
        console.error('❌ Auto-migration error:', error);
        return { success: 0, failed: 0, skipped: 0, error: error.message };
    }
}
