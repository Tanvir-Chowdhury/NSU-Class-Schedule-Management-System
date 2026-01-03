# Class Schedule Management System

## Project Screenshots

### General
| Home Page |
|:---:|
| ![Home Page](screenshots/home_page.png) |

| Login Page |
|:---:|
| ![Login Page](screenshots/login_page.png) |

| Register Page |
|:---:|
| ![Register Page](screenshots/register_page.png) |

| AI Assistant |
|:---:|
| ![AI Assistant](screenshots/AI_assistant.png) |

### Admin Portal
| Dashboard |
|:---:|
| ![Admin Dashboard](screenshots/admin_portal/admin_dashboard.png) |

| Auto Schedule |
|:---:|
| ![Manage Schedules](screenshots/admin_portal/admin_auto_schedule.png) |

| Manage Teachers |
|:---:|
| ![Manage Teachers](screenshots/admin_portal/admin_manage_teacher.png) |

| Manage Courses |
|:---:|
| ![Manage Courses](screenshots/admin_portal/admin_manage_courses.png) |

| Manage Rooms |
|:---:|
| ![Manage Rooms](screenshots/admin_portal/admin_manage_rooms.png) |

| Manage Preferences |
|:---:|
| ![Manage Preferences](screenshots/admin_portal/admin_manage_preferences.png) |

| Manage Bookings |
|:---:|
| ![Manage Bookings](screenshots/admin_portal/admin_manage_bookings.png) |

| Manage Notifications |
|:---:|
| ![Manage Notifications](screenshots/admin_portal/admin_manage_notifications.png) |

### Teacher Portal
| Dashboard |
|:---:|
| ![Teacher Dashboard](screenshots/teacher_portal/teacher_dashboard.png) |

| My Schedule |
|:---:|
| ![Teacher Schedule](screenshots/teacher_portal/teacher_my_schedule.png) |

| Preferences |
|:---:|
| ![Teacher Preferences](screenshots/teacher_portal/teacher_preferences.png) |

| Book Room |
|:---:|
| ![Teacher Book Room](screenshots/teacher_portal/teacher_book_room.png) |

| Notifications |
|:---:|
| ![Teacher Notifications](screenshots/teacher_portal/teacher_notification.png) |

### Student Portal
| Dashboard |
|:---:|
| ![Student Dashboard](screenshots/student_portal/student_dashboard.png) |

| Course Planner |
|:---:|
| ![Student Course Planner](screenshots/student_portal/student_course_planner.png) |

| My Schedule |
|:---:|
| ![Student Schedule](screenshots/student_portal/student_my_schedule.png) |

| Book Room |
|:---:|
| ![Student Book Room](screenshots/student_portal/student_book_room.png) |

| Notifications |
|:---:|
| ![Student Notifications](screenshots/student_portal/student_notifications.png) |


## Project Overview
This project is a Class Schedule Management System designed to help manage and organize academic schedules. It leverages a modern tech stack including AI capabilities for enhanced functionality.

## Key Features

### 1. Intelligent Auto-Scheduling
The core of the system is a sophisticated auto-scheduling algorithm that optimizes resource allocation:
- **Round-Robin Allocation:** Distributes courses fairly among teachers based on their preferences, preventing one teacher from getting all prime slots.
- **Sibling Section Linking:** Automatically attempts to schedule the Lab section immediately after the Theory section for the same teacher, ensuring continuity.
- **Teacher Preference Integration:** Prioritizes teacher's preferred time slots and ensures they are assigned to the courses they requested.
- **Strict Constraint Enforcement:** Adheres to strict academic rules (Theory on ST/MW/RA, Labs on single days, specific Lab time slots).
- **Conflict Resolution:** Automatically handles "TBA" assignments for unassigned sections and falls back to random valid slots if preferences cannot be met.

