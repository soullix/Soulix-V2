-- ==============================================
-- SUPABASE DATABASE SETUP
-- Copy and paste these SQL commands in Supabase SQL Editor
-- ==============================================

-- ============================================
-- 1. CREATE APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    applied_date TIMESTAMPTZ NOT NULL,
    approved_date TIMESTAMPTZ,
    rejected_date TIMESTAMPTZ,
    payment_type TEXT,
    payment_amount TEXT,
    payment_status TEXT,
    upi_transaction_id TEXT,
    installments_paid INTEGER DEFAULT 0,
    total_installments INTEGER DEFAULT 0,
    rejection_reason TEXT,
    approved_by JSONB,
    rejected_by JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_date ON applications(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);

-- Enable Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later for better security)
DROP POLICY IF EXISTS "Allow all access" ON applications;
CREATE POLICY "Allow all access" ON applications FOR ALL USING (true);

-- ============================================
-- 2. CREATE ADMIN LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    username TEXT NOT NULL,
    device_type TEXT,
    browser TEXT,
    platform TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_type ON admin_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_username ON admin_logs(username);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all access" ON admin_logs;
CREATE POLICY "Allow all access" ON admin_logs FOR ALL USING (true);

-- ============================================
-- 3. CREATE LOGIN SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL,
    device_type TEXT,
    browser TEXT,
    platform TEXT,
    screen_resolution TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_sessions_time ON login_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_sessions_username ON login_sessions(username);

-- Enable RLS
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all access" ON login_sessions;
CREATE POLICY "Allow all access" ON login_sessions FOR ALL USING (true);

-- ============================================
-- 4. ENABLE REAL-TIME UPDATES (CRITICAL!)
-- ============================================
-- This allows instant sync across all devices
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE login_sessions;

-- ============================================
-- 5. VERIFY TABLES CREATED
-- ============================================
-- Run this to check if tables were created successfully
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('applications', 'admin_logs', 'login_sessions')
ORDER BY table_name;

-- ============================================
-- SUCCESS! 🎉
-- All tables created and real-time enabled
-- Now go back to your dashboard and login!
-- ============================================
