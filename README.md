# Employee Live Attendance & Activity Tracking System

A professional full-stack **MERN Employee Live Attendance and Activity Tracking System** built for real-time employee monitoring, attendance management, task management, meeting management, leave handling, and admin-controlled user access.

This system uses **Socket.IO** for real-time online/offline employee tracking and live dashboard updates. It includes role-based dashboards for **Admin**, **Manager**, and **Employee**, with secure authentication using **JWT**, **Google OAuth**, and email-based password reset.

---

## Project Overview

This project is designed to help organizations monitor employee attendance, live activity, break usage, leaves, tasks, and meetings in a centralized dashboard.

New users cannot directly access the system after registration. Every normal registration or Google registration goes into a **pending approval** state. Admins can review users, assign roles, update department/position details, and approve access.

---

## Main Features

### Authentication & Security

* Normal email/password login and registration
* Google login using Google OAuth
* JWT-based authentication
* Forgot password and reset password through email
* Admin approval required after registration
* Role-based access control
* Protected frontend routes
* Secure backend middleware

### User Roles

* Admin
* Manager
* Employee

### Admin Features

* Approve pending users
* View user details without sensitive data
* Change user role
* Update department, position, and phone number
* Suspend, resign, or remove users
* Manage attendance settings
* View reports
* Manage tasks and meetings

### Attendance & Activity Tracking

* Real-time online/offline tracking using Socket.IO
* Daily attendance report
* Historical activity reports
* Daily, weekly, and monthly report filtering
* Work time calculation
* Online time calculation
* Break time calculation
* Overtime and shortage calculation
* Late login and early checkout detection
* CSV export
* Print report

### Break Management

* Breakfast, lunch, and tea break handling
* Break time restrictions
* One break per category per day
* Remaining break time calculation
* Break report for admin/manager

### Leave Management

* Employee leave request
* Admin approval/rejection
* Leave notifications
* Leave status tracking

### Task Management

* Admin/manager can create tasks
* Assign tasks to one or multiple users
* Edit and remove tasks
* Employees can start tasks
* Employees can add work notes
* Employees can complete tasks
* Search and filter assignable users

### Meeting Management

* Admin can create meetings
* Meeting can be assigned to everyone or selected users only
* Only selected users receive selected meeting details
* Start and end meetings
* Capture joined participants
* Track join count and join time

### Notifications

* Notifications saved in MongoDB
* Real-time updates
* Dashboard notification panel

---

## Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* React Router DOM
* Socket.IO Client
* Google OAuth
* Axios
* Lucide React Icons

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* Socket.IO
* Nodemailer
* Google Auth Library
* bcryptjs

---

## Project Structure

```bash
employee-live-tracking-system/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   └── server.js
│   │
│   ├── .env
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── .env
│   ├── package.json
│   └── README.md
│
└── README.md
```

---

## Installation Guide

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd employee-live-tracking-system
```

---

## Backend Setup

### 1. Go to Backend Folder

```bash
cd backend
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Create Backend `.env` File

Create a `.env` file inside the `backend` folder.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id

EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

---

## Backend Environment Variables Explanation

### `PORT`

Backend server running port.

```env
PORT=5000
```

### `MONGO_URI`

MongoDB connection string.

Example:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/employee_tracking
```

### `JWT_SECRET`

Secret key used to sign JWT tokens.

Example:

```env
JWT_SECRET=my_employee_tracking_secret_key
```

### `JWT_EXPIRES_IN`

JWT token expiry time.

Example:

```env
JWT_EXPIRES_IN=7d
```

### `CLIENT_URL`

Frontend URL used for password reset links and CORS.

```env
CLIENT_URL=http://localhost:5173
```

### `GOOGLE_CLIENT_ID`

Google OAuth client ID used to verify Google login tokens.

```env
GOOGLE_CLIENT_ID=your_google_client_id
```

### `EMAIL_USER`

Email address used to send password reset emails.

```env
EMAIL_USER=your_email@gmail.com
```

### `EMAIL_PASS`

Gmail app password. Do not use your normal Gmail password.

```env
EMAIL_PASS=your_gmail_app_password
```

To create a Gmail app password:

1. Enable 2-Step Verification in your Google account.
2. Go to Google Account Security.
3. Create an App Password.
4. Use that app password as `EMAIL_PASS`.

---

## Run Backend

```bash
npm run dev
```

Backend should run on:

```bash
http://localhost:5000
```

---

## Frontend Setup

### 1. Go to Frontend Folder

```bash
cd frontend
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Create Frontend `.env` File

Create a `.env` file inside the `frontend` folder.

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Frontend Environment Variables Explanation

### `VITE_API_BASE_URL`

Backend API base URL.

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### `VITE_GOOGLE_CLIENT_ID`

Google OAuth client ID used by the frontend Google login button.

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

The value of `VITE_GOOGLE_CLIENT_ID` should be the same Google client ID used in the backend `GOOGLE_CLIENT_ID`.

---

## Run Frontend

```bash
npm run dev
```

Frontend should run on:

```bash
http://localhost:5173
```

---

## Google OAuth Setup

1. Go to Google Cloud Console.
2. Create a new project or select an existing project.
3. Enable OAuth consent screen.
4. Create OAuth 2.0 Client ID.
5. Select Web Application.
6. Add this Authorized JavaScript Origin:

```bash
http://localhost:5173
```

7. Add this Authorized Redirect URI if needed:

```bash
http://localhost:5173
```