### 2. Comprehensive Admin Management
- **Unified Scheduling Interface:** A consolidated "Manage Schedules" page that offers:
    - **Smart Form Logic:** New "Add/Edit Schedule" forms with cascading dropdowns (Course -> Section -> Faculty) to prevent errors.
    - **Dynamic Filtering:** Automatically filters "Day" and "Time Slot" options based on the course type (e.g., only showing Lab slots for Lab courses).
    - **Constraint Enforcement:** Strict validation ensures Theory courses are on ST/MW/RA days and Labs are on single days with valid extended time slots (1, 3, 5).
    - **Teacher Reassignment:** Allows admins to reassign teachers directly while editing a schedule, with real-time conflict detection.
    - **Auto-Schedule Trigger:** Run the complex scheduling algorithm with one click.
    - **Table View:** A detailed grid view (Time Slots x Days) for managing schedules.
    - **Advanced Sorting:** Supports multi-column sorting (Shift+Click) for complex data analysis.
    - **Data Export:** One-click PDF and CSV export for Teachers, Courses, Rooms, and Schedules.
- **Preference Management:**
    - **Approval Workflow:** Teachers submit preferences which enter a "Pending" state. Admins can review, accept, or reject them individually or in bulk. Only accepted preferences are fed into the auto-scheduler.
- **Resource Management:** Full CRUD capabilities for Rooms, Courses, and Teachers with bulk upload (CSV) and bulk delete options.
- **Teacher Assignment Overview:** Real-time tracking of faculty assignments and workload with instant client-side sorting.
- **Notification System:**
    - **Broadcast & Targeted Messaging:** Admins can send announcements to "All Users", "All Teachers", "All Students", or specific individuals.
    - **User Search:** When targeting specific users, admins can search across both Student and Teacher databases by name, email, or ID.
    - **History Log:** A complete history of sent notifications is maintained for administrative review.
    - **Auto-Notifications:** The system automatically notifies teachers when the auto-scheduler assigns them new courses, providing a detailed list of their classes, rooms, and times.

### 3. AI-Powered Assistant (RAG)
- **Context-Aware Chatbot:** A floating AI assistant available throughout the portal that answers queries about schedules, rules, and user data.
- **Persistent Chat History:** Chat sessions are now saved to the database, allowing users to view their previous conversations with the AI assistant.
- **Real-Time Synchronization:** Any change in the database (Create/Update/Delete) is instantly reflected in the Pinecone vector database.
- **Optimized Data Structure:** All data is stored as structured JSON objects in the vector database, enabling the AI to parse and understand complex relationships (e.g., Teacher-Course-Room mappings) more effectively.
- **Rich Context Descriptions:** Every vector embedding (Rooms, Teachers, Courses, Schedules, Bookings) now includes a natural language `description` field. This ensures the AI understands the full context (e.g., "Office hours for Teacher X are on Monday...") and reduces "I don't know" responses.
- **Enhanced Teacher Profiles:** The vector database indexes comprehensive teacher profiles, including email, faculty type, research interests, published papers, and office hours.
- **Office Hours & Bookings:** The AI has access to teacher office hours and room booking requests, enabling it to answer questions like "When is Professor X available?" or "What is the status of my room booking?".
- **Performance Optimization:** Implemented bulk indexing strategies to handle large datasets efficiently.
- **Asynchronous Processing:** Vectorization and database upserts are handled in background tasks.
- **Privacy Filters:** Automatically redacts sensitive information (like CGPA) based on the user's role.

### 4. Student & Teacher Portals
- **Shared Features:**
    - **Notification Center:** A dedicated page for viewing announcements.
    - **Real-Time Alerts:** A blinking red badge on the sidebar indicates unseen notifications.
    - **Read Status:** Users can mark notifications as read, updating the badge count instantly.
- **Student Features:**
    - **Course Planner:** Interactive tool to plan semesters, check for conflicts, and manage course loads.
    - **My Schedule:** Personalized schedule view showing enrolled courses.
- **Teacher Features:**
    - **Dashboard:** Overview of assigned courses, total credits, and office hours.
    - **My Schedule:** Personalized schedule view showing assigned classes. Strictly filtered to show only courses where the user is the assigned instructor.
    - **Profile Management:** Manage research interests, office hours, and public profile details.
    - **Contact Info:** "Mail" icons in schedule views allow quick email communication with students or admins via `mailto:` links.
    - **Faculty Types:** Support for Permanent and Adjunct faculty roles.

