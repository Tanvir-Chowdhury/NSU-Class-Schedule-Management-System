import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Loader2, CheckCircle, AlertCircle, User, Lock, Save, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminSettings = () => {
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({ full_name: '', email: '', profile_picture: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    fetchProfile();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:8000/admin/admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (error) {
      console.error("Failed to fetch admins");
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      await axios.delete(`http://localhost:8000/admin/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Admin deleted successfully.' });
      fetchAdmins();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to delete admin.' });
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:8000/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData({ 
        full_name: res.data.full_name || '', 
        email: res.data.email,
        profile_picture: res.data.profile_picture
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
      const res = await axios.post('http://localhost:8000/profile/upload-picture', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      // Refresh profile to get new image url
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
      await axios.put('http://localhost:8000/profile/me', profileData, {
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

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setIsLoading(true);

    try {
      await axios.post('http://localhost:8000/admin/create-admin', 
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: `Admin ${email} created successfully.` });
      setEmail('');
      fetchAdmins();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to create admin.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
              <p className="text-sm text-slate-500">Update your personal information.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {profileData.profile_picture ? (
                  <img src={profileData.profile_picture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Profile Picture</h3>
              <p className="text-xs text-slate-500">JPG, GIF or PNG. Max size of 800K</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                disabled
                value={profileData.email}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            {profileStatus.message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                profileStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {profileStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {profileStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isProfileLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isProfileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              <p className="text-sm text-slate-500">Change your password.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {passwordStatus.message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                passwordStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {passwordStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {passwordStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPasswordLoading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isPasswordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Add Admin */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <UserPlus className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Add New Admin</h2>
                <p className="text-sm text-slate-500">Create a new administrator account.</p>
            </div>
        </div>

        <form onSubmit={handleAddAdmin} className="max-w-md space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="admin@example.com"
                />
                <p className="mt-1 text-xs text-slate-500">The initial password will be set to the email address.</p>
            </div>

            {status.message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                    status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                    {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {status.message}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Admin'}
            </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Existing Admins</h3>
          <div className="divide-y divide-slate-100">
            {admins.map(admin => (
              <div key={admin.id} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {admin.email[0].toUpperCase()}
                  </div>
                  <span className="text-slate-700 text-sm">{admin.email}</span>
                </div>
                {admin.email !== profileData.email && (
                  <button 
                    onClick={() => handleDeleteAdmin(admin.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
            {admins.length === 0 && (
              <p className="text-slate-500 text-sm py-2">No other admins found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
