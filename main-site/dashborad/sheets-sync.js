// ============================================
// GOOGLE SHEETS SYNC - NEW CLEAN VERSION
// Only adds NEW entries to Supabase
// ============================================

const SHEETS_CONFIG = {
    sheetId: '1jyY4SI-cIHfj-Q-vhAy61IigF7zi9DE2nIkDmUe-IO4',
    syncInterval: 30000, // 30 seconds - optimized for multiple concurrent users
    backoffStart: 30000, // Start backoff at 30 seconds
    backoffMax: 300000 // Max backoff at 5 minutes
};

let syncTimer = null;
let lastSyncHash = null;
let backoffDelay = 0; // Current backoff delay in ms
let lastBackoffTime = 0; // Timestamp when backoff was set

// ============================================
// START AUTO SYNC
// ============================================
function startSheetsSync() {
    // Initial sync
    syncFromSheets();
    
    // Auto sync every 30 seconds
    syncTimer = setInterval(syncFromSheets, SHEETS_CONFIG.syncInterval);
    
    // Pause when tab not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        } else if (!document.hidden && !syncTimer) {
            syncTimer = setInterval(syncFromSheets, SHEETS_CONFIG.syncInterval);
        }
    });
}

// ============================================
// SYNC FROM GOOGLE SHEETS
// ============================================
async function syncFromSheets() {
    // Check if we're in backoff period
    if (backoffDelay > 0) {
        const elapsed = Date.now() - lastBackoffTime;
        if (elapsed < backoffDelay) {
            const remaining = Math.ceil((backoffDelay - elapsed) / 1000);
            console.warn(`Sync paused: rate limit backoff (${remaining}s remaining)`);
            return;
        }
        // Backoff period expired, reset
        backoffDelay = 0;
        lastBackoffTime = 0;
    }
    
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.sheetId}/export?format=csv&gid=0`;
        
        const response = await fetch(csvUrl, {
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Check if data changed
        const currentHash = hashString(csvText);
        if (currentHash === lastSyncHash) {
            // Successful sync - reset backoff
            backoffDelay = 0;
            lastBackoffTime = 0;
            return; // No changes
        }
        lastSyncHash = currentHash;
        
        const entries = parseCSV(csvText);
        
        // Add only NEW entries to Supabase
        await addNewEntriesToSupabase(entries);
        
        // Successful sync - reset backoff
        backoffDelay = 0;
        lastBackoffTime = 0;
        
    } catch (error) {
        // Handle HTTP 429 (rate limit) with exponential backoff
        if (error.message === 'HTTP 429') {
            // Calculate new backoff delay (exponential)
            if (backoffDelay === 0) {
                backoffDelay = SHEETS_CONFIG.backoffStart;
            } else {
                backoffDelay = Math.min(backoffDelay * 2, SHEETS_CONFIG.backoffMax);
            }
            lastBackoffTime = Date.now();
            
            const backoffSeconds = Math.ceil(backoffDelay / 1000);
            console.warn(`⚠️ Rate limit hit (HTTP 429) - backing off for ${backoffSeconds}s`);
        } else {
            // Other errors - log as errors
            console.error('Sync error:', error.message);
        }
    }
}

// ============================================
// ADD NEW ENTRIES TO SUPABASE
// ============================================
async function addNewEntriesToSupabase(sheetEntries) {
    if (!window.DataManager || !window.DataManager.isReady()) {
        return;
    }
    
    try {
        // Get existing IDs from Supabase
        const existingApps = window.DataManager.getAll();
        const existingIds = new Set(existingApps.map(app => app.id));
        
        // Filter NEW entries and entries to UPDATE
        const newEntries = sheetEntries.filter(entry => !existingIds.has(entry.id));
        const existingEntries = sheetEntries.filter(entry => existingIds.has(entry.id));
        
        // Get Supabase client from DataManager (reuse existing instance)
        const supabase = window.DataManager.getSupabaseClient();
        if (!supabase) {
            return;
        }
        
        // UPDATE existing entries with correct data from sheets
        if (existingEntries.length > 0) {
            for (const entry of existingEntries) {
                const existingApp = existingApps.find(app => app.id === entry.id);
                // Only update if status is still Pending (don't overwrite approved/rejected)
                if (existingApp && existingApp.status === 'Pending') {
                    await supabase
                        .from('applications')
                        .update({
                            course: entry.course,
                            phone: entry.phone,
                            name: entry.name,
                            email: entry.email,
                            payment_type: entry.payment_type,
                            upi_transaction_id: entry.upi_transaction_id,
                            technical_skills: entry.technical_skills,
                            goals: entry.goals,
                            year_of_study: entry.year_of_study,
                            branch: entry.branch,
                            department: entry.department,
                            preferred_domain: entry.preferred_domain,
                            financial_support: entry.financial_support,
                            questions: entry.questions
                        })
                        .eq('id', entry.id);
                }
            }
        }
        
        if (newEntries.length === 0) {
            // Reload even if only updates happened
            if (existingEntries.length > 0 && window.DataManager && window.DataManager.reload) {
                await window.DataManager.reload();
            }
            return;
        }
        
        // Insert new entries
        const { data, error } = await supabase
            .from('applications')
            .insert(newEntries);
        
        if (error) throw error;
        
        // Reload data
        if (window.DataManager && window.DataManager.reload) {
            await window.DataManager.reload();
        }
        
        // Show notification only for new entries
        if (window.showToast && newEntries.length > 0) {
            window.showToast('success', '🆕 New Applications', 
                `${newEntries.length} new application(s)`);
        }
        
    } catch (error) {
        console.error('Failed to add entries to Supabase:', error);
    }
}

// ============================================
// PARSE CSV
// ============================================
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const entries = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < 2) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        const entry = convertRowToSupabaseFormat(row, i);
        if (entry) entries.push(entry);
    }
    
    return entries;
}

// ============================================
// CONVERT ROW TO SUPABASE FORMAT
// ============================================
function convertRowToSupabaseFormat(row, index) {
    const getId = () => {
        return row['Response id'] || row['ID'] || row['id'] || `APP${String(index).padStart(3, '0')}`;
    };
    
    const getName = () => {
        const firstName = row['Enter your name / first name'] || row['first name'] || '';
        const lastName = row['Enter your name / last name'] || row['last name'] || '';
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : row['Name'] || row['name'] || '';
    };
    
    const getEmail = () => {
        return row['Your Email'] || row['Email'] || row['email'] || '';
    };
    
    const getPhone = () => {
        const phoneKeys = Object.keys(row).filter(k => 
            k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')
        );
        return phoneKeys.length > 0 ? row[phoneKeys[0]] : '';
    };
    
    const getCourse = () => {
        // Look for actual course selection columns - NOT goals/objectives
        const courseKeys = Object.keys(row).filter(k => {
            const lower = k.toLowerCase();
            return (lower.includes('select') || lower.includes('choose') || lower.includes('which course')) && 
                   lower.includes('course') &&
                   !lower.includes('achieve') &&
                   !lower.includes('hope') &&
                   !lower.includes('goal');
        });
        
        // If no specific course selection column, try generic "course" but exclude goals
        if (courseKeys.length === 0) {
            const backupKeys = Object.keys(row).filter(k => {
                const lower = k.toLowerCase();
                return lower.includes('course') && 
                       !lower.includes('achieve') &&
                       !lower.includes('hope') &&
                       !lower.includes('goal') &&
                       !lower.includes('taking this');
            });
            if (backupKeys.length > 0) {
                return row[backupKeys[0]];
            }
        }
        
        if (courseKeys.length > 0) {
            return row[courseKeys[0]];
        }
        
        return '';
    };
    
    const getPaymentType = () => {
        const paymentKeys = Object.keys(row).filter(k => 
            k.toLowerCase().includes('payment method')
        );
        return paymentKeys.length > 0 ? row[paymentKeys[0]] : null;
    };
    
    const getUPIId = () => {
        const upiKeys = Object.keys(row).filter(k => 
            k.toLowerCase().includes('upi') || k.toLowerCase().includes('transaction')
        );
        return upiKeys.length > 0 ? row[upiKeys[0]] : null;
    };
    
    const getDate = () => {
        const dateStr = row['Response created at'] || row['Date'] || row['Timestamp'];
        if (!dateStr) return new Date().toISOString();
        try {
            return new Date(dateStr).toISOString();
        } catch (e) {
            return new Date().toISOString();
        }
    };
    
    const name = getName();
    const email = getEmail();
    
    if (!name || !email) return null;
    
    return {
        id: getId(),
        name: name,
        email: email,
        phone: getPhone(),
        course: getCourse(),
        status: 'Pending',
        applied_date: getDate(),
        approved_date: null,
        rejected_date: null,
        payment_type: getPaymentType(),
        payment_amount: null,
        payment_status: 'Pending',
        upi_transaction_id: getUPIId(),
        installments_paid: 0,
        total_installments: 2,
        rejection_reason: null,
        approved_by: null,
        rejected_by: null,
        // Additional fields from Google Form
        technical_skills: row['What technical skills do you currently have?'] || null,
        goals: row['What do you hope to achieve by taking this course?'] || null,
        year_of_study: row['Which year are you currently in?'] || null,
        branch: row['Your Branch'] || null,
        department: row['Your course / department'] || null,
        preferred_domain: row['Select Your Preferred Domain'] || null,
        financial_support: row['Reason for choosing Financial support'] || null,
        questions: row['Any questions?'] || null
    };
}

// ============================================
// UTILITY
// ============================================
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// ============================================
// EXPORT
// ============================================
window.SheetsSync = {
    start: startSheetsSync
};