### 5. Google Calendar Integration
- **Seamless Sync:** One-click synchronization of the entire semester's schedule to the user's primary Google Calendar.
- **Smart Event Creation:**
    - **Recurring Events:** Classes are synced as weekly recurring events for the full semester duration (14 weeks).
    - **Accurate Timing:** Logic correctly handles day patterns (e.g., ST, MW) to ensure events appear on the correct days of the week.
    - **Room Bookings:** Approved one-time room bookings are also synced.
    - **OAuth 2.0:** Secure connection using standard Google authentication.
- **Advanced Sync Features:**
    - **Account Selection:** Forces the Google Account Chooser every time, ensuring users can explicitly select which account to sync with (Personal vs. Institutional).
    - **Clean & Sync:** Automatically detects if the user was previously connected to a different account. It clears all old "NSU Scheduler" events from the previous account before syncing to the new one, preventing duplicates and data leakage.
    - **Event Tagging:** All events are tagged with `[NSU_Scheduler]` in the description for easy identification and automated cleanup.

## Tech Stack
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **Vector Database:** Pinecone
- **LLM:** Mistral AI
- **Frontend:** React with Tailwind CSS

## Auto Scheduler Architecture
The system features a sophisticated **Heuristic Scoring & Rescue Scheduler** (`backend/services/cp_sat_scheduler.py`) that balances teacher preferences, workload distribution, and academic constraints.

### Algorithm Overview
1.  **Priority-Based Candidate Selection:**
    *   **Preferred (PREF):** Teachers who explicitly requested a course via the preference system are prioritized.
    *   **Rescue (RESCUE):** If no preferences exist or are valid, the system identifies "Rescue" candidates—teachers in the same department with **zero or low load** (< 2 sections). This ensures no teacher is left without classes.
    *   **Fallback (FALLBACK):** If needed, other departmental teachers with available capacity are considered.
    *   **TBA:** As a last resort, sections are assigned to "TBA" with a massive scoring penalty.

2.  **Intelligent Scoring System:**
    *   Every potential schedule assignment is given a **Quality Score** (Base: 100).
    *   **Penalties:** Points are deducted for mismatches in preferred days (-25), preferred time slots (-10), or using fallback candidates.
    *   **Bonuses:** Points are added for "Perfect Matches" (e.g., correct floor for the department).
    *   **Greedy Optimization:** The algorithm immediately accepts a "Perfect Score" (100+) to speed up processing, otherwise it searches for the highest-scoring valid option.

3.  **Advanced Constraint Enforcement:**
    *   **Adjunct Constraints:** Adjunct faculty are *strictly* limited to their preferred days.
    *   **Building Zoning:** Automatically attempts to place departments in their designated buildings (e.g., CSE/EEE in SAC, BBA/ENG in NAC).
    *   **Lab Logic:**
        *   **Extended Labs (3h):** Restricted to start at slots 1, 3, or 5 (08:00, 11:20, 02:40) to align with standard blocks.
        *   **Standard Labs (1.5h):** Can be scheduled in any valid slot.
    *   **Pattern Balancing:** Dynamically tracks usage of Theory patterns (ST, MW, RA) to ensure an even distribution of classes across the week.
    *   **Validation:** Checks `is_slot_valid` for:
        *   Room availability.
        *   Teacher availability.
        *   **Sibling Conflict:** Ensures a Theory section doesn't overlap with its corresponding Lab section (and vice versa).



4.  **Sibling Consistency:**
    *   **Linked Scheduling:** Immediately after scheduling a section (e.g., Theory), the algorithm attempts to schedule its "sibling" section (e.g., Lab) with the *same teacher*. This guarantees that faculty members keep their Theory and Lab sections together.

5.  **TBA Fallback:**
    *   **Cleanup:** Any sections that couldn't be assigned to a specific teacher (due to conflicts or lack of preferences) are processed in a final pass.
    *   **Assignment:** These are scheduled into any remaining valid slots with `Teacher: TBA` to ensure the class is offered even without an assigned instructor.
        *   Iterate through all sections with `STANDARD` duration mode.
        *   Filter for rooms of type `THEORY`.
        *   **Department Logic:** ECE courses are prioritized for SAC rooms; others for NAC.
        *   **Optimization:** Sort rooms by floor level (ascending) to fill lower floors first.
        *   **Pattern Matching:** Theory courses follow specific day patterns (e.g., ST = Sunday/Tuesday, MW = Monday/Wednesday).
        *   **Teacher Preferences:** Prioritize teacher's preferred time slots.
        *   **Conflict Check:** Ensure the room is free and the teacher is free on *both* days of the pattern.
        *   **Assignment:** Lock the room and teacher for the selected time slot on both days.

