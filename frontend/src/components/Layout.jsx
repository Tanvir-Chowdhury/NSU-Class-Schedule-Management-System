import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  Bookmark, 
  Settings, 
  MapPin, 
  Sliders, 
  Menu, 
  X, 
  LogOut,
  ChevronRight,
  GraduationCap,
  User,
  ListChecks,
} from 'lucide-react';

const Layout = ({ children, role = 'student' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = {
    admin: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Manage Teachers', href: '/admin/teachers', icon: Users },
      { name: 'Manage Courses', href: '/admin/courses', icon: BookOpen },
      { name: 'Manage Rooms', href: '/admin/rooms', icon: MapPin },
      { name: 'Manage Preferences', href: '/admin/preferences', icon: ListChecks },
      { name: 'Manage Bookings', href: '/admin/bookings', icon: Bookmark },
      { name: 'Schedule', href: '/admin/scheduler', icon: Calendar },
      { name: 'Manage Schedules', href: '/admin/schedules', icon: Clock },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
    teacher: [
      { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
      { name: 'My Schedule', href: '/teacher/schedule', icon: Calendar },
      { name: 'Book Room', href: '/teacher/book-room', icon: MapPin },
      { name: 'Edit Profile', href: '/teacher/edit-profile', icon: User },
      { name: 'Preferences', href: '/teacher/preferences', icon: Sliders },
      { name: 'Settings', href: '/teacher/settings', icon: Settings },
    ],
    student: [
      { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
      { name: 'My Schedule', href: '/student/schedule', icon: Calendar },
      { name: 'Course Planner', href: '/student/planner', icon: BookOpen },
      { name: 'Book Room', href: '/student/book-room', icon: MapPin },
      { name: 'Settings', href: '/student/settings', icon: Settings },
    ]
  };

  const currentNav = navigation[role] || navigation.student;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <GraduationCap className="h-8 w-8 text-indigo-600 mr-2" />
            <span className="text-xl font-bold text-indigo-600">NSU CSMS</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {currentNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 flex-shrink-0 transition-colors
                    ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}
                  `} />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-indigo-600" />}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center p-3 rounded-lg bg-slate-50 border border-slate-100 mb-3">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {role.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.full_name || role.charAt(0).toUpperCase() + role.slice(1)}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold text-slate-900">NSU CSMS</span>
          <div className="w-6" /> {/* Spacer for centering if needed */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
