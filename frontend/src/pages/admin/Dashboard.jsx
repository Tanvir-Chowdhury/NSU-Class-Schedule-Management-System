import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  BookOpen, 
  MapPin, 
  Calendar, 
  Clock, 
  TrendingUp,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_teachers: 0,
    total_students: 0,
    total_courses: 0,
    total_rooms: 0,
    total_schedules: 0,
    classes_per_day: {},
    room_usage: []
  });
  const [currentSemester, setCurrentSemester] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          axios.get('http://localhost:8000/admin/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8000/settings/current_semester', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setStats(statsRes.data);
        setCurrentSemester(settingsRes.data.value);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put('http://localhost:8000/settings/current_semester', 
        { value: currentSemester, key: 'current_semester' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Semester updated successfully');
    } catch (error) {
      console.error('Failed to update semester', error);
      alert('Failed to update semester');
    } finally {
      setIsSaving(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? '-' : value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  );

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const maxClasses = Math.max(...Object.values(stats.classes_per_day || { a: 0 }), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome!</h1>
        <p className="text-slate-500">Overview of the academic scheduling system.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          title="Total Teachers" 
          value={stats.total_teachers} 
          icon={Users} 
          color="text-blue-600" 
          bgColor="bg-blue-50" 
        />
        <StatCard 
          title="Total Students" 
          value={stats.total_students} 
          icon={Users} 
          color="text-cyan-600" 
          bgColor="bg-cyan-50" 
        />
        <StatCard 
          title="Total Courses" 
          value={stats.total_courses} 
          icon={BookOpen} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
        />
        <StatCard 
          title="Total Rooms" 
          value={stats.total_rooms} 
          icon={MapPin} 
          color="text-purple-600" 
          bgColor="bg-purple-50" 
        />
        <StatCard 
          title="Scheduled Classes" 
          value={stats.total_schedules} 
          icon={Calendar} 
          color="text-amber-600" 
          bgColor="bg-amber-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Weekly Class Distribution
            </h3>
          </div>
          
          <div className="space-y-4">
            {days.map(day => {
              const count = stats.classes_per_day[day] || 0;
              const percentage = (count / maxClasses) * 100;
              
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-600">{day}</div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-slate-500">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Usage & Quick Actions */}
        <div className="space-y-6">
          {/* System Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-500" />
                Current Semester
              </h3>
            </div>
            <form onSubmit={handleUpdateSemester} className="space-y-4">
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentSemester}
                    onChange={(e) => setCurrentSemester(e.target.value)}
                    placeholder="e.g. Fall 2025"
                    className="flex-1 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 px-2"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This will be displayed on the home page and other public areas.
                </p>
              </div>
            </form>
          </div>


          {/* Quick Stats */}
          <div className="bg-indigo-600 p-6 rounded-xl shadow-sm text-white">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-indigo-200" />
              <h3 className="text-lg font-semibold">System Status</h3>
            </div>
            <p className="text-indigo-100 mb-6">
              The scheduling system is active. Auto-scheduler is ready to optimize class allocations.
            </p>
            <div className="flex gap-4 text-sm font-medium">
              <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <span className="block text-2xl font-bold">{stats.total_schedules > 0 ? 'Active' : 'Idle'}</span>
                <span className="text-indigo-200">Scheduler State</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