5.  **Result:**
    *   A conflict-free schedule where rooms are utilized efficiently, teachers are assigned based on preference, and course requirements (Lab vs Theory) are met.

## Frontend Architecture
### Components
- **Chat Widget (`src/components/ChatWidget.jsx`):**
    - **Floating AI Assistant:** A collapsible chat window accessible from the bottom-right corner.
    - **Context Aware:** Only visible to logged-in users.
    - **Rich Formatting:** Uses `react-markdown` and `remark-gfm` to render tables, lists, and bold text.
    - **Features:** Quick chips for common queries, typing indicators, and integration with the RAG-powered backend.
- **Calendar View (`src/components/CalendarView.jsx`):**
    - **Custom Grid Layout:** A specialized table view that renders the weekly schedule.
    - **Time Slot Mapping:** Rows correspond to standard university time slots (1-7), and columns represent days (Sunday-Saturday).
    - **Smart Rendering:** Handles complex day patterns (e.g., a class on "ST" appears on both Sunday and Tuesday) and extended lab sessions (spanning multiple rows).
    - **Role-Based Display:** Used by both Students and Teachers to view their respective schedules.
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
        - **Notification Badge:** A real-time blinking red badge on the "Notifications" link indicating unread messages.
        - **User Identity:** Displays the logged-in user's full name and role in the sidebar footer.
        - **Responsive Design:** Collapsible sidebar for mobile devices with a hamburger menu.
        - **Role-Based Links:**
            - **Admin:** Dashboard, Manage Teachers, Manage Courses, Scheduler, Manage Schedules, Manage Bookings, Settings.
            - **Teacher:** Dashboard, Notifications, My Schedule, Book Room, Preferences, Settings.
            - **Student:** Dashboard, Notifications, My Schedule, Course Planner, Book Room.
- **Shared Pages:**
    - **Notifications (`src/pages/shared/Notifications.jsx`):**
        - **Central Hub:** Displays a list of all notifications for the user.
        - **Read Status:** Visual distinction between read (gray) and unread (white) notifications.
        - **Actions:** Users can mark individual notifications as read or "Mark All as Read".
        - **Empty State:** Friendly UI when there are no notifications.
    - **Book Room (`src/pages/shared/BookRoom.jsx`):**
        - **Availability Check:** Users can search for available rooms by date, time slot, and room type.
        - **Visual Status:** Rooms are color-coded (Green: Available, Yellow: Pending, Red: Occupied).
        - **Booking Request:** Users can submit a booking request with a reason.
        - **My Requests:** Users can view the status of their submitted requests in a tabular format.
        - **Pending Logic:** Pending requests block the room from being booked by others until resolved by an Admin.
