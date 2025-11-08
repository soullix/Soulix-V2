// ============================================
// GOOGLE SHEETS INTEGRATION
// Real-time data sync with Google Sheets
// ============================================

// Your Google Sheet ID
const SHEET_ID = '1jyY4SI-cIHfj-Q-vhAy61IigF7zi9DE2nIkDmUe-IO4';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

// Cache to prevent unnecessary updates
let lastDataHash = null;

// Optimized hash function for data comparison
function hashData(data) {
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// Fetch data from Google Sheets
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_CSV_URL, {
            mode: 'cors',
            headers: { 'Accept': 'text/csv' },
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();
        const data = parseCSV(csvText);
        
        // Check if data changed
        const currentHash = hashData(data);
        if (currentHash === lastDataHash) return null; // No changes
        
        lastDataHash = currentHash;
        
        // ============================================
        // DIRECT SUPABASE SYNC - NO LOCALSTORAGE
        // Google Sheets → Supabase → Dashboard
        // ============================================
        
        if (typeof supabase === 'undefined' || !supabase) {
            console.error('❌ Supabase not initialized - cannot sync from Google Sheets');
            showToast('error', 'Database Error', 'Supabase not connected. Data cannot be synced.');
            return null;
        }
        
        try {
            const sheetApplications = convertSheetDataToSupabaseFormat(data);
            console.log(`📊 Google Sheets: Found ${sheetApplications.length} entries`);
            
            // Get existing IDs from Supabase
            const { data: supabaseData, error: fetchError } = await supabase
                .from('applications')
                .select('id');
            
            if (fetchError) throw fetchError;
            
            const supabaseIds = new Set((supabaseData || []).map(app => app.id));
            console.log(`☁️ Supabase: ${supabaseIds.size} existing entries`);
            
            // Find NEW entries only
            const newEntries = sheetApplications.filter(app => !supabaseIds.has(app.id));
            
            if (newEntries.length === 0) {
                console.log('✅ No new entries from Google Sheets');
                return null;
            }
            
            console.log(`🆕 Adding ${newEntries.length} new entries to Supabase...`);
            
            // Batch insert new entries
            const { data: insertedData, error: insertError } = await supabase
                .from('applications')
                .insert(newEntries)
                .select();
            
            if (insertError) throw insertError;
            
            console.log(`✅ Successfully added ${insertedData?.length || 0} new applications`);
            
            // Show notification for new entries
            if (insertedData && insertedData.length > 0) {
                showToast('success', '🆕 New Applications', 
                    `${insertedData.length} new application(s) added from Google Sheets`);
                
                // Trigger UI refresh
                if (typeof loadDataFromSupabase === 'function') {
                    await loadDataFromSupabase();
                }
                
                requestAnimationFrame(() => {
                    if (typeof updateAllStats === 'function') updateAllStats();
                    if (typeof renderApplications === 'function') renderApplications();
                    if (typeof renderRecentApplications === 'function') renderRecentApplications();
                    if (typeof updateCharts === 'function') updateCharts();
                });
            }
            
            return insertedData;
            
        } catch (supabaseError) {
            console.error('❌ Supabase sync error:', supabaseError);
            showToast('error', 'Sync Error', `Failed to sync with database: ${supabaseError.message}`);
            return null;
        }
    } catch (error) {
        console.error('Sync error:', error.message);
        
        let errorMessage = 'Could not load data from Google Sheets.';
        let errorDetails = '';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = '🔒 Google Sheet Not Accessible';
            errorDetails = 'Make sure your sheet is public: Share → Anyone with link → Viewer';
        } else if (error.message.includes('404')) {
            errorMessage = '❌ Sheet Not Found';
            errorDetails = 'Check if the Sheet ID is correct';
        } else if (error.message.includes('403')) {
            errorMessage = '🔒 Permission Denied';
            errorDetails = 'Sheet must be public to sync';
        }
        
        showToast('error', errorMessage, errorDetails + ' Using local data.');
        
        // Try to load from localStorage as fallback
        const localData = localStorage.getItem('soulixApplications');
        if (localData) {
            console.log('📦 Using cached local data');
            loadData();
        }
        
        return null;
    }
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (!lines.length) return [];
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index]?.trim().replace(/^"|"$/g, '') || '';
        });
        
        if (Object.values(row).some(val => val && val.length > 0)) {
            data.push(row);
        }
    }
    
    return data;
}

