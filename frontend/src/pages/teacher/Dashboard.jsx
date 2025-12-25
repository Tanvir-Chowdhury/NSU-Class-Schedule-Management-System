import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight,
  Sliders,
  BookOpen
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    total_courses: 0,
    office_hours: "0h",
    pending_bookings: 0,
    total_credits: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:8000/dashboard/teacher/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, [token]);

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, to, color, bgColor }) => (
    <Link to={to} className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1">
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-4">{description}</p>
      <div className={`flex items-center text-sm font-medium ${color}`}>
        Access Now <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome!</h1>
        <p className="text-slate-500 mt-1">Manage your classes, students, and schedule efficiently.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Courses" 
          value={stats.total_courses} 
          icon={BookOpen} 
          color="text-indigo-600" 
          bgColor="bg-indigo-50" 
        />
        <StatCard 
          title="Office Hours" 
          value={stats.office_hours} 
          icon={Clock} 
          color="text-orange-600" 
          bgColor="bg-orange-50" 
        />
        <StatCard 
          title="Total Credits" 
          value={stats.total_credits} 
          icon={Users} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
        />
        <StatCard 
          title="Pending Requests" 
          value={stats.pending_bookings} 
          icon={Calendar} 
          color="text-blue-600" 
          bgColor="bg-blue-50" 
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Book a Room"
            description="Reserve a room for extra classes or makeup sessions."
            icon={MapPin}
            to="/teacher/book-room"
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <QuickActionCard
            title="My Schedule"
            description="View your teaching schedule and office hours."
            icon={Calendar}
            to="/teacher/schedule"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <QuickActionCard
            title="Preferences"
            description="Update your availability and teaching preferences."
            icon={Sliders}
            to="/teacher/preferences"
            color="text-indigo-600"
            bgColor="bg-indigo-50"
          />
        </div>
      </div>

      {/* Today's Schedule Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
          <span className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { time: '09:40 AM - 11:10 AM', code: 'CSE327', title: 'Software Engineering', room: 'NAC514', type: 'Lecture', students: 35 },
            { time: '02:40 PM - 04:10 PM', code: 'CSE299', title: 'Junior Design', room: 'NAC601', type: 'Lab', students: 28 },
          ].map((cls, idx) => (
            <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-sm whitespace-nowrap">
                  {cls.time}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{cls.code} - {cls.title}</h4>
                  <p className="text-sm text-slate-500">{cls.type} • {cls.room} • {cls.students} Students</p>
                </div>
              </div>
              <div className="hidden sm:block">
                <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <Link to="/teacher/schedule" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View Full Schedule &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
