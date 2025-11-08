// ============================================
// DATA MANAGER - PURE SUPABASE ARCHITECTURE
// Clean, Simple, No localStorage
// ============================================

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://xmtxeagxnqfczenqwizz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdHhlYWd4bnFmY3plbnF3aXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mzg3MTgsImV4cCI6MjA3ODAxNDcxOH0.NUTpXhNfoXkcCrWhGE2-j4V6p9VydN6EkLPUCBVqeh8'
};

// Global state
let supabaseClient = null;
let applicationsData = [];
let isInitialized = false;

// ============================================
// INITIALIZE
// ============================================
async function initDataManager() {
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }
        
        // Create Supabase client
        supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        
        // Test connection
        const { error } = await supabaseClient.from('applications').select('count').limit(1);
        if (error) throw error;
        
        // Load initial data
        await loadAllData();
        
        // Setup real-time sync
        setupRealtimeSync();
        
        isInitialized = true;
        
        return { success: true };
        
    } catch (error) {
        console.error('Init failed:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// LOAD ALL DATA
// ============================================
async function loadAllData() {
    try {
        const { data, error } = await supabaseClient
            .from('applications')
            .select('*')
            .order('applied_date', { ascending: false });
        
        if (error) throw error;
        
        // Convert to app format
        applicationsData = (data || []).map(convertSupabaseToApp);
        
        // Trigger UI update
        triggerDataUpdate();
        
        return applicationsData;
        
    } catch (error) {
        console.error('Load error:', error);
        throw error;
    }
}

// ============================================
// GET DATA
// ============================================
function getAllApplications() {
    return applicationsData;
}

function getPendingApplications() {
    return applicationsData.filter(app => app.status === 'Pending');
}

function getApprovedApplications() {
    return applicationsData.filter(app => app.status === 'Approved');
}

function getRejectedApplications() {
    return applicationsData.filter(app => app.status === 'Rejected');
}

function getApplicationById(id) {
    return applicationsData.find(app => app.id === id);
}

// ============================================
// APPROVE APPLICATION
// ============================================
async function approveApplication(id, paymentDetails) {
    try {
        const now = new Date().toISOString();
        const deviceInfo = getDeviceInfo();
        
        const updateData = {
            status: 'Approved',
            approved_date: now,
            payment_amount: paymentDetails.amount,
            payment_type: paymentDetails.type,
            payment_status: paymentDetails.status || 'Paid',
            approved_by: JSON.stringify({
                username: sessionStorage.getItem('adminUsername') || 'Admin',
                device: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                timestamp: now
            })
        };
        
        const { data, error } = await supabaseClient
            .from('applications')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Update local data
        const index = applicationsData.findIndex(app => app.id === id);
        if (index !== -1) {
            applicationsData[index] = convertSupabaseToApp(data);
        }
        
        // Save to approved_applications table (critical - must succeed)
        try {
            await saveToApprovedTable(data);
        } catch (approvedError) {
            console.error('CRITICAL: Failed to save to approved_applications table:', approvedError);
            // Rollback: Update status back to Pending
            await supabaseClient
                .from('applications')
                .update({ status: 'Pending', approved_date: null, payment_amount: null, payment_status: 'Pending' })
                .eq('id', id);
            throw new Error('Failed to save approval record. Approval cancelled.');
        }
        
        // Save payment transaction (critical - must succeed)
        try {
            await savePayment(data, paymentDetails);
        } catch (paymentError) {
            console.error('CRITICAL: Failed to save payment record:', paymentError);
            // Payment tracking is critical, fail the approval
            throw new Error('Failed to save payment record. Approval cancelled.');
        }
        
        // Reload to ensure sync
        await loadAllData();
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Approve error:', error);
        return { success: false, error: error.message || 'Approval failed' };
    }
}

// ============================================
// REJECT APPLICATION
// ============================================
async function rejectApplication(id, reason) {
    try {
        const now = new Date().toISOString();
        const deviceInfo = getDeviceInfo();
        
        const updateData = {
            status: 'Rejected',
            rejected_date: now,
            rejection_reason: reason,
            rejected_by: JSON.stringify({
                username: sessionStorage.getItem('adminUsername') || 'Admin',
                device: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                timestamp: now
            })
        };
        
        const { data, error } = await supabaseClient
            .from('applications')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Update local data
        const index = applicationsData.findIndex(app => app.id === id);
        if (index !== -1) {
            applicationsData[index] = convertSupabaseToApp(data);
        }
        
        // Save to rejected_applications table (critical - must succeed)
        try {
            await saveToRejectedTable(data);
        } catch (rejectError) {
            console.error('CRITICAL: Failed to save to rejected_applications table:', rejectError);
            // Rollback: Update status back to Pending
            await supabaseClient
                .from('applications')
                .update({ status: 'Pending', rejected_date: null, rejection_reason: null })
                .eq('id', id);
            throw new Error('Failed to save rejection record. Rejection cancelled.');
        }
        
        // Reload to ensure sync
        await loadAllData();
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Reject error:', error);
        return { success: false, error: error.message || 'Rejection failed' };
    }
}

// ============================================
// DELETE APPLICATION
// ============================================
async function deleteApplication(id) {
    try {
        const { error } = await supabaseClient
            .from('applications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Remove from local data
        const index = applicationsData.findIndex(app => app.id === id);
        if (index !== -1) {
            applicationsData.splice(index, 1);
        }
        
        // Reload to ensure sync
        await loadAllData();
        
        return { success: true };
        
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function convertSupabaseToApp(supabaseRow) {
    return {
        id: supabaseRow.id,
        name: supabaseRow.name,
        email: supabaseRow.email,
        phone: supabaseRow.phone,
        course: supabaseRow.course,
        status: supabaseRow.status,
        appliedDate: supabaseRow.applied_date,
        approvedDate: supabaseRow.approved_date,
        rejectedDate: supabaseRow.rejected_date,
        paymentType: supabaseRow.payment_type,
        paymentAmount: supabaseRow.payment_amount,
        paymentStatus: supabaseRow.payment_status,
        upiTransactionId: supabaseRow.upi_transaction_id,
        installmentsPaid: supabaseRow.installments_paid || 0,
        totalInstallments: supabaseRow.total_installments || 2,
        rejectionReason: supabaseRow.rejection_reason,
        approvedBy: supabaseRow.approved_by ? parseJSON(supabaseRow.approved_by) : null,
        rejectedBy: supabaseRow.rejected_by ? parseJSON(supabaseRow.rejected_by) : null,
        // Additional fields from Google Form
        technicalSkills: supabaseRow.technical_skills,
        goals: supabaseRow.goals,
        yearOfStudy: supabaseRow.year_of_study,
        branch: supabaseRow.branch,
        department: supabaseRow.department,
        preferredDomain: supabaseRow.preferred_domain,
        financialSupport: supabaseRow.financial_support,
        questions: supabaseRow.questions
    };
}

function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function getDeviceInfo() {
    try {
        const stored = sessionStorage.getItem('deviceInfo');
        return stored ? JSON.parse(stored) : {
            deviceType: 'Desktop',
            browser: 'Unknown',
            platform: 'Unknown'
        };
    } catch (e) {
        return { deviceType: 'Desktop', browser: 'Unknown', platform: 'Unknown' };
    }
}

async function saveToApprovedTable(application) {
    try {
        const deviceInfo = getDeviceInfo();
        
        const approvedData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            payment_type: application.payment_type,
            payment_amount: application.payment_amount,
            payment_status: application.payment_status,
            upi_transaction_id: application.upi_transaction_id,
            applied_date: application.applied_date,
            approved_date: application.approved_date,
            approved_by_username: sessionStorage.getItem('adminUsername') || 'Admin',
            approved_by_device: deviceInfo.deviceType,
            approved_by_browser: deviceInfo.browser
        };
        
        const { data, error } = await supabaseClient.from('approved_applications').insert([approvedData]);
        
        if (error) {
            console.error('Approved table error:', error);
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Approved table save failed:', error);
        throw error; // Propagate error to caller
    }
}

async function saveToRejectedTable(application) {
    try {
        const deviceInfo = getDeviceInfo();
        
        const rejectedData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone,
            course: application.course,
            rejection_reason: application.rejection_reason,
            applied_date: application.applied_date,
            rejected_date: application.rejected_date,
            rejected_by_username: sessionStorage.getItem('adminUsername') || 'Admin',
            rejected_by_device: deviceInfo.deviceType,
            rejected_by_browser: deviceInfo.browser
        };
        
        const { data, error } = await supabaseClient.from('rejected_applications').insert([rejectedData]);
        
        if (error) {
            console.error('Rejected table error:', error);
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Rejected table save failed:', error);
        throw error; // Propagate error to caller
    }
}

async function savePayment(application, paymentDetails) {
    try {
        const deviceInfo = getDeviceInfo();
        
        const paymentData = {
            application_id: application.id,
            student_name: application.name,
            student_email: application.email,
            student_phone: application.phone || 'Not provided',
            course: application.course,
            payment_amount: paymentDetails.amount,
            payment_type: paymentDetails.type,
            payment_status: paymentDetails.status || 'Paid',
            upi_transaction_id: application.upi_transaction_id,
            payment_date: new Date().toISOString()
        const { data, error } = await supabaseClient.from('payments').insert([paymentData]);
        
        if (error) {
            console.error('Payment save error:', error);
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Payment save failed:', error);
        throw error; // Propagate error to caller
    }
}   } catch (error) {
        console.error('Payment save failed:', error.message);
    }
}

// ============================================
// REAL-TIME SYNC
// ============================================
function setupRealtimeSync() {
    supabaseClient
        .channel('applications-realtime')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'applications' },
            async (payload) => {
                await loadAllData();
            }
        )
        .subscribe();
}

// ============================================
// UI UPDATE TRIGGER
// ============================================
function triggerDataUpdate() {
    window.dispatchEvent(new CustomEvent('dataUpdated', {
        detail: { timestamp: Date.now() }
    }));
}

// ============================================
// LOG FUNCTIONS
// ============================================
async function saveLog(type, title, message) {
    try {
        const deviceInfo = getDeviceInfo();
        
        const logData = {
            log_type: type,
            title: title,
            message: message,
            username: sessionStorage.getItem('adminUsername') || 'Admin',
            device_type: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            platform: deviceInfo.platform
        };
        
        const { data, error } = await supabaseClient.from('admin_logs').insert([logData]);
        
        if (error) {
            console.error('❌ Failed to save log:', error);
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error saving log:', error);
        return { success: false, error: error.message };
    }
}

async function getLogs(limit = 50) {
    try {
        const { data, error } = await supabaseClient
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Error loading logs:', error);
            throw error;
        }
        
        return data || [];
        
    } catch (error) {
        console.error('Error loading logs:', error);
        return [];
    }
}

async function saveLoginSession() {
    try {
        const deviceInfo = getDeviceInfo();
        
        const sessionData = {
            username: sessionStorage.getItem('adminUsername') || 'Admin',
            login_time: new Date().toISOString(),
            device_type: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            platform: deviceInfo.platform,
            screen_resolution: `${screen.width}x${screen.height}`,
            user_agent: navigator.userAgent
        };
        
        await supabaseClient.from('login_sessions').insert([sessionData]);
    } catch (error) {
        console.error('Error saving login session:', error);
    }
}

// ============================================
// EXPORT
// ============================================
window.DataManager = {
    // Initialize
    init: initDataManager,
    
    // Get data
    getAll: getAllApplications,
    getPending: getPendingApplications,
    getApproved: getApprovedApplications,
    getRejected: getRejectedApplications,
    getById: getApplicationById,
    
    // Actions
    approve: approveApplication,
    reject: rejectApplication,
    delete: deleteApplication,
    reload: loadAllData,
    
    // Logs
    saveLog: saveLog,
    getLogs: getLogs,
    saveLoginSession: saveLoginSession,
    
    // Status
    isReady: () => isInitialized,
    
    // Supabase client (for sheets-sync)
    getSupabaseClient: () => supabaseClient
};
