import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Save, BookOpen, FileText, Briefcase, Phone, Clock, Plus, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TeacherEditProfile = () => {
  const [profileData, setProfileData] = useState({ 
    full_name: '', 
    initial: '',
    profile_picture: '',
    published_papers: '',
    research_interests: '',
    projects: '',
    contact_details: '',
    faculty_type: '',
    office_hours: []
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [meRes, teacherRes] = await Promise.all([
        axios.get('http://localhost:8000/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/profile/teacher', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setProfileData({
        full_name: meRes.data.full_name || '',
        initial: teacherRes.data.initial || '',
        profile_picture: meRes.data.profile_picture,
        published_papers: teacherRes.data.published_papers || '',
        research_interests: teacherRes.data.research_interests || '',
        projects: teacherRes.data.projects || '',
        contact_details: teacherRes.data.contact_details || '',
        faculty_type: teacherRes.data.faculty_type || '',
        office_hours: teacherRes.data.office_hours || []
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await axios.post('http://localhost:8000/profile/upload-picture', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchProfile();
      setStatus({ type: 'success', message: 'Profile picture updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setIsLoading(true);
    try {
      // Update basic info (name)
      await axios.put('http://localhost:8000/profile/me', { full_name: profileData.full_name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update teacher info
      await axios.put('http://localhost:8000/profile/teacher', {
        initial: profileData.initial,
        name: profileData.full_name,
        published_papers: profileData.published_papers,
        research_interests: profileData.research_interests,
        projects: profileData.projects,
        contact_details: profileData.contact_details,
        faculty_type: profileData.faculty_type,
        office_hours: profileData.office_hours
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const addOfficeHour = () => {
    setProfileData({
      ...profileData,
      office_hours: [...profileData.office_hours, { day: 'Sunday', start_time: '08:00 AM', end_time: '09:30 AM', course_id: null }]
    });
  };

  const removeOfficeHour = (index) => {
    const newHours = [...profileData.office_hours];
    newHours.splice(index, 1);
    setProfileData({ ...profileData, office_hours: newHours });
  };

  const updateOfficeHour = (index, field, value) => {
    const newHours = [...profileData.office_hours];
    newHours[index][field] = value;
    setProfileData({ ...profileData, office_hours: newHours });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-emerald-100 mt-2 max-w-xl">
            Update your academic profile, research interests, and office hours.
            This information will be publicly visible to students and visitors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-slate-50"></div>
            <div className="relative inline-block mb-4 mt-8">
              <div className="h-32 w-32 rounded-full bg-white p-1 shadow-xl mx-auto">
                <div className="h-full w-full rounded-full overflow-hidden bg-slate-100 border-2 border-slate-100">
                  {profileData.profile_picture ? (
                    <img src={profileData.profile_picture} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-full w-full p-6 text-slate-400" />
                  )}
                </div>
              </div>
              <label className="absolute bottom-1 right-1 p-2.5 bg-emerald-600 rounded-full text-white cursor-pointer hover:bg-emerald-700 transition-all shadow-lg hover:scale-110">
                <User className="h-4 w-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{profileData.full_name || 'Teacher'}</h2>
            <p className="text-slate-500 text-sm mb-6">{profileData.initial}</p>
            
            <div className="border-t border-slate-100 pt-6 text-left space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span>{profileData.published_papers ? 'Has Publications' : 'No Publications Listed'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span>{profileData.projects ? 'Active Projects' : 'No Projects Listed'}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-8 space-y-8">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            
            {status.message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {status.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                  <p className="text-sm font-medium">{status.message}</p>
                </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  Basic Information
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Initial</label>
                  <input
                    type="text"
                    value={profileData.initial}
                    onChange={(e) => setProfileData({ ...profileData, initial: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Faculty Type</label>
                  <select
                    value={profileData.faculty_type}
                    onChange={(e) => setProfileData({ ...profileData, faculty_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Select Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Adjunct">Adjunct</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Contact Details</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
                    <textarea
                        value={profileData.contact_details}
                        onChange={(e) => setProfileData({ ...profileData, contact_details: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px] transition-all"
                        placeholder="Phone, Room Number, Website, etc."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Academic Profile
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Research Interests</label>
                  <textarea
                    value={profileData.research_interests}
                    onChange={(e) => setProfileData({ ...profileData, research_interests: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[100px] transition-all"
                    placeholder="e.g. Artificial Intelligence, Machine Learning, Data Science"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Published Papers</label>
                  <textarea
                    value={profileData.published_papers}
                    onChange={(e) => setProfileData({ ...profileData, published_papers: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] transition-all"
                    placeholder="List your key publications here..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Projects</label>
                  <textarea
                    value={profileData.projects}
                    onChange={(e) => setProfileData({ ...profileData, projects: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[100px] transition-all"
                    placeholder="Current or past projects..."
                  />
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  Office Hours
                </h3>
                <button
                  type="button"
                  onClick={addOfficeHour}
                  className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Slot
                </button>
              </div>
              <div className="p-6 space-y-4">
                {profileData.office_hours.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No office hours added yet.</p>
                ) : (
                    profileData.office_hours.map((oh, index) => (
                        <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="w-full md:w-1/4 space-y-1">
                                <label className="text-xs font-medium text-slate-500">Day</label>
                                <select
                                    value={oh.day}
                                    onChange={(e) => updateOfficeHour(index, 'day', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                >
                                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-1/4 space-y-1">
                                <label className="text-xs font-medium text-slate-500">Start Time</label>
                                <input
                                    type="text"
                                    value={oh.start_time}
                                    onChange={(e) => updateOfficeHour(index, 'start_time', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    placeholder="08:00 AM"
                                />
                            </div>
                            <div className="w-full md:w-1/4 space-y-1">
                                <label className="text-xs font-medium text-slate-500">End Time</label>
                                <input
                                    type="text"
                                    value={oh.end_time}
                                    onChange={(e) => updateOfficeHour(index, 'end_time', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    placeholder="09:30 AM"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeOfficeHour(index)}
                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherEditProfile;