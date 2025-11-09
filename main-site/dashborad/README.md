# IGNITE Admin Dashboard - Soulix Tech

A comprehensive admin dashboard for managing student registrations and forum responses for the Ignite course program.

## 🔥 Features

### Admin Authentication
- **Secure Login System**: Admin-only access with username and password
- **Session Management**: 30-minute session timeout for security
- **Remember Me**: Optional persistent login
- **Auto-redirect**: Unauthorized users redirected to login page

### Student Management
- **View All Students**: Complete list with details (name, email, phone, course, status)
- **Add Students**: Quick registration form for new students
- **Search & Filter**: Find students by name, email, phone, or course
- **Student Actions**: View details or remove students
- **Real-time Stats**: Track total enrollments per course

### Forum Management
- **Forum Posts**: Display all student queries and discussions
- **Post Status**: Track Open, Answered, and Closed posts
- **Quick Actions**: Respond, mark as answered, or delete posts
- **Course Tagging**: Organize posts by related course
- **Search & Filter**: Find posts by keyword or status

### Analytics & Reports
- **Dashboard Overview**: Key statistics at a glance
- **Visual Charts**: 
  - Course enrollment distribution (doughnut chart)
  - Registration trends over time (line chart)
  - Students by course (bar chart)
  - Forum activity status (pie chart)
- **Recent Activity Log**: Track all system actions
- **Course Stats**: Monitor enrollment for each course

### Courses Included
1. **Web Development** - 4 Weeks • ₹199
2. **IoT & ESP32** - 3 Weeks • ₹295
3. **C Programming** - 3 Weeks • ₹199
4. **Python Programming** - 4 Weeks • ₹299

## 🚀 Getting Started

### Installation
1. Extract all files to a folder (e.g., `g:\dashborad`)
2. Open `login.html` in your web browser

### Admin Login Credentials
```
Username: admin
Password: soulix2025
```

⚠️ **Important**: For production use, implement proper backend authentication with encrypted passwords.

## 📁 File Structure

```
dashborad/
│
├── login.html          # Admin login page with authentication
├── index.html          # Main dashboard (requires authentication)
├── styles.css          # Complete styling for all pages
├── app.js              # Dashboard functionality and data management
└── README.md           # This file
```

## 🎨 Dashboard Sections

### 1. Overview
- Total students, forum posts, active courses
- Days until launch countdown (December 6, 2025)
- Recent activity feed
- Quick charts for registrations and enrollments

### 2. Students
- Complete student database table
- Add new students
- Search and filter options
- Course-wise filtering
- View and delete student records

### 3. Forum
- All forum posts in card layout
- Post status management (Open/Answered/Closed)
- Add new forum posts
- Respond to student queries
- Search and filter functionality

### 4. Courses
- Visual course cards with enrollments
- Track students per course
- Course pricing and duration
- Color-coded course categories

### 5. Analytics
- Detailed charts and graphs
- Registration trends
- Course popularity analysis
- Forum activity statistics

## 💾 Data Storage

The dashboard uses **localStorage** for data persistence:
- `adminLoggedIn`: Authentication status
- `adminUsername`: Logged-in admin username
- `igniteStudents`: Student records
- `igniteForumPosts`: Forum posts
- `igniteActivityLog`: Activity history

### Sample Data
The dashboard comes pre-loaded with sample data:
- 5 sample students across different courses
- 3 sample forum posts with various statuses

## 🔒 Security Features

1. **Login Required**: All dashboard pages check authentication
2. **Session Timeout**: Auto-logout after 30 minutes of inactivity
3. **Remember Me**: Optional persistent login across browser sessions
4. **Logout Confirmation**: Prevents accidental logouts
5. **Auto-redirect**: Unauthenticated users sent to login page

## 🎯 Usage Instructions

### Adding a Student
1. Click "Add Student" button in header
2. Fill in all required fields:
   - Full Name
   - Email
   - Phone Number
   - Course Selection
   - Status (Active/Pending/Completed)
3. Click "Add Student" to save

### Managing Forum Posts
1. Click "New Forum Post" to create a post
2. Fill in student name, subject, message, and related course
3. View all posts in the Forum section
4. Use action buttons to:
   - Respond to posts
   - Mark as answered
   - Delete posts

### Searching & Filtering
- **Students**: Search by name, email, or phone; filter by course
- **Forum**: Search by keyword; filter by status (Open/Answered/Closed)

### Viewing Analytics
- Navigate to Analytics section
- View comprehensive charts and statistics
- Monitor trends over time
- Track course popularity

## 🌐 Integration with Course Website

This dashboard is designed for: **https://soulixtech.github.io/indexwebtest2/**

### Course Launch Date
**December 6, 2025** - The dashboard tracks countdown to launch date

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop computers (optimal experience)
- Tablets (adaptive layout)
- Mobile phones (simplified navigation)

## 🛠️ Technical Stack

- **HTML5**: Structure and semantic markup
- **CSS3**: Modern styling with gradients, animations, flexbox, grid
- **JavaScript (ES6+)**: Functionality and interactivity
- **Chart.js**: Data visualization and analytics charts
- **Font Awesome**: Icon library for UI elements
- **LocalStorage API**: Client-side data persistence

## 🎨 Color Scheme

- **Primary**: Purple gradient (#667eea → #764ba2)
- **Success**: Green (#10b981)
- **Danger**: Red (#ef4444)
- **Warning**: Orange (#f59e0b)
- **Info**: Blue (#3b82f6)

## 📝 Notes for Production

For a production deployment, consider:

1. **Backend Implementation**:
   - Server-side authentication (Node.js, PHP, Python, etc.)
   - Database integration (MongoDB, MySQL, PostgreSQL)
   - API endpoints for CRUD operations
   - Password hashing and encryption

2. **Security Enhancements**:
   - HTTPS/SSL certificates
   - JWT tokens for authentication
   - CSRF protection
   - Rate limiting
   - Input validation and sanitization

3. **Additional Features**:
   - Email notifications for new registrations
   - Bulk import/export functionality
   - Advanced reporting and analytics
   - User role management
   - File upload for student documents

## 👥 Developed By

**Soulix Tech Team**:
- Pranav Navghare - Lead Developer
- Pranav Parate - UI/UX Designer
- Prajwal Fating - Content Strategist
- Tejas Ingole - Project Manager

## 📧 Support

For questions or support, contact the Soulix Tech team through the main website.

## 📄 License

© 2025 Ignite by Soulix. All rights reserved.

---

**🔥 Empowering Education, Inspiring Excellence**
"# dashborad" 
