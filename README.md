# Class Schedule Management System

## Project Overview
This project is a Class Schedule Management System designed to help manage and organize academic schedules. It leverages a modern tech stack including AI capabilities for enhanced functionality.

## Latest Updates (Dec 27, 2025)
- **Student Features:**
    - **Course Planner:** Students can now **drop/remove** courses from their planner directly via the UI.
- **AI & Chatbot Enhancements:**
    - **Rich Text Support:** The Chatbot now renders **Markdown tables, lists, and formatted text** for better readability.
    - **RAG Expansion:** Implemented a **bulk indexing service** to feed all Rooms, Teachers, Courses, and Schedules into the Pinecone vector database for smarter AI responses.
    - **Admin Control:** Added a "Reindex RAG" endpoint for Admins to manually trigger a knowledge base update.
- **Bug Fixes:**
    - **Admin Deletion:** Fixed an `IntegrityError` when deleting Admin accounts by ensuring the profile is deleted before the user record.

## Latest Updates (Dec 26, 2025)
- **Auto Scheduler Enhancements:**
    - **Teacher Preferences:** The scheduler now prioritizes teacher timing preferences. If a teacher prefers a specific time slot, the system attempts to assign their sections to that slot first.
    - **Fallback Logic:** If preferred slots are unavailable, the system falls back to random assignment.
    - **Teacher Assignment:** Teachers are assigned to sections based on their course preferences *before* room scheduling begins.
- **Database Updates:**
    - **Dummy Data Script:** Added `backend/add_dummy_data.py` to populate the database with random faculty types (Permanent/Adjunct) and course preferences for testing.
    - **Faculty Types:** Restricted to 'Permanent' and 'Adjunct' only.