- **Public Pages:**
    - **Faculty Members (`src/pages/Teachers.jsx`):**
        - **Public Directory:** A searchable and filterable list of all faculty members.
        - **Advanced Filtering:** Users can filter by Department and Faculty Type (Permanent/Adjunct).
        - **Search:** Real-time search by Name or Initial.
        - **Detailed Profiles:** Clicking on a teacher opens a detailed view with their research interests, publications, and contact info.
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
        - **Smart Display:** Automatically merges consecutive time slots for Extended Labs into a single row (e.g., "08:00 AM - 11:10 AM") for cleaner visualization.
        - **Manual Scheduling:**
            - **Conflict Detection:** Prevents double-booking of Rooms, Sections, and Teachers.
            - **Extended Labs:** Automatically books two consecutive slots when scheduling an Extended Lab.
        - **PDF Export:**
            - **Custom Header:** Includes the current semester name (e.g., "Class Schedules - Fall 2025") fetched from system settings.
            - **Optimized Sorting:** Schedules are automatically sorted by Course Code (ASC) and then Section Number (ASC) for better readability.
            - **Clean Layout:** Excludes internal IDs and focuses on relevant details (Course, Section, Teacher, Room, Day, Time).
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
        - **Google Calendar Sync:** One-click synchronization of the entire semester's schedule to the user's primary Google Calendar.
            - **Recurring Events:** Classes are synced as weekly recurring events for the semester duration.
            - **Pattern Support:** Correctly handles multi-day patterns (e.g., ST = Sunday & Tuesday) by creating recurring events on both days.
            - **Room Bookings:** Approved one-time room bookings are also synced.
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
                - **Pattern Support:** Correctly handles multi-day patterns (e.g., ST = Sunday & Tuesday) by creating recurring events on both days.
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
        - **Lab Time Slots (Merged):**
            - Slot L1 (1+2): 08:00 AM - 11:10 AM
            - Slot L2 (3+4): 11:20 AM - 02:30 PM
            - Slot L3 (5+6): 02:40 PM - 05:50 PM
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
                - **Slot Logic:** Uses predefined merged slots (1+2, 3+4, 5+6) to ensure labs fit into 3h 10m blocks.
                - **Conflict Check:** Ensures no overlap with existing schedules and respects teacher availability.
                - Assigns once per week.
            - **Pass 2 (Standard Courses):**
                - Targets `THEORY` courses and `SPECIAL LABS` (`STANDARD` duration).
                - **Theory:** Fits into `THEORY` rooms.
                - **Special Labs:** Fits into `LAB` rooms.
                - **Pattern Matching:** Assigns to `ST` (Sun+Tue), `MW` (Mon+Wed), or `RA` (Thu+Sat) at the same time slot.
                - **Sibling Conflict Check:** Prevents scheduling a Theory course (e.g., CSE115) at the same time as its corresponding Lab (e.g., CSE115L) to avoid student conflicts.
- **AI Chatbot (RAG):**
    - **Integration:** Uses Pinecone for vector storage and Mistral AI for embeddings and chat completion.
    - **Real-time Synchronization:**
        - **Automatic Updates:** Any creation, update, or deletion of Rooms, Courses, Teachers, or Schedules in the database triggers an immediate background update to the Vector Database.
        - **Auto-Scheduler Integration:** Running the auto-scheduler automatically indexes hundreds of new class schedules with detailed time and location info.
        - **Data Coverage:**
            - **Rooms:** Capacity, Type (Lab/Theory), Description.
            - **Courses:** Code, Title, Credits, Type, Description.
            - **Teachers:** Name, Initial, Email, Office Hours, Research Interests, Description.
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
- **Notification System:**
    - **Architecture:** Polling-based architecture (30s interval) to ensure real-time delivery without WebSocket complexity.
    - **Targeting:** Supports broadcasting to all users, specific roles (Teachers/Students), or individual users.
    - **Triggers:**
        - **Manual:** Admins can send custom announcements.
        - **Automated:** The Auto-Scheduler triggers notifications to teachers upon schedule generation.
    - **User Experience:**
        - **Visual Cues:** Blinking red badge on the sidebar.
        - **Management:** Dedicated page to view and mark notifications as read.

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
    - **Notifications:**
        - `GET /notifications`: Get all notifications for the current user.
        - `GET /notifications/unread-count`: Get the count of unread notifications.
        - `PUT /notifications/{id}/read`: Mark a specific notification as read.
        - `PUT /notifications/read-all`: Mark all notifications as read.
        - `POST /admin/notifications/broadcast`: Send a notification to all users or specific roles.
        - `POST /admin/notifications/send`: Send a notification to specific users.
        - `GET /admin/users/search`: Search for users (Teachers/Students) to target notifications.
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
            - **Trigger:** Updates are triggered automatically on CRUD operations.
            - **Execution:** Runs asynchronously as a FastAPI Background Task to prevent blocking.
            - **Data Format:** Converts entity objects (Rooms, Teachers, etc.) into structured JSON strings with rich natural language descriptions before embedding.
            - **Process:** Generates embeddings using Mistral and upserts to Pinecone with rich metadata.
    - **AI Chat:**
        - `POST /chat/message`: Send a message to the AI Assistant.
            - **Body:** `{"query": "your question here"}`
            - **Response:** `{"response": "AI generated answer"}`
            - **Features:** RAG-based answers, Privacy Filters, Course Planning.
    - **System Settings:**
        - `GET /settings/current_semester`: Get the current semester value.
        - `PUT /settings/current_semester`: Update the current semester value (Admin only).
- **GET /**: Root endpoint to verify the backend is running.


