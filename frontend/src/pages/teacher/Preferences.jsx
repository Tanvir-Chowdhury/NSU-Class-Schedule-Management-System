import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Save, AlertCircle, CheckCircle, Plus, Trash2, BookOpen, Info, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIME_SLOTS = [
  { id: 1, label: '08:00 AM - 09:30 AM', start: '08:00', end: '09:30' },
  { id: 2, label: '09:40 AM - 11:10 AM', start: '09:40', end: '11:10' },
  { id: 3, label: '11:20 AM - 12:50 PM', start: '11:20', end: '12:50' },
  { id: 4, label: '01:00 PM - 02:30 PM', start: '13:00', end: '14:30' },
  { id: 5, label: '02:40 PM - 04:10 PM', start: '14:40', end: '16:10' },
  { id: 6, label: '04:20 PM - 05:50 PM', start: '16:20', end: '17:50' },
  { id: 7, label: '06:00 PM - 07:30 PM', start: '18:00', end: '19:30' },
];

const DAYS = [
  { value: 'ST', label: 'ST (Sunday, Tuesday)' },
  { value: 'MW', label: 'MW (Monday, Wednesday)' },
  { value: 'RA', label: 'RA (Thursday, Saturday)' }
];

const TeacherPreferences = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [timingPreferences, setTimingPreferences] = useState([]);
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teacherRes, coursesRes, prefsRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:8000/profile/teacher', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/courses?limit=1000', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/profile/teacher/preferences', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/settings/teacher_preference_submission', {
            headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { value: 'true' } })) // Default to true if fails
      ]);

      console.log("Teacher Profile:", teacherRes.data); // Debug log
      setTeacher(teacherRes.data);
      setTimingPreferences(teacherRes.data.timing_preferences || []);
      setCourses(coursesRes.data.items);
      setPreferences(prefsRes.data.map(p => ({
        course_id: p.course_id,
        section_count: p.section_count,
        status: p.status
      })));
      setSubmissionEnabled(settingsRes.data.value === 'true');
    } catch (error) {
      console.error("Failed to fetch data", error);
      setStatus({ type: 'error', message: 'Failed to load data. Please try refreshing the page.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = () => {
    setPreferences([...preferences, { course_id: '', section_count: 1 }]);
  };

  const handleRemoveCourse = (index) => {
    const newPrefs = [...preferences];
    newPrefs.splice(index, 1);
    setPreferences(newPrefs);
  };

  const handleChange = (index, field, value) => {
    const newPrefs = [...preferences];
    newPrefs[index][field] = value;
    setPreferences(newPrefs);
  };

  const handleAddTiming = () => {
    setTimingPreferences([...timingPreferences, { day: 'ST', start_time: '08:00', end_time: '09:30' }]);
  };

  const handleRemoveTiming = (index) => {
    const newTimings = [...timingPreferences];
    newTimings.splice(index, 1);
    setTimingPreferences(newTimings);
  };

  const handleTimingChange = (index, field, value) => {
    const newTimings = [...timingPreferences];
    newTimings[index][field] = value;
    setTimingPreferences(newTimings);
  };

  const calculateTotalCredits = () => {
    return preferences.reduce((total, pref) => {
      const course = courses.find(c => c.id === parseInt(pref.course_id));
      return total + (course ? course.credits * parseInt(pref.section_count) : 0);
    }, 0);
  };

  const handleSave = async () => {
    setStatus({ type: '', message: '' });
    setSaving(true);

    try {
      // 1. Save Course Preferences
      const validPreferences = preferences.filter(p => p.course_id && p.section_count > 0);
      
      const prefsRes = await axios.post('http://localhost:8000/profile/teacher/preferences', validPreferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPreferences(prefsRes.data.map(p => ({
        course_id: p.course_id,
        section_count: p.section_count,
        status: p.status
      })));

      // 2. Save Timing Preferences
      await axios.put('http://localhost:8000/profile/teacher', {
        timing_preferences: timingPreferences
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatus({ type: 'success', message: 'All preferences saved successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusNote = () => {
    if (!preferences.length) return null;
    // Check if any preference is pending or accepted
    const hasPending = preferences.some(p => p.status === 'pending');
    const hasAccepted = preferences.some(p => p.status === 'accepted');
    
    if (hasAccepted) return <span className="text-green-600 font-semibold">Accepted</span>;
    if (hasPending) return <span className="text-yellow-600 font-semibold">Acceptance Pending</span>;
    
    // If we have preferences but none are pending/accepted, it might be a fresh state or rejected (if we kept them)
    // But since we delete rejected ones, this case is less likely unless we have mixed states.
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If loading failed or teacher data is missing, show error instead of "Profile Incomplete"
  if (!teacher) {
    return (
      <div className="space-y-8 pb-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Profile</h2>
          <p className="text-slate-600 mb-6">
            {status.message || "Could not load teacher profile. Please try again."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!teacher.faculty_type) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Incomplete</h2>
          <p className="text-slate-600 mb-6">
            Please set your <strong>Faculty Type</strong> (Permanent/Adjunct) in your profile settings before choosing course preferences.
          </p>
          <Link 
            to="/teacher/edit-profile" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Edit Profile
          </Link>
        </div>
      </div>
    );
  }

  const totalCredits = calculateTotalCredits();
  const minCredits = teacher.faculty_type === 'Permanent' ? 12 : 3;
  const isCreditValid = totalCredits >= minCredits;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Course Preferences</h1>
        <p className="text-slate-500 mt-2">Select the courses and number of sections you wish to teach.</p>
      </div>

      {/* Submission Disabled Warning */}
      {!submissionEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Preference Submission Disabled</h3>
            <p className="text-amber-800 mt-1">The administrator has currently disabled preference submissions. You can view your existing preferences but cannot make changes.</p>
          </div>
        </div>
      )}

      {/* Status Message */}
      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
          <p className="font-medium">{status.message}</p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900">Credit Requirements</h3>
          <p className="text-blue-700 mt-1">
            As a <strong>{teacher.faculty_type}</strong> faculty, you must select at least <strong>{minCredits} credits</strong>.
          </p>
          <p className="text-blue-600 mt-2 text-sm">
            Current Selection: <span className={`font-bold ${isCreditValid ? 'text-emerald-600' : 'text-red-600'}`}>{totalCredits} Credits</span>
          </p>
          <div className="mt-2">{getStatusNote()}</div>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Selected Courses
          </h3>
          <button
            onClick={handleAddCourse}
            disabled={!submissionEnabled}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </button>
        </div>

        <div className="p-6 space-y-4">
          {preferences.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No courses selected yet. Click "Add Course" to begin.</p>
            </div>
          ) : (
            preferences.map((pref, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Course</label>
                    <select
                      value={pref.course_id}
                      onChange={(e) => handleChange(index, 'course_id', e.target.value)}
                      disabled={!submissionEnabled}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Select a course...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.title} ({course.credits} Cr)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Number of Sections</label>
                    <input
                      type="number"
                      min="1"
                      value={pref.section_count}
                      onChange={(e) => handleChange(index, 'section_count', parseInt(e.target.value) || 0)}
                      disabled={!submissionEnabled}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCourse(index)}
                  disabled={!submissionEnabled}
                  className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timing Preferences Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Selected Timings
          </h3>
          <button
            onClick={handleAddTiming}
            disabled={!submissionEnabled}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Timing
          </button>
        </div>

        <div className="p-6 space-y-4">
          {timingPreferences.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No timing preferences added yet. Click "Add Timing" to begin.</p>
            </div>
          ) : (
            timingPreferences.map((timing, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Day Combination</label>
                    <select
                      value={timing.day}
                      onChange={(e) => handleTimingChange(index, 'day', e.target.value)}
                      disabled={!submissionEnabled}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {DAYS.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Time Slot</label>
                    <select
                      value={TIME_SLOTS.find(s => s.start === timing.start_time && s.end === timing.end_time)?.id || ''}
                      onChange={(e) => {
                        const slotId = parseInt(e.target.value);
                        const slot = TIME_SLOTS.find(s => s.id === slotId);
                        if (slot) {
                          const newTimings = [...timingPreferences];
                          newTimings[index].start_time = slot.start;
                          newTimings[index].end_time = slot.end;
                          setTimingPreferences(newTimings);
                        }
                      }}
                      disabled={!submissionEnabled}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Select a time slot...</option>
                      {TIME_SLOTS.map(slot => (
                        <option key={slot.id} value={slot.id}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveTiming(index)}
                  disabled={!submissionEnabled}
                  className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !isCreditValid || !submissionEnabled}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save All Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherPreferences;
