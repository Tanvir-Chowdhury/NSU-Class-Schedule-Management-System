import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Calendar, Clock, AlertCircle, Plus, Search, CheckCircle, Trash2 } from 'lucide-react';

const CoursePlanner = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const { token } = useAuth();

  useEffect(() => {
    fetchEnrollments();
    fetchAvailableSections();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const res = await axios.get('http://localhost:8000/student/enrollments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrollments(res.data);
    } catch (error) {
      console.error("Failed to fetch enrollments");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSections = async () => {
    try {
      const res = await axios.get('http://localhost:8000/student/available-sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableSections(res.data);
    } catch (error) {
      console.error("Failed to fetch available sections");
    }
  };

  const handleEnroll = async (sectionId) => {
    try {
      await axios.post('http://localhost:8000/student/enroll', 
        { section_id: sectionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Enrolled successfully!' });
      fetchEnrollments();
      setIsAddModalOpen(false);
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to enroll.' });
    }
  };

  const handleDrop = async (enrollmentId) => {
    if (!window.confirm("Are you sure you want to drop this course?")) return;
    
    try {
      await axios.delete(`http://localhost:8000/student/enrollments/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Course dropped successfully!' });
      fetchEnrollments();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to drop course.' });
    }
  };

  const filteredSections = availableSections.filter(section => 
    section.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.course_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Planner</h1>
          <p className="text-slate-500">View your enrolled courses and class schedules.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      {/* Enrolled Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <BookOpen className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Enrolled Courses</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading courses...</div>
        ) : enrollments.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {enrollments.map(enrollment => (
              <div key={enrollment.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {enrollment.course_code}
                      </span>
                      <h3 className="font-semibold text-slate-900">{enrollment.course_title}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      Section {enrollment.section} • {enrollment.credits} Credits • {enrollment.teacher}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {enrollment.schedule.map((time, idx) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDrop(enrollment.id)}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No Courses Enrolled</h3>
            <p className="text-slate-500">You haven't enrolled in any courses for this semester yet.</p>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Add Course</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by course code or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {filteredSections.map(section => (
                <div key={section.id} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{section.course_code}</span>
                        <span className="text-slate-600">{section.course_title}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        Section {section.section_number} • {section.teacher}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.schedule.map((time, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(section.id)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              ))}
              {filteredSections.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No courses found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePlanner;