// Parse CSV line (handles quoted values)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

// Convert sheet data to Supabase format (directly)
function convertSheetDataToSupabaseFormat(sheetData) {
    return sheetData.map((row, index) => {
        
        const getId = () => row['Response id'] || row['ID'] || row['id'] || `APP${String(index + 1).padStart(3, '0')}`;
        
        const getName = () => {
            const firstName = row['Enter your name / first name'] || row['first name'] || '';
            const lastName = row['Enter your name / last name'] || row['last name'] || '';
            return firstName || lastName ? `${firstName} ${lastName}`.trim() : row['Name'] || row['name'] || '';
        };
        
        const getEmail = () => row['Your Email'] || row['Email'] || row['email'] || '';
        
        const getPhone = () => {
            const keys = Object.keys(row);
            const phoneKey = keys.find(k => k.includes('phone') || k.includes('Phone'));
            return (phoneKey ? row[phoneKey] : '') || row['Phone'] || row['Mobile'] || '';
        };
        
        const getCourse = () => {
            const keys = Object.keys(row);
            const courseKey = keys.find(k => k.includes('Course Fee'));
            return (courseKey ? row[courseKey] : '') || row['Course'] || row['course'] || '';
        };
        
        const getPaymentType = () => {
            const keys = Object.keys(row);
            const paymentKey = keys.find(k => k.includes('payment method') || k.includes('Payment method'));
            return (paymentKey ? row[paymentKey] : '') || row['Payment Type'] || row['Choose your payment method *'] || '';
        };
        
        const getUPITransactionID = () => {
            const keys = Object.keys(row);
            const upiKey = keys.find(k => k.includes('UPI Transaction') || k.includes('Transaction ID'));
            return (upiKey ? row[upiKey] : '') || row['Enter UPI Transaction ID'] || '';
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
        
        // Only return valid entries
        if (!name || !email) return null;
        
        return {
            id: getId(),
            name: name,
            email: email,
            phone: getPhone(),
            course: getCourse(),
            status: 'Pending', // Always pending from Google Sheets
            applied_date: getDate(),
            approved_date: null,
            rejected_date: null,
            payment_type: getPaymentType(),
            payment_amount: null,
            payment_status: 'Pending',
            upi_transaction_id: getUPITransactionID(),
            installments_paid: 0,
            total_installments: 2,
            rejection_reason: null,
            approved_by: null,
            rejected_by: null
        };
    }).filter(app => app !== null);
}

// Auto-sync every 10 seconds (with visibility optimization)
let syncInterval;
let isPageVisible = true;

// Pause sync when tab is not visible
document.addEventListener('visibilitychange', function() {
    isPageVisible = !document.hidden;
    if (isPageVisible && !syncInterval) {
        startAutoSync();
    } else if (!isPageVisible && syncInterval) {
        stopAutoSync();
    }
});

function startAutoSync() {
    if (syncInterval) return;
    fetchSheetData();
    syncInterval = setInterval(() => {
        if (isPageVisible) fetchSheetData();
    }, 10000);
}

function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Export functions
window.sheetIntegration = {
    fetch: fetchSheetData,
    startAutoSync,
    stopAutoSync
};

// ============================================
// BREVO EMAIL INTEGRATION (via Netlify Function)
// Secure email sending through serverless backend
// ============================================

// Send approval confirmation email via Netlify Function
async function sendApprovalEmail(studentEmail, studentName, transactionId, courseName = '', action = 'approve', rejectionReason = '') {
    // Validate inputs
    if (!studentEmail || !studentName) {
        console.error('❌ Missing student email or name');
        return { success: false, error: 'Missing required fields' };
    }

    try {
        // Call Netlify serverless function
        const response = await fetch('/.netlify/functions/send-approval-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
                body: JSON.stringify({
                    studentEmail,
                    studentName,
                    transactionId,
                    courseName,
                    action,
                    rejectionReason
                })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } else {
            console.error('❌ Email sending failed:', result.error);
            return { success: false, error: result.error || 'Email sending failed' };
        }
    } catch (error) {
        console.error('❌ Email API error:', error);
        return { success: false, error: error.message };
    }
}

// Export email function globally
window.sendApprovalEmail = sendApprovalEmail;
