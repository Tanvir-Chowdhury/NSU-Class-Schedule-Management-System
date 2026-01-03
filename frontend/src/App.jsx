import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminSettings from './pages/admin/Settings';
import Dashboard from './pages/admin/Dashboard';
import ManageCourses from './pages/admin/ManageCourses';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageRooms from './pages/admin/ManageRooms';
import ManageSchedules from './pages/admin/ManageSchedules';
import ManagePreferences from './pages/admin/ManagePreferences';
import ManageBookings from './pages/admin/ManageBookings';
import ManageNotifications from './pages/admin/ManageNotifications';
import Notifications from './pages/shared/Notifications';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherSettings from './pages/teacher/Settings';
import TeacherPreferences from './pages/teacher/Preferences';
import TeacherEditProfile from './pages/teacher/EditProfile';
import TeacherSchedule from './pages/teacher/MySchedule';
import PublicTeacherProfile from './pages/public/TeacherProfile';
import StudentDashboard from './pages/student/Dashboard';
import StudentSettings from './pages/student/Settings';
import StudentSchedule from './pages/student/MySchedule';
import CoursePlanner from './pages/student/CoursePlanner';
import BookRoom from './pages/shared/BookRoom';
import GoogleCallback from './components/GoogleCallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import Teachers from './pages/Teachers';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ChatWidget />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/google/callback" element={<GoogleCallback />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <AdminSettings />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/courses" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageCourses />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/teachers" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageTeachers />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/rooms" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageRooms />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/schedules" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageSchedules />
              </Layout>
            </ProtectedRoute>
          } />

                    <Route path="/admin/preferences" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManagePreferences />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/notifications" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageNotifications />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/bookings" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageBookings />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/courses" element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout role="admin">
                <ManageCourses />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <TeacherDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/settings" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <TeacherSettings />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/preferences" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <TeacherPreferences />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/edit-profile" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <TeacherEditProfile />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Public Routes */}
          <Route path="/teacher/profile/:id" element={<PublicTeacherProfile />} />

          <Route path="/teacher/book-room" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <BookRoom />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/schedule" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <TeacherSchedule />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/notifications" element={
            <ProtectedRoute roles={['TEACHER']}>
              <Layout role="teacher">
                <Notifications />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <StudentDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/notifications" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <Notifications />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/settings" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <StudentSettings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/book-room" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <BookRoom />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/student/schedule" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <StudentSchedule />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/student/planner" element={
            <ProtectedRoute roles={['STUDENT']}>
              <Layout role="student">
                <CoursePlanner />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Catch all - Redirect to Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
