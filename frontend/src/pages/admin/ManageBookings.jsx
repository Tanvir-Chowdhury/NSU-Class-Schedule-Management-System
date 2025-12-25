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
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} all pending requests?`)) return;
    
    setStatus('');
    setLoading(true);
    const pendingBookings = bookings.filter(b => b.status === 'PENDING');
    let successCount = 0;
    let failCount = 0;

    for (const booking of pendingBookings) {
      try {
        await axios.put(`http://localhost:8000/bookings/admin/requests/${booking.id}`, { status: action }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to ${action} booking ${booking.id}`, error);
        failCount++;
      }
    }
    
    fetchBookings();
    setStatus(`${action} ${successCount} requests. ${failCount > 0 ? `Failed: ${failCount}` : ''}`);
    setLoading(false);
  };

  const filteredBookings = bookings.filter(booking => {
    const room = booking.room?.room_number || '';
    const user = booking.user?.email || ''; // Assuming user relationship is loaded or we need to fix backend
    // Note: The current BookingRequest schema in backend/models/booking.py has user relationship.
    // But Pydantic schema might not include it fully nested. Let's check schema later if needed.
    // For now, we'll search by what we have.
    return (
      room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.reason.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Bookings</h1>
          <p className="text-slate-500">Review and approve/reject room booking requests.</p>
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
          <div className="flex gap-2 border-l pl-4 border-slate-200">
            <button
              onClick={() => handleBulkAction('APPROVED')}
              className="inline-flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors shadow-sm border border-green-200"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Approve All Pending
            </button>
            <button
              onClick={() => handleBulkAction('REJECTED')}
              className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors shadow-sm border border-red-200"
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject All Pending
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Requester</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading bookings...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No booking requests found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {TIME_SLOTS.find(s => s.id === booking.time_slot_id)?.label.split(' - ')[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {booking.room?.room_number || booking.room_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {/* We might need to fetch user details if not in schema, but let's try accessing it */}
                        {booking.user_id} 
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
