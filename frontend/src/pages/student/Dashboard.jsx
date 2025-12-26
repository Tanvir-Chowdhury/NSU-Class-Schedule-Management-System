import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  GraduationCap, 
  MapPin, 
  ArrowRight 
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    enrolled_courses: 0,
    upcoming_classes: 0,
    cgpa: 'N/A',
    total_credits: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:8000/dashboard/student/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch student stats", error);
      }
    };

    const fetchSchedule = async () => {
      try {
        const res = await axios.get('http://localhost:8000/dashboard/student/today', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodaySchedule(res.data);
      } catch (error) {
        console.error("Failed to fetch today's schedule", error);
      }
    };
    
    if (token) {
      fetchStats();
      fetchSchedule();
    }
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
        <p className="text-slate-500 mt-1">Here's what's happening with your academic schedule today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Enrolled Courses" 
          value={stats.enrolled_courses} 
          icon={BookOpen} 
          color="text-indigo-600" 
          bgColor="bg-indigo-50" 
        />
        <StatCard 
          title="Today's Classes" 
          value={stats.upcoming_classes} 
          icon={Clock} 
          color="text-orange-600" 
          bgColor="bg-orange-50" 
        />
        <StatCard 
          title="Current CGPA" 
          value={stats.cgpa} 
          icon={GraduationCap} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
        />
        <StatCard 
          title="Total Credits" 
          value={stats.total_credits} 
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
            description="Reserve a study room or discussion area for your group projects."
            icon={MapPin}
            to="/student/book-room"
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <QuickActionCard
            title="My Schedule"
            description="View your personalized class timetable and exam dates."
            icon={Calendar}
            to="/student/schedule"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <QuickActionCard
            title="Course Planner"
            description="Plan your upcoming semesters and track your degree progress."
            icon={BookOpen}
            to="/student/planner"
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
          {todaySchedule.length > 0 ? (
            todaySchedule.map((cls, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-sm whitespace-nowrap">
                    {cls.time}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{cls.code} - {cls.title}</h4>
                    <p className="text-sm text-slate-500">{cls.type} • {cls.room} • Section {cls.section}</p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cls.type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {cls.type}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              No classes scheduled for today.
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <Link to="/student/schedule" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View Full Schedule &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