- **UI Improvements:**
    - **Calendar View:** Added date headers to the Day view for better clarity.
    - **Chat Widget:** Implemented a floating AI Chat Assistant (`src/components/ChatWidget.jsx`) available on all portal pages. It supports quick actions like "Plan my courses" and "Find empty labs".
    - **Booking Management:** Users can now delete their own booking requests (if the time hasn't passed).
    - **Admin Schedules:** Added a "Teacher Assignment Overview" table to track assigned vs. unassigned faculty.

## Tech Stack
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **Vector Database:** Pinecone
- **LLM:** Mistral AI
- **Frontend:** React with Tailwind CSS

## Frontend Architecture
### Components
- **Chat Widget (`src/components/ChatWidget.jsx`):**
    - **Floating AI Assistant:** A collapsible chat window accessible from the bottom-right corner.
    - **Context Aware:** Only visible to logged-in users.
    - **Rich Formatting:** Uses `react-markdown` and `remark-gfm` to render tables, lists, and bold text.
    - **Features:** Quick chips for common queries, typing indicators, and integration with the RAG-powered backend.
- **Navbar (`src/components/Navbar.jsx`):**
    - **Dynamic Authentication State:**
        - **Logged Out:** Shows "Login" and "Register" buttons.
        - **Logged In:** Shows "Open Portal" button linking to the user's specific dashboard (Admin/Teacher/Student).
    - **Responsive:** Collapsible menu for mobile devices.
- **Layout (`src/components/Layout.jsx`):**
    - A responsive wrapper component that provides a consistent sidebar navigation structure.
    - **Props:**
        - `children`: The main content to be rendered.
        - `role`: The user role ('admin', 'teacher', 'student') to determine the navigation links.
    - **Features:**
        - **Dynamic Navigation:** Renders different sidebar links based on the user's role.
        - **User Identity:** Displays the logged-in user's full name and role in the sidebar footer.
        - **Responsive Design:** Collapsible sidebar for mobile devices with a hamburger menu.
        - **Role-Based Links:**
            - **Admin:** Dashboard, Manage Teachers, Manage Courses, Scheduler, Manage Schedules, Manage Bookings, Settings.
            - **Teacher:** Dashboard, My Schedule, Book Room, Preferences, Settings.
            - **Student:** Dashboard, My Schedule, Course Planner, Book Room.
- **Shared Pages:**
    - **Book Room (`src/pages/shared/BookRoom.jsx`):**
        - **Availability Check:** Users can search for available rooms by date, time slot, and room type.
        - **Visual Status:** Rooms are color-coded (Green: Available, Yellow: Pending, Red: Occupied).
        - **Booking Request:** Users can submit a booking request with a reason.
        - **My Requests:** Users can view the status of their submitted requests in a tabular format.
        - **Pending Logic:** Pending requests block the room from being booked by others until resolved by an Admin.
- **Public Pages:**
    - **Home (`src/pages/Home.jsx`):**
        - **Landing Page:** The main entry point for all users with enhanced UI (deep shadows, glassmorphism).
        - **Dynamic Semester:** Displays the current semester set by the Admin.
        - **Course List:** Publicly viewable list of offered courses for the current semester with smooth scrolling from the "View Schedule" button.
        - **Navigation:** "Get Started" redirects to Registration; Portal cards redirect to Login.
        - **Portals:** Quick access links to Student, Teacher, and Admin portals.
- **Authentication Pages:**
    - **Login (`src/pages/Login.jsx`):**
        - Handles user authentication.
        - Redirects users based on their role (Admin -> Settings, Teacher/Student -> Home).
        - Includes a "Back to Home" button.
    - **Register (`src/pages/Register.jsx`):**
        - **Student Only:** Registration is restricted to Students only. Teacher accounts are created by Admins.
        - **Email Verification:** Requires email verification (OTP) for `@northsouth.edu` emails before account creation.
        - **UI:** Clear messaging about student-only registration.
- **Admin Pages:**
    - **Dashboard (`src/pages/admin/Dashboard.jsx`):**
        - **Overview:** Provides a high-level view of the system status.
        - **Statistics:** Displays total counts for Teachers, Students, Courses, Rooms, and Scheduled Classes.
        - **Charts:** Visualizes weekly class distribution and top busiest rooms.
        - **System Settings:** Allows Admins to set the "Current Semester" (e.g., "Spring 2026") which dynamically updates the Home page.
        - **System Status:** Shows the current state of the scheduler.
    - **Settings (`src/pages/admin/Settings.jsx`):**
        - **Profile Management:** Update full name (stored in dedicated Admin table).
        - **Profile Picture:** Upload and update profile picture (stored locally).
        - **Security:** Change password.
        - **Read-Only Email:** Email field is locked to prevent unauthorized changes.
        - **Admin Creation:** Allows existing admins to create new admin accounts.
        - **RAG Management:** Trigger a full re-index of the vector database.
        - Displays success/error messages.
    - **Manage Courses (`src/pages/admin/ManageCourses.jsx`):**
        - Lists all courses with server-side pagination, search, and sorting.
        - **Features:**
            - **Pagination:** Efficiently handles large datasets with server-side pagination.
            - **Search & Sort:** Server-side search by code/title and stable sorting by any column.
            - **CSV Upload:** Bulk upload courses via CSV file with improved error handling.
            - **Manual Creation:** Add single courses manually via a modal form.
            - **Inline Editing:** Edit course details (Title, Type, Duration Mode) directly in the table.
            - **Delete:** Remove courses from the system.
            - **Bulk Delete:** Select multiple courses via checkboxes and delete them in one action.
            - **Duration Display:** Shows actual class time (`1h 30m` or `3h 10m`) instead of mode names.
            - **Duration Toggle:** Admin selects `STANDARD` or `EXTENDED` mode during edit/creation.
    - **Manage Teachers (`src/pages/admin/ManageTeachers.jsx`):**
        - Lists all teachers with server-side pagination, search, and sorting.
        - **Features:**
            - **Pagination:** Efficiently handles large datasets with server-side pagination.
            - **Search & Sort:** Server-side search by name/initial/email and stable sorting.
            - **CSV Upload:** Bulk upload teachers via CSV file.
            - **Manual Creation:** Add single teachers manually with Department and Faculty Type.
            - **Inline Editing:** Edit teacher details (Name, Email, Department, Faculty Type).
            - **Delete:** Remove teachers from the system.
            - **Bulk Delete:** Select multiple teachers via checkboxes and delete them in one action.
    - **Manage Rooms (`src/pages/admin/ManageRooms.jsx`):**
        - Lists all rooms with server-side pagination, search, and sorting.
        - **Features:**
            - **Pagination:** Efficiently handles large datasets with server-side pagination.
            - **Search & Sort:** Server-side search by room number and stable sorting by capacity/type.
            - **CSV Upload:** Bulk upload rooms via CSV file.
            - **Manual Creation:** Add rooms with capacity and type (THEORY/LAB).
            - **Inline Editing:** Edit room number, capacity, and type.
            - **Delete:** Remove rooms.
            - **Bulk Delete:** Select multiple rooms via checkboxes and delete them in one action.
    - **Manage Bookings (`src/pages/admin/ManageBookings.jsx`):**
        - **Overview:** Admin interface to review room booking requests.
        - **Features:**
            - **List View:** Displays all booking requests with status (Pending, Approved, Rejected).
            - **Search:** Filter requests by room number or reason.
            - **Actions:** Approve or Reject individual requests.
            - **Bulk Actions:** "Approve All Pending" and "Reject All Pending" buttons conveniently located in the header.
            - **Conflict Detection:** Backend prevents approving requests that conflict with existing bookings.
    - **Scheduler (`src/pages/admin/Scheduler.jsx`):**
        - **Auto-Schedule:** Button to trigger the backend auto-scheduling algorithm.
        - **Safety Check:** Prevents execution if Rooms, Teachers, or Courses are missing (count = 0).
        - **Visualization:**
            - **Grid Layout:** Columns (S, M, T, W, R, F, A) vs Rows (Time Slots 1-7).
            - **Room Filter:** Dropdown to view schedule for a specific room.
            - **Friday:** Visually grayed out to indicate it's off-limits.
            - **Extended Labs:** Rendered as blocks spanning 2 consecutive time slots (rowspan=2).
            - **Theory/Standard:** Rendered as single blocks.
    - **Manage Schedules (`src/pages/admin/ManageSchedules.jsx`):**
        - **List View:** Table listing all individual schedule entries.
        - **Columns:** SL, Course, Section, Faculty, Time (Day), Room, Availability.
        - **Availability:** Shows room capacity (e.g., "35 Seats").
        - **Sorting:** Global server-side sorting for all columns including Availability.
        - **Bulk Actions:** Delete multiple schedule entries at once.
    - **Admin Management:**
        - **Create Admin:** Existing admins can create new admin accounts.
        - **Security:** Randomly generates secure passwords for new admins.
        - **Notification:** Sends email notification (mock/SMTP) to the new admin with credentials.


- **Student Pages:**
    - **Dashboard (`src/pages/student/Dashboard.jsx`):**
        - **Personalized Welcome:** Displays user's name.
        - **Stat Cards:** Shows Enrolled Courses, Upcoming Classes, GPA, and Study Hours.
        - **Quick Actions:** Direct links to Book Room, My Schedule, and Course Planner.
        - **Schedule Preview:** List of today's classes with time, room, and type details.
    - **My Schedule (`src/pages/student/MySchedule.jsx`):**
        - **Calendar View:** Interactive weekly calendar displaying enrolled classes and approved bookings.
        - **Integration:** Syncs with Google Calendar.
    - **Settings (`src/pages/student/Settings.jsx`):**
        - **Profile Management:** Update full name, NSU ID, CGPA, and Course History.
        - **Profile Picture:** Upload and update profile picture.
        - **Security:** Change password.
    - **Teacher Pages:**
        - **Dashboard (`src/pages/teacher/Dashboard.jsx`):**
            - **Personalized Welcome:** Displays professor's name.
            - **Dynamic Stats:** Shows Total Courses (assigned), Office Hours (configured), Total Credits, and Pending Booking Requests. All data is fetched from the backend.
            - **Quick Actions:** Direct links to Book Room, My Schedule, and Preferences.
            - **Schedule Preview:** List of today's classes with student count and details.
        - **My Schedule (`src/pages/teacher/MySchedule.jsx`):**
            - **Calendar View:** Interactive weekly calendar using `react-big-calendar` with improved date visibility and Day view support.
            - **Events:** Displays assigned classes (recurring) and approved room bookings (one-time).
            - **Event Details:** Shows course code, title, room, and section.
            - **Google Calendar Sync:** One-click synchronization of the entire semester's schedule to the user's primary Google Calendar.
                - **Recurring Events:** Classes are synced as weekly recurring events for the semester duration (14 weeks).
                - **Room Bookings:** Approved one-time room bookings are also synced to the calendar.
                - **Smart Mapping:** Automatically calculates the next occurrence of class days.
                - **OAuth Integration:** Securely connects to Google via OAuth 2.0.
        - **Edit Profile (`src/pages/teacher/EditProfile.jsx`):**
            - **Profile Management:** Update full name, Research Interests, Projects, and Contact Details.
            - **Read-Only Fields:** Initial, Email, and Faculty Type are managed by Admins and cannot be edited by the teacher.
            - **Office Hours:** Manage weekly office hours.
        - **Preferences (`src/pages/teacher/Preferences.jsx`):**
            - **Course Selection:** Choose preferred courses and number of sections.
            - **Credit Validation:** Enforces minimum credit limits based on Faculty Type (12 for Permanent, 3 for Adjunct).
            - **Smart Navigation:** Redirects to Edit Profile if Faculty Type is not set.
        - **Settings (`src/pages/teacher/Settings.jsx`):**
            - **Profile Picture:** Upload and update profile picture.
            - **Security:** Change password.
### Shared Pages
- **Book Room (`src/pages/shared/BookRoom.jsx`):**
    - **Purpose:** Allows Teachers and Students to request room bookings for specific dates and times.
    - **Features:**
        - **Availability Check:** Users select a Date, Time Slot, and Room Type to see real-time availability.
        - **Grid View:** Visual representation of rooms (Green = Available, Red = Occupied).
        - **Conflict Detection:** Checks against both recurring Class Schedules and existing approved Bookings.
        - **Booking Request:** Users can click an available room to submit a booking request with a mandatory reason.
        - **Role Access:** Accessible to both Teachers and Students via their respective portals.

## Features
- PostgreSQL Database Integration
- **User Management:**
    - **User Model:** Stores user details including ID, email, password hash, role, active status, and creation timestamp.
    - **Admin Model:** Stores admin-specific profile data (e.g., Name, Profile Picture) linked to the User model.
    - **Roles:** Supports ADMIN, TEACHER, and STUDENT roles.
    - **Validation:** Enforces `@northsouth.edu` email domain for Students and Teachers.
    - **Security:**
        - **Password Hashing:** Uses `bcrypt` directly for secure password hashing.
        - **Session Management:** JWT-based authentication with role persistence and expiration checks.
        - `get_current_active_user`: Ensures user account is active.
        - `get_admin_user`: Restricts access to Admins.
        - `get_teacher_user`: Restricts access to Teachers.
        - `get_student_user`: Restricts access to Students.
- **Academic Management:**
    - **System Settings Model:** Stores global configurations like `current_semester`.
    - **Room Model:** Represents physical classrooms.
        - Attributes: `room_number`, `capacity`, `type` (THEORY/LAB).
    - **Course Model:** Represents academic courses.
        - Attributes: `code`, `title`, `credits`, `type` (THEORY/LAB).
        - **Duration Modes:**
            - `STANDARD`: 1 time slot (1 hour 30 mins).
            - `EXTENDED`: 2 consecutive time slots (3 hours 10 mins).
    - **Section Model:** Represents a specific offering of a course.
        - Linked to `Course` and `Teacher`.
        - Attributes: `section_number`.
    - **ClassSchedule Model:** Represents the time and room allocation.
        - Linked to `Section` and `Room`.
        - Attributes: `day`, `time_slot_id`, `is_friday_booking`.
        - **Constraint:** LAB courses cannot be assigned to THEORY rooms.
    - **Scheduling Constants:**
        - **Time Slots:**
            - Slot 1: 08:00 AM - 09:30 AM
            - Slot 2: 09:40 AM - 11:10 AM
            - Slot 3: 11:20 AM - 12:50 PM
            - Slot 4: 01:00 PM - 02:30 PM
            - Slot 5: 02:40 PM - 04:10 PM
            - Slot 6: 04:20 PM - 05:50 PM
            - Slot 7: 06:00 PM - 07:30 PM
        - **Special Labs:** `CSE115L`, `CSE215L`, `CSE225L` follow theory time slot system timings.
    - **CSV Import Logic:**
        - **Auto-Detection:**
            - If `Code` ends with 'L' -> Type: `LAB`.
                - If `Code` is in Special Labs -> Duration: `STANDARD` (1 slot).
                - Else -> Duration: `EXTENDED` (2 slots).
            - Else -> Type: `THEORY`, Duration: `STANDARD`.
    - **Scheduler Logic:**
        - **Schedule Matrix:** In-memory representation of room availability (`matrix[room_id][day][slot]`).
        - **Friday Blocking:** Fridays are hardcoded as blocked to prevent auto-scheduling.
        - **Scheduling Strategy:**
            - **Pass 1 (Extended Labs):**
                - Targets `LAB` courses with `EXTENDED` duration.
                - Finds 2 consecutive empty slots in `LAB` rooms.
                - Assigns once per week.
            - **Pass 2 (Standard Courses):**
                - Targets `THEORY` courses and `SPECIAL LABS` (`STANDARD` duration).
                - **Theory:** Fits into `THEORY` rooms.
                - **Special Labs:** Fits into `LAB` rooms.
                - **Pattern Matching:** Assigns to `ST` (Sun+Tue), `MW` (Mon+Wed), or `RA` (Thu+Sat) at the same time slot.
- **AI Chatbot (RAG):**
    - **Integration:** Uses Pinecone for vector storage and Mistral AI for embeddings and chat completion.
    - **Real-time Synchronization:**
        - **Automatic Updates:** Any creation, update, or deletion of Rooms, Courses, Teachers, or Schedules in the database triggers an immediate background update to the Vector Database.
        - **Auto-Scheduler Integration:** Running the auto-scheduler automatically indexes hundreds of new class schedules with detailed time and location info.
        - **Data Coverage:**
            - **Rooms:** Capacity, Type (Lab/Theory).
            - **Courses:** Code, Title, Credits, Type.
            - **Teachers:** Name, Initial, Email.
            - **Schedules:** Exact time, day, room, and teacher for every section.
    - **Functionality:**
        - Answers queries about university rules, schedules, and user profiles.
        - **System Prompts:**
            - Enforces university rules (e.g., "Friday is off", "Labs are 3 hours").
            - Context-aware responses based on user role.
    - **Privacy Filters:**
        - **Teacher View:** When a Teacher asks about a Student, sensitive fields like `CGPA` and `History` are redacted from the context before generating the answer.
        - **Student View:** Students can see full details of Teachers (e.g., Office Hours, Room).
    - **Course Planner:**
        - **Intent Detection:** Detects queries like "Plan my courses".
        - **Logic:**
            - Fetches all available sections from the database.
            - Feeds the user's constraints (e.g., "I want ST classes") and the section list to Mistral.
            - Mistral generates a conflict-free schedule suggestion.
- *Pending implementation*

## Project Structure
```
CSE327/
├── backend/                # FastAPI Backend
│   ├── core/               # Core Configuration (Database, etc.)
│   ├── models/             # Database Models
│   ├── schemas/            # Pydantic Schemas
│   ├── venv/               # Virtual Environment
│   └── requirements.txt    # Python Dependencies
├── frontend/               # React Frontend
└── README.md               # Project Documentation
```

## Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_database_name
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200 # 30 days
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/google/callback
PINECONE_API_KEY=your_pinecone_api_key
MISTRAL_API_KEY=your_mistral_api_key
```



## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   *Note: Ensure you have Node.js installed.*

### Running the Application
1. **Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

2. Open your browser and navigate to `http://127.0.0.1:8000/docs` to view the API documentation.

## Frontend Architecture
- **Authentication Flow:**
    - **Context:** `AuthContext` manages global user state and JWT storage.
        - **Session Persistence:** Automatically decodes JWT from `localStorage` on app load to restore user session.
        - **Token Expiration:** Checks if the token is expired and logs out if necessary.
    - **Login:** `Login.jsx` handles user credentials, stores the JWT, and redirects based on role.
    - **Protection:** `ProtectedRoute.jsx` wraps private routes, checking for valid tokens and user roles.
    - **Axios Interceptor:** Automatically attaches the `Authorization: Bearer <token>` header to all outgoing requests.

## API Endpoints
- **Authentication:**
    - **POST /register**: Register a new user (requires `@northsouth.edu` email for non-admins).
    - **POST /login**: Login to get a JWT access token (includes user role).
    - **Admin Seed:** On startup, a default admin user is created if not exists (`tanvir.chowdhury.us@gmail.com`).
- **Admin Management:**
    - **Admins:**
        - `POST /admin/create-admin`: Create a new Admin user.
            - **Password:** Randomly generated and sent via email to the new admin.
    - **Rooms:**
        - `POST /admin/rooms`: Create a new room.
        - `GET /admin/rooms`: List all rooms (supports `page`, `limit`, `search`, `sort_by`, `sort_order`).
        - `PUT /admin/rooms/{id}`: Update room details.
        - `DELETE /admin/rooms/{id}`: Delete a room.
        - `POST /admin/rooms/bulk-delete`: Delete multiple rooms by ID.
        - `POST /admin/upload-rooms`: Bulk upload rooms via CSV.
    - **Courses:**
        - `POST /admin/courses`: Create a new course manually.
        - `GET /admin/courses`: List all courses (supports `page`, `limit`, `search`, `sort_by`, `sort_order`).
        - `PUT /admin/courses/{id}`: Update course details.
        - `DELETE /admin/courses/{id}`: Delete a course.
        - `POST /admin/courses/bulk-delete`: Delete multiple courses by ID.
        - `POST /admin/upload-courses`: Bulk upload courses via CSV.
    - **Teachers:**
        - `POST /admin/teachers`: Create a new teacher manually (auto-creates User account).
        - `GET /admin/teachers`: List all teachers (supports `page`, `limit`, `search`, `sort_by`, `sort_order`).
        - `PUT /admin/teachers/{id}`: Update teacher details.
        - `DELETE /admin/teachers/{id}`: Delete a teacher and their User account.
        - `POST /admin/teachers/bulk-delete`: Delete multiple teachers by ID.
        - `POST /admin/upload-teachers`: Bulk upload teachers via CSV.
            - **Auto-Account Creation:** Creates a User account with email.
            - **Password:** `{Initial}@{EmailPrefix}` (e.g., `JD@jdoe`).
    - **Bookings:**
        - `POST /bookings/request`: Request a room booking.
            - **Validation:** Room must be empty (checked against `ClassSchedule`). `Reason` is mandatory.
            - **Status:** Defaults to `PENDING`.
        - `GET /bookings/my-requests`: View own booking requests.
        - `GET /bookings/admin/requests`: Admin view of all requests.
        - `PUT /bookings/admin/requests/{id}`: Admin Approve/Reject requests.
    - **Google Calendar Integration:**
        - `GET /google/login`: Redirects to Google OAuth2 login.
        - `POST /google/connect`: Connects account using the auth code.
        - `POST /google/sync`: Syncs schedule to Google Calendar.
            - **Extended Labs:** Creates 1 event (3h 10m).
            - **Standard Classes:** Creates recurring events (1h 30m).
    - **Profile & RAG:**
        - `GET /profile/student`: Get Student profile.
        - `PUT /profile/student`: Update Student profile (CGPA, NSU ID, etc.).
        - `GET /profile/teacher`: Get Teacher profile.
        - `PUT /profile/teacher`: Update Teacher profile (Office Hours, Publications, Research Interests, etc.).
        - `GET /profile/public/teacher/{id}`: Get public Teacher profile (No auth required).
        - `POST /profile/upload-picture`: Upload profile picture (All users).
        - **RAG Pipeline:**
            - Updates trigger a background task.
            - Generates embeddings using Mistral.
            - Upserts data to Pinecone with metadata (`user_id`, `role`).
    - **AI Chat:**
        - `POST /chat/message`: Send a message to the AI Assistant.
            - **Body:** `{"query": "your question here"}`
            - **Response:** `{"response": "AI generated answer"}`
            - **Features:** RAG-based answers, Privacy Filters, Course Planning.
    - **System Settings:**
        - `GET /settings/current_semester`: Get the current semester value.
        - `PUT /settings/current_semester`: Update the current semester value (Admin only).
- **GET /**: Root endpoint to verify the backend is running.

## Changelog (December 2025)
- **UI Overhaul:**
    - **Student Settings:** Completely redesigned with a modern gradient theme, profile cards, and improved form layouts.
    - **Teacher Settings:** Updated to match the new modern design language.
    - **Dashboard:** Student dashboard now displays real-time CGPA data fetched from the database.
    - **Navbar:** Added dynamic "Open Portal" button for logged-in users, replacing Login/Register links.
- **New Features:**
    - **Teacher Profiles:**
        - **Edit Profile:** Teachers can now manage their academic profile including Published Papers, Research Interests, Projects, Contact Details, and Office Hours via a dedicated page.
        - **Faculty Type:** Teachers can set their status as **Permanent** or **Adjunct** in the Edit Profile page.
        - **Preferences:** New page for teachers to select preferred courses and section counts, with validation based on Faculty Type (12 credits for Permanent, 3 for Adjunct).
        - **Public Profile:** Added a public-facing profile page for teachers (`/teacher/profile/:id`) accessible without login.
    - **Account Deletion:** Students can now permanently delete their accounts via the "Danger Zone" in settings. Requires confirmation.
- **Database & Backend:**
    - **Schema Updates:** Added `faculty_type` to `teachers` table and created `teacher_preferences` table.
    - **Schema Cleanup:** Removed `course_history` column from the `students` table and related API endpoints.
    - **Profile API:** Enhanced `DELETE /profile/student` endpoint for secure account removal.
    - **Scheduler Logic:** Updated to support day patterns (ST, MW, RA) for standard courses.
    - **Availability:** Added `availability` column to `ClassSchedule` table for easier querying.
    - **Email Service:** Implemented basic email service for admin notifications.
## Teacher Preferences Workflow Updates

### Backend Changes
- **`POST /profile/teacher/preferences`**: Now deletes **ALL** existing preferences for the teacher before saving the new ones. This ensures that if a teacher removes a course from their list, it is actually removed from the database. It also resets the status of all preferences to `pending` upon re-submission.
- **`POST /admin/preferences/reject-all`**: Now **deletes** all pending preferences from the database instead of just marking them as 'rejected'. This forces teachers to re-submit their choices.
- **`POST /admin/preferences/reject/{id}`**: Now **deletes** the specific preference request instead of marking it as 'rejected'.

### Frontend Changes
- **Teacher Portal (`Preferences.jsx`)**:
  - `handleSave` now updates the local state with the response from the server, ensuring the UI immediately reflects the new `pending` status.
  - `getStatusNote` logic updated to check if *any* preference is accepted or pending, rather than just checking the first one.

### Behavior
1. **Teacher Submits**: Old preferences are wiped. New ones are saved as `pending`.
2. **Admin Rejects**: The preference record is deleted. The teacher sees their list is empty (or missing that course) and must add it again.
3. **Admin Accepts**: The preference status becomes `accepted`.

---
**Updated as of Dec 25, 2025.**


## Teacher Preferences Approval Workflow

### Features
- Teachers submit course preferences (saved as requests with status 'pending').
- Admins see all requests in a new "Manage Preferences" page, with options to accept/reject all or individually.
- Teachers see the status of their preferences (Acceptance Pending, Accepted, Rejected).
- Only accepted preferences are used for auto-scheduling.

### Backend
- Added `status` column to `TeacherPreference` (pending, accepted, rejected).
- New endpoints in `api/admin_preferences.py`:
  - `GET /admin/preferences/requests`: List all pending requests.
  - `POST /admin/preferences/accept-all`: Accept all pending requests.
  - `POST /admin/preferences/reject-all`: Reject all pending requests.
  - `POST /admin/preferences/accept/{pref_id}`: Accept individual request.
  - `POST /admin/preferences/reject/{pref_id}`: Reject individual request.
- Teacher preference POST endpoint now saves as 'pending' and does not overwrite accepted ones.

### Frontend
- **Admin Portal:**
  - New page: `src/pages/admin/ManagePreferences.jsx` with tabular view, bulk and individual accept/reject buttons.
- **Teacher Portal:**
  - Preferences page shows status note (Acceptance Pending, Accepted, Rejected).

### Database
- Migration script: `add_status_column.py` adds `status` column to `teacher_preferences` table.

### Usage
- Teachers submit preferences as usual.
- Admins review and approve/reject requests in the Manage Preferences page.
- Teachers see the status of their requests.
- Only accepted preferences are used for scheduling.

---

**All code and endpoints are updated as of Dec 25, 2025.**
