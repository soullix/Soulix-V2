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
        
        const sheetApplications = convertSheetDataToApplications(data);
        
        console.log(`📊 Google Sheets: Found ${sheetApplications.length} total entries`);
        
        // ============================================
        // NEW STRATEGY: Supabase is Single Source of Truth
        // 1. Load ALL data from Supabase
        // 2. Check which Sheet entries are NEW (not in Supabase)
        // 3. Add only NEW entries to Supabase
        // 4. Update UI with Supabase data
        // ============================================
        
        if (typeof supabase !== 'undefined' && supabase) {
            try {
                // Get ALL applications from Supabase
                const { data: supabaseData, error } = await supabase
                    .from('applications')
                    .select('*');
                
                if (error) throw error;
                
                console.log(`☁️ Supabase: Found ${supabaseData?.length || 0} existing entries`);
                
                // Find NEW entries from Sheets (not in Supabase)
                const supabaseIds = new Set((supabaseData || []).map(app => app.id));
                const newEntries = sheetApplications.filter(app => !supabaseIds.has(app.id));
                
                console.log(`🆕 New entries to add: ${newEntries.length}`);
                
                // Add NEW entries to Supabase
                if (newEntries.length > 0) {
                    for (const app of newEntries) {
                        try {
                            // Convert to Supabase format with ISO dates
                            const supabaseApp = {
                                id: app.id,
                                name: app.name,
                                email: app.email,
                                phone: app.phone,
                                course: app.course,
                                status: 'Pending', // Always pending from Sheets
                                applied_date: new Date(app.appliedDate).toISOString(),
                                approved_date: null,
                                rejected_date: null,
                                payment_type: app.paymentType || null,
                                payment_amount: app.paymentAmount || null,
                                payment_status: 'Pending',
                                upi_transaction_id: app.upiTransactionId || null,
                                installments_paid: 0,
                                total_installments: app.totalInstallments || 2,
                                rejection_reason: null,
                                approved_by: null,
                                rejected_by: null
                            };
                            
                            const { error: insertError } = await supabase
                                .from('applications')
                                .insert([supabaseApp]);
                            
                            if (insertError) throw insertError;
                            
                            console.log(`✅ Added new entry: ${app.name}`);
                        } catch (err) {
                            console.error(`❌ Failed to add ${app.name}:`, err.message);
                        }
                    }
                    
                    // Reload from Supabase after adding new entries
                    const { data: updatedData } = await supabase
                        .from('applications')
                        .select('*');
                    
                    // Convert Supabase format to local format
                    const applications = (updatedData || []).map(app => ({
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
                    
                    // Update localStorage with Supabase data
                    localStorage.setItem('soulixApplications', JSON.stringify(applications));
                    
                    console.log(`✅ Synced: ${applications.length} total applications (${newEntries.length} new added)`);
                    
                    // Update UI
                    requestAnimationFrame(() => {
                        loadData();
                        updateAllStats();
                        renderApplications();
                        renderRecentApplications();
                        updateCharts();
                    });
                    
                    return applications;
                }
                
                // No new entries, just use Supabase data
                console.log('✅ No new entries from Google Sheets');
                return null;
                
            } catch (supabaseError) {
                console.error('❌ Supabase sync error:', supabaseError);
                // Fall back to old method if Supabase fails
            }
        }
        
        // Fallback: If Supabase not available, use old method
        console.log('⚠️ Supabase not available, using localStorage only');
        const applications = sheetApplications;
        localStorage.setItem('soulixApplications', JSON.stringify(applications));
        
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            loadData();
            updateAllStats();
            renderApplications();
            renderRecentApplications();
            updateCharts();
        });
        
        return applications;
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

// Convert sheet data to application format
function convertSheetDataToApplications(sheetData) {
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
        
        const getStatus = () => {
            const status = row['Status'] || row['status'] || 'Pending';
            const normalized = status.toLowerCase().trim();
            if (normalized.includes('approve')) return 'Approved';
            if (normalized.includes('reject')) return 'Rejected';
            return 'Pending';
        };
        
        const getDate = () => row['Response created at'] || row['Date'] || row['Timestamp'] || new Date().toISOString();
        
        return {
            id: getId(),
            name: getName(),
            email: getEmail(),
            phone: getPhone(),
            course: getCourse(),
            status: getStatus(),
            appliedDate: getDate(),
            approvedDate: row['Approved Date'] || null,
            rejectedDate: row['Rejected Date'] || null,
            rejectionReason: row['Rejection Reason'] || row['Notes'] || null,
            // Payment information
            paymentType: getPaymentType(),
            upiTransactionId: getUPITransactionID(),
            paymentAmount: null, // Will be calculated based on course
            paymentStatus: 'Pending', // Pending, Paid, Installment
            installmentsPaid: 0,
            totalInstallments: 2,
            // Additional form data
            technicalSkills: row['What technical skills do you currently have?'] || '',
            goals: row['What do you hope to achieve by taking this course?'] || '',
            yearOfStudy: row['Your Year of Study'] || '',
            branch: row['Your Branch / Department'] || '',
            preferredDomain: row['Select Your Preferred Domain'] || '',
            financialSupport: row['Reason for choosing financial support'] || ''
        };
    }).filter(app => app.name && app.email);
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
