import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  User, 
  Megaphone,
  Search,
  X
} from 'lucide-react';

const ManageNotifications = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'ALL', // ALL, ALL_TEACHERS, ALL_STUDENTS, SPECIFIC
    recipient_ids: []
  });

  // User Search State (for SPECIFIC type)
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  useEffect(() => {
    fetchNotifications();
  }, [pagination.page]);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery.trim() || formData.type !== 'SPECIFIC') {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await axios.get('http://localhost:8000/admin/users/search', {
          params: { q: userSearchQuery, limit: 10 },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSearchResults(response.data);
      } catch (error) {
        console.error("Search error", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, formData.type]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/notifications/admin/history', {
        params: { page: pagination.page, limit: pagination.limit },
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.items);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        ...formData,
        recipient_ids: selectedUsers.map(u => u.id)
      };

      await axios.post('http://localhost:8000/notifications/admin/send', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatus({ type: 'success', message: 'Notification sent successfully!' });
      setFormData({ title: '', message: '', type: 'ALL', recipient_ids: [] });
      setSelectedUsers([]);
      fetchNotifications();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to send notification.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleAddUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Notifications</h1>
        <p className="text-slate-500">Send announcements to students and teachers.</p>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-600" />
              Compose Notification
            </h2>
            
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Announcement Title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="ALL">Everyone (Teachers & Students)</option>
                  <option value="ALL_TEACHERS">All Teachers</option>
                  <option value="ALL_STUDENTS">All Students</option>
                  <option value="SPECIFIC">Specific Users</option>
                </select>
              </div>

              {formData.type === 'SPECIFIC' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                      placeholder="Search users..."
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    )}
                    
                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleAddUser(user)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-medium text-sm text-slate-900">{user.name}</div>
                              <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {user.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Users Chips */}
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <span key={user.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {user.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id)}
                          className="ml-1.5 text-indigo-600 hover:text-indigo-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {selectedUsers.length === 0 && (
                    <p className="text-xs text-amber-600">Please select at least one recipient.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Type your announcement here..."
                />
              </div>

              <button
                type="submit"
                disabled={isSending || (formData.type === 'SPECIFIC' && selectedUsers.length === 0)}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Notification
              </button>
            </form>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">Sent History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Recipients</th>
                    <th className="px-6 py-4">Message Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading history...
                      </td>
                    </tr>
                  ) : notifications.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <p>No notifications sent yet.</p>
                      </td>
                    </tr>
                  ) : (
                    notifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {new Date(notification.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-400 pl-6">
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {notification.title}
                        </td>
                        <td className="px-6 py-4">
                          {notification.type === 'SPECIFIC' ? (
                             <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {notification.recipient_count} Users
                                </span>
                                {notification.recipient_names?.length > 0 && (
                                  <span className="text-xs text-slate-500 max-w-[200px] truncate" title={notification.recipient_names.join(', ')}>
                                    {notification.recipient_names.join(', ')}
                                  </span>
                                )}
                             </div>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              notification.type === 'ALL' ? 'bg-purple-100 text-purple-800' :
                              notification.type === 'ALL_TEACHERS' ? 'bg-blue-100 text-blue-800' :
                              notification.type === 'ALL_STUDENTS' ? 'bg-green-100 text-green-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {notification.type === 'ALL' && <Users className="h-3 w-3 mr-1" />}
                              {notification.type === 'ALL_TEACHERS' && <User className="h-3 w-3 mr-1" />}
                              {notification.type === 'ALL_STUDENTS' && <User className="h-3 w-3 mr-1" />}
                              {notification.type.replace('ALL_', 'All ').replace('ALL', 'Everyone')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={notification.message}>
                          {notification.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageNotifications;