8. Copy the Client ID and add it to:

Backend `.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
```

Frontend `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Email Password Reset Setup

The password reset feature uses Nodemailer with Gmail.

Backend `.env` requires:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

When a user requests password reset, the system sends a secure reset link to the user email.

Example reset link:

```bash
http://localhost:5173/reset-password/<token>
```

---

## Default System Flow

### User Registration Flow

```text
User registers with email/password or Google
        ↓
Account status becomes pending
        ↓
User cannot access dashboard yet
        ↓
Admin reviews user in User Control section
        ↓
Admin assigns role, department, and position
        ↓
Admin approves user
        ↓
User can login and access dashboard
```

---

## Role-Based Dashboard Flow

### Admin

```text
Login → Admin Dashboard
```

Admin can manage:

* Users
* Attendance reports
* Activity reports
* Leave requests
* Break reports
* Meetings
* Tasks
* Settings
* Notifications

### Manager

```text
Login → Manager Dashboard
```

Manager can manage:

* Reports
* Tasks
* Meetings
* Notifications
* Profile

### Employee

```text
Login → Employee Dashboard
```

Employee can manage:

* Activity status
* Breaks
* Leave requests
* Assigned tasks
* Meetings
* Notifications
* Profile

---

## Main API Modules

### Auth APIs

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/reset-password/:token
GET  /api/auth/me
POST /api/auth/logout
```

### Admin User Control APIs

```http
GET    /api/admin/user-control
GET    /api/admin/user-control/:id
PATCH  /api/admin/user-control/:id/approve
PATCH  /api/admin/user-control/:id/update-role-position
PATCH  /api/admin/user-control/:id/status
DELETE /api/admin/user-control/:id
```

### Attendance APIs

```http
GET /api/attendance-summary/today
```

### Activity Report APIs

```http
GET /api/activity-reports/summary
GET /api/activity-reports/settings
PUT /api/activity-reports/settings
```

### Meeting APIs

```http
GET   /api/meetings/active
GET   /api/meetings/invite-users
POST  /api/meetings
GET   /api/meetings/admin
GET   /api/meetings/:id
PATCH /api/meetings/:id/start
PATCH /api/meetings/:id/end
POST  /api/meetings/:id/join
```

### Task APIs

Task routes allow:

* Create task
* Assign task
* Multi-user assignment
* Edit task
* Delete task
* Start task
* Add note
* Complete task

---

## Socket.IO Real-Time Features

This project uses **Socket.IO** for real-time communication.

Real-time features include:

* Employee online/offline tracking
* Presence updates
* Break started/ended updates
* Meeting started/ended updates
* Meeting join tracking
* Notifications
* Admin live dashboard updates

Example socket events:

```text
presence:user_online
presence:user_offline
presence:user_updated
break:started
break:ended
meetingCreated
meetingStarted
meetingEnded
meetingUserJoined
notification:new
```

---

## Important Notes

### Pending Users Cannot Access Dashboard

New users are created as:

```text
accountStatus = pending
```

They cannot login until admin approves them.

### Google Users Also Need Approval

Google login does not bypass admin approval. New Google users are also created as pending users.

### Sensitive Data Is Protected

Admin user control does not expose sensitive fields such as:

* Password
* Reset password token
* Google ID
* Internal security fields

### Deleted Users Are Soft Deleted

Users are not permanently removed from the database. Instead:

```text
accountStatus = deleted
```

This helps preserve historical attendance and activity records.

---

## Common Issues and Fixes

### Port 5000 Already in Use

If backend gives this error:

```bash
Error: listen EADDRINUSE: address already in use :::5000
```

Run:

```powershell
netstat -ano | findstr :5000
```

Then kill the process:

```powershell
taskkill /PID <PID_NUMBER> /F
```

Restart backend:

```bash
npm run dev
```

---

### Google Login Not Working

Check:

1. `GOOGLE_CLIENT_ID` in backend `.env`
2. `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
3. Google Cloud Console authorized origin:

```bash
http://localhost:5173
```

4. Restart both backend and frontend after changing `.env`.

---

### Password Reset Email Not Sending

Check:

1. `EMAIL_USER`
2. `EMAIL_PASS`
3. Gmail App Password is used, not normal Gmail password
4. 2-Step Verification is enabled
5. Backend restarted after `.env` update

---

### Frontend Cannot Connect to Backend

Check frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Check backend is running on:

```bash
http://localhost:5000
```

---

## Development Commands

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Production Notes

Before deploying:

* Use a strong `JWT_SECRET`
* Use production MongoDB URI
* Set correct `CLIENT_URL`
* Set correct frontend API URL
* Add production domain to Google OAuth allowed origins
* Add production domain to backend CORS
* Never commit `.env` files
* Use HTTPS in production
* Use secure email credentials

---

## Suggested `.gitignore`

```gitignore
node_modules
.env
.env.local
dist
build
.DS_Store
npm-debug.log
```

---

## Project Status

Main features completed:

* Authentication
* Google login
* Email password reset
* Admin approval workflow
* Role-based dashboards
* Live attendance tracking
* Socket.IO real-time updates
* Activity reports
* Leave management
* Break management
* Task management
* Meeting management
* Admin user control
* CSV export
* Print reports

Current stage:

```text
Final testing, polishing, and deployment preparation
```

---

## Author

Developed as a full-stack MERN project for professional employee attendance, activity, and workflow management.

---

## License

This project is for educational and portfolio purposes.
