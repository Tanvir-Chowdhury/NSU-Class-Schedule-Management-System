import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Search, CheckCircle, XCircle, MessageSquare, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

const ManagePreferences = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState([]);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [submissionEnabled, setSubmissionEnabled] = useState(true);

  useEffect(() => {
    fetchPreferences();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:8000/settings/teacher_preference_submission', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissionEnabled(res.data.value === 'true');
    } catch (error) {
      // If not found, default to true
      setSubmissionEnabled(true);
    }
  };

  const toggleSubmission = async () => {
    const newValue = !submissionEnabled;
    try {
      await axios.put('http://localhost:8000/settings/teacher_preference_submission', { value: String(newValue) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissionEnabled(newValue);
    } catch (error) {
      setStatus('Failed to update setting');
    }
  };

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/admin/preferences/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(res.data);
    } catch (error) {
      setStatus('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async (action) => {
    setStatus('');
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/admin/preferences/${action}-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPreferences();
    } catch (error) {
      setStatus('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSingle = async (id, action) => {
    setStatus('');
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/admin/preferences/${action}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPreferences();
    } catch (error) {
      setStatus('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredPreferences = preferences.filter(pref => {
    const teacher = pref.teacher || {};
    const course = pref.course || {};
    return (
      teacher.initial?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredPreferences.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action) => {
    setStatus('');
    setLoading(true);
    try {
      if (selectedIds.length === 0) return;
      await Promise.all(selectedIds.map(id => axios.post(`http://localhost:8000/admin/preferences/${action}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })));
      setSelectedIds([]);
      fetchPreferences();
    } catch (error) {
      setStatus('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Preferences</h1>
            <p className="text-slate-500">Review and approve/reject teacher course preferences.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">Submissions:</span>
              <button onClick={toggleSubmission} className="focus:outline-none transition-colors">
                {submissionEnabled ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <ToggleRight className="h-6 w-6" />
                    <span className="text-xs font-bold">ON</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400">
                    <ToggleLeft className="h-6 w-6" />
                    <span className="text-xs font-bold">OFF</span>
                  </div>
                )}
              </button>
            </div>
            <div className="flex gap-3">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction('accept')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Accept Selected ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject Selected ({selectedIds.length})
                </button>
              </>
            )}
            <button
              onClick={() => handleBulk('accept')}
              className="inline-flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors shadow-sm border border-green-200"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Accept All
            </button>
            <button
              onClick={() => handleBulk('reject')}
              className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors shadow-sm border border-red-200"
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject All
            </button>
          </div>
          </div>
        </div>
        {status && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            status.includes('success') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {status.includes('success') ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {status}
          </div>
        )}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by teacher or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredPreferences.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">Initial</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Courses</th>
                  <th className="px-6 py-4">Sections</th>
                  <th className="px-6 py-4">Credits</th>
                  <th className="px-6 py-4 text-center">Contact</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading preferences...
                    </td>
                  </tr>
                ) : filteredPreferences.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                              <MessageSquare className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-900">No preference requests found</p>
                          <p className="text-sm mt-1">
                            {searchQuery ? 'Try adjusting your search terms.' : 'No requests to review.'}
                          </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPreferences.map((pref) => (
                    <tr key={pref.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.includes(pref.id)}
                          onChange={() => handleSelectOne(pref.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{pref.teacher?.initial || '-'}</td>
                      <td className="px-6 py-4">{pref.teacher?.name || '-'}</td>
                      <td className="px-6 py-4">{pref.course?.code} - {pref.course?.title}</td>
                      <td className="px-6 py-4">{pref.section_count}</td>
                      <td className="px-6 py-4">{pref.course?.credits * pref.section_count}</td>
                      <td className="px-6 py-4 text-center"><MessageSquare className="mx-auto text-slate-400" /></td>
                      <td className="px-6 py-4 text-center">
                        {pref.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Pending</span>}
                        {pref.status === 'accepted' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Accepted</span>}
                        {pref.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-center flex gap-2 justify-center">
                        <button onClick={() => handleSingle(pref.id, 'accept')} className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg" title="Accept"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => handleSingle(pref.id, 'reject')} className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg" title="Reject"><XCircle className="h-4 w-4" /></button>
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
  );
};

export default ManagePreferences;
