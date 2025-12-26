import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Search, CheckCircle, XCircle, MessageSquare, Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const TIME_SLOTS = [
  { id: 1, label: '08:00 AM - 09:30 AM' },
  { id: 2, label: '09:40 AM - 11:10 AM' },
  { id: 3, label: '11:20 AM - 12:50 PM' },
  { id: 4, label: '01:00 PM - 02:30 PM' },
  { id: 5, label: '02:40 PM - 04:10 PM' },
  { id: 6, label: '04:20 PM - 05:50 PM' },
  { id: 7, label: '06:00 PM - 07:30 PM' },
];

const ManageBookings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/bookings/admin/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to show only PENDING requests by default or sort them
      // Requirement says "create a page for booking request accept and rejection"
      // Usually admins want to see Pending first.
      const sorted = res.data.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return new Date(b.booking_date) - new Date(a.booking_date);
      });
      setBookings(sorted);
    } catch (error) {
      setStatus('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setStatus('');
    try {
      // action is 'APPROVED' or 'REJECTED'
      await axios.put(`http://localhost:8000/bookings/admin/requests/${id}`, { status: action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBookings();
      setStatus(`Booking ${action.toLowerCase()} successfully`);
    } catch (error) {
      setStatus(error.response?.data?.detail || 'Action failed');
    }
  };

  const handleBulkAction = async (action) => {
    // Filter for pending requests only
    const pendingSelectedIds = selectedIds.length > 0 
      ? selectedIds.filter(id => {
          const booking = bookings.find(b => b.id === id);
          return booking && booking.status === 'PENDING';
        })
      : bookings.filter(b => b.status === 'PENDING').map(b => b.id);

    if (pendingSelectedIds.length === 0) {
      setStatus('No pending requests to process.');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} ${pendingSelectedIds.length} pending requests?`)) return;
    
    setStatus('');
    setLoading(true);
    
    try {
      // The backend bulk-action endpoint might expect 'action' and maybe 'ids' if we want to be specific.
      // If the backend supports filtering by IDs, we should send them.
      // If not, and it just does "all pending", then we can't select specific ones easily without loop.
      // Let's assume we loop for now to be safe and support selection, or check if backend supports list.
      // The previous code used /bulk-action with { action: ... }. This likely did ALL pending.
      // To support "Selected", we should probably loop or update backend.
      // Given I can't easily update backend logic without reading it, I'll loop for selected, 
      // and use the bulk endpoint only if "All" is intended (but user said "Accept Selected").
      
      await Promise.all(pendingSelectedIds.map(id => 
        axios.put(`http://localhost:8000/bookings/admin/requests/${id}`, { status: action }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ));

      setStatus(`Successfully ${action === 'APPROVED' ? 'approved' : 'rejected'} ${pendingSelectedIds.length} requests.`);
      setSelectedIds([]);
      fetchBookings();
    } catch (error) {
      console.error(`Failed to ${action} bookings`, error);
      setStatus(error.response?.data?.detail || 'Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredBookings.map(b => b.id));
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

  const filteredBookings = bookings.filter(booking => {
    const room = booking.room?.room_number || '';
    return (
      room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.reason.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue, bValue;
    
    if (sortConfig.key === 'date') {
      aValue = new Date(a.booking_date);
      bValue = new Date(b.booking_date);
    } else if (sortConfig.key === 'time') {
      aValue = a.time_slot_id;
      bValue = b.time_slot_id;
    } else if (sortConfig.key === 'room') {
      aValue = a.room?.room_number || '';
      bValue = b.room?.room_number || '';
    } else if (sortConfig.key === 'requester') {
      // Try to get name or initial
      aValue = a.user?.teacher_profile?.initial || a.user?.full_name || a.user_id;
      bValue = b.user?.teacher_profile?.initial || b.user?.full_name || b.user_id;
    } else if (sortConfig.key === 'status') {
      aValue = a.status;
      bValue = b.status;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Bookings</h1>
            <p className="text-slate-500">Review and approve/reject room booking requests.</p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction('APPROVED')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Accept Selected ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkAction('REJECTED')}
                  className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject Selected ({selectedIds.length})
                </button>
              </>
            )}
            <button
              onClick={() => { setSelectedIds([]); handleBulkAction('APPROVED'); }}
              className="inline-flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors shadow-sm border border-green-200"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Approve All
            </button>
            <button
              onClick={() => { setSelectedIds([]); handleBulkAction('REJECTED'); }}
              className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors shadow-sm border border-red-200"
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject All
            </button>
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            status.includes('success') || status.includes('approved') || status.includes('rejected') 
            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
            : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            <MessageSquare className="h-5 w-5" />
            {status}
          </div>
        )}

        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by room or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-slate-600 placeholder:text-slate-400"
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
                      checked={selectedIds.length > 0 && selectedIds.length === filteredBookings.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>Date</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('time')}>Time</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('room')}>Room</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('requester')}>Requester</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading bookings...
                    </td>
                  </tr>
                ) : sortedBookings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                              <MessageSquare className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-900">No booking requests found</p>
                          <p className="text-sm mt-1">
                            {searchQuery ? 'Try adjusting your search terms.' : 'No requests to review.'}
                          </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.includes(booking.id)}
                          onChange={() => handleSelectOne(booking.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {TIME_SLOTS.find(s => s.id === booking.time_slot_id)?.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {booking.room?.room_number || booking.room_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {booking.user?.teacher_profile?.initial || booking.user?.full_name || booking.user_id}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={booking.reason}>
                        {booking.reason}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {booking.status === 'PENDING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Pending</span>}
                        {booking.status === 'APPROVED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Approved</span>}
                        {booking.status === 'REJECTED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {booking.status === 'PENDING' && (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleAction(booking.id, 'APPROVED')} className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors" title="Approve">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleAction(booking.id, 'REJECTED')} className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors" title="Reject">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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

export default ManageBookings;
