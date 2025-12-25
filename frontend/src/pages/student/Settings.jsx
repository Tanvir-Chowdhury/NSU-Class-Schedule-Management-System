import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Lock, Save, Camera, GraduationCap, BookOpen, Hash, Loader2, CheckCircle, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentSettings = () => {
  const [profileData, setProfileData] = useState({ 
    full_name: '', 
    email: '', 
    profile_picture: '',
    nsu_id: '',
    cgpa: ''
  });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [meRes, studentRes] = await Promise.all([
        axios.get('http://localhost:8000/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/profile/student', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setProfileData({
        full_name: meRes.data.full_name || '',
        email: meRes.data.email,
        profile_picture: meRes.data.profile_picture,
        nsu_id: studentRes.data.nsu_id || '',
        cgpa: studentRes.data.cgpa || ''
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
      setProfileStatus({ type: 'success', message: 'Profile picture updated.' });
    } catch (error) {
      setProfileStatus({ type: 'error', message: 'Failed to upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileStatus({ type: '', message: '' });
    setIsProfileLoading(true);
    try {
      // Update basic info (name)
      await axios.put('http://localhost:8000/profile/me', { full_name: profileData.full_name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update student info
      await axios.put('http://localhost:8000/profile/student', {
        nsu_id: profileData.nsu_id,
        cgpa: parseFloat(profileData.cgpa) || null,
        name: profileData.full_name // Sync name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfileStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setProfileStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      await axios.post('http://localhost:8000/profile/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordStatus({ type: 'success', message: 'Password changed successfully.' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to change password.' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'delete') return;
    
    setIsDeleting(true);
    try {
      await axios.delete('http://localhost:8000/profile/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to delete account", error);
      alert("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your personal information, academic details and security preferences. 
            Keep your profile updated.</p>
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
              <label className="absolute bottom-1 right-1 p-2.5 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 transition-all shadow-lg hover:scale-110">
                <Camera className="h-4 w-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{profileData.full_name || 'Student'}</h2>
            <p className="text-slate-500 text-sm mb-6">{profileData.email}</p>
            
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CGPA</p>
                <p className="text-lg font-bold text-indigo-600">{profileData.cgpa || 'N/A'}</p>
              </div>
              <div className="text-center border-l border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</p>
                <p className="text-lg font-bold text-slate-700">{profileData.nsu_id || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-8 space-y-8">
          {/* Profile Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Personal & Academic Info
              </h3>
            </div>

            <div className="p-6">
              {profileStatus.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
                  profileStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {profileStatus.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                  <p className="text-sm font-medium">{profileStatus.message}</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">NSU ID</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                          type="text"
                          value={profileData.nsu_id}
                          onChange={(e) => setProfileData({ ...profileData, nsu_id: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="e.g. 2012345"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">CGPA</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4.0"
                          value={profileData.cgpa}
                          onChange={(e) => setProfileData({ ...profileData, cgpa: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="e.g. 3.50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isProfileLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProfileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Password Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Security Settings
              </h3>
            </div>

            <div className="p-6">
              {passwordStatus.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
                  passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {passwordStatus.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                  <p className="text-sm font-medium">{passwordStatus.message}</p>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">New Password</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isPasswordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Danger Zone
              </h3>
            </div>
            <div className="p-6">
              <p className="text-red-700 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Account?</h3>
              <p className="text-slate-500">
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Type <span className="font-mono font-bold text-red-600">delete</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Type delete"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'delete' || isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSettings;
