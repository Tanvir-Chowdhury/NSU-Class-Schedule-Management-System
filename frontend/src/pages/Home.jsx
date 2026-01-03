import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GraduationCap, Users, Settings, Search, ChevronLeft, ChevronRight, ArrowRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'day', direction: 'asc' });
  const [currentSemester, setCurrentSemester] = useState('Fall 2025');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  useEffect(() => {
    const fetchSemester = async () => {
      try {
        const response = await axios.get('http://localhost:8000/settings/current_semester');
        if (response.data && response.data.value) {
          setCurrentSemester(response.data.value);
        }
      } catch (error) {
        console.error('Failed to fetch semester', error);
      }
    };
    fetchSemester();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      };
      
      const response = await axios.get('http://localhost:8000/public/schedules', { params });
      setCourses(response.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Failed to fetch courses', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCourses();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, pagination.page, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getDayAbbreviation = (day) => {
    const map = {
      'Sunday': 'Su', 'Monday': 'Mo', 'Tuesday': 'Tu', 'Wednesday': 'We', 
      'Thursday': 'Th', 'Friday': 'Fr', 'Saturday': 'Sa',
      'ST': 'ST', 'MW': 'MW', 'RA': 'RA'
    };
    return map[day] || day;
  };

  const scrollToCourses = () => {
    const element = document.getElementById('course-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-700 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-50/30 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4"></div>
            <div className="absolute inset-0 bg-[url('src/assets/home.png')] bg-cover bg-center opacity-[0.08] mix-blend-multiply"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6 border border-indigo-100">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2"></span>
              {currentSemester} Semester
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              Class Schedule <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Management System
              </span>
            </h1>
            <p className="text-xl text-slate-700 mb-10 font-light leading-relaxed max-w-2xl">
              Making academic processes simpler for <span className="font-medium text-gray-900">North South University</span> by helping manage courses, schedules and resources easily and efficiently.
            </p>
            <div className="flex flex-wrap gap-4">
                <Link to="/register" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xl shadow-indigo-300 transition-all hover:-translate-y-0.5 flex items-center">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <button 
                    onClick={scrollToCourses}
                    className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-md transition-all hover:-translate-y-0.5">
                    View Schedule
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portals Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Student Portal */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/60 p-8 hover:shadow-2xl hover:shadow-indigo-200/60 transition-all duration-300 border border-white/20 ring-1 ring-slate-900/5 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">Student Portal</h3>
            <p className="text-slate-500 leading-relaxed mb-4">
              Manage course subscriptions, view personalized timetables, and locate study rooms instantly.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Access Portal <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {/* Teacher Portal */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/60 p-8 hover:shadow-2xl hover:shadow-indigo-200/60 transition-all duration-300 border border-white/20 ring-1 ring-slate-900/5 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">Teacher Portal</h3>
            <p className="text-slate-500 leading-relaxed mb-4">
              Optimize teaching schedules, manage office hours, and view student rosters efficiently.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Access Portal <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/60 p-8 hover:shadow-2xl hover:shadow-indigo-200/60 transition-all duration-300 border border-white/20 ring-1 ring-slate-900/5 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform duration-300">
              <Settings className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">Admin Portal</h3>
            <p className="text-slate-500 leading-relaxed mb-4">
              Automate class scheduling, manage room capacities, and oversee faculty assignments.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Access Portal <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Course List Section */}
      <div id="course-list" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grow">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Offered Course List</h2>
                <p className="text-slate-500">Browse available courses for {currentSemester}</p>
            </div>
            
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses, faculty, or rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-md"
              />
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] md:min-w-full">
              <thead className="bg-slate-50/50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-5 text-center w-16 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sl')}>
                    <div className="flex items-center justify-center gap-1">
                      SL
                      {sortConfig.key === 'sl' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('code')}>
                    <div className="flex items-center gap-1">
                      Course Code
                      {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sec')}>
                    <div className="flex items-center justify-center gap-1">
                      Section
                      {sortConfig.key === 'sec' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('faculty')}>
                    <div className="flex items-center justify-center gap-1">
                      Faculty
                      {sortConfig.key === 'faculty' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('time')}>
                    <div className="flex items-center gap-1">
                      Schedule
                      {sortConfig.key === 'time' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('room')}>
                    <div className="flex items-center gap-1">
                      Room
                      {sortConfig.key === 'room' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('seats')}>
                    <div className="flex items-center justify-center gap-1">
                      Availability
                      {sortConfig.key === 'seats' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="ml-2">Loading schedules...</span>
                      </div>
                    </td>
                  </tr>
                ) : courses.length > 0 ? (
                  courses.map((schedule, index) => (
                    <tr key={schedule.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 md:px-6 py-4 text-center text-slate-400 font-medium">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                          <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                              {schedule.section?.course?.code}
                          </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center text-slate-600 font-medium">
                        {schedule.section?.section_number}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                          <div className="inline-flex items-center justify-center h-8 w-12 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                              {schedule.section?.teacher?.initial || 'TBA'}
                          </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)} {getDayAbbreviation(schedule.day)}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-slate-600 font-medium">
                        {schedule.room?.room_number}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              schedule.availability > 0 
                              ? 'bg-green-50 text-green-700 border border-green-100' 
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                              {schedule.availability > 0 ? `${schedule.availability} Seats` : 'Full'}
                          </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No courses found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">
                {courses.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
              </span> to <span className="font-medium text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span> of <span className="font-medium text-slate-900">{pagination.total}</span> results
            </p>
            <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors shadow-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors shadow-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
