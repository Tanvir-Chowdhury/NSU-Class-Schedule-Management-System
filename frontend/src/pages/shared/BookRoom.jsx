import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Filter
} from 'lucide-react';

const TIME_SLOTS = [
  { id: 1, label: '08:00 AM - 09:30 AM' },
  { id: 2, label: '09:40 AM - 11:10 AM' },
  { id: 3, label: '11:20 AM - 12:50 PM' },
  { id: 4, label: '01:00 PM - 02:30 PM' },
  { id: 5, label: '02:40 PM - 04:10 PM' },
  { id: 6, label: '04:20 PM - 05:50 PM' },
  { id: 7, label: '06:00 PM - 07:30 PM' },
];

const BookRoom = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate, selectedSlot, selectedType]);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const res = await axios.get('http://localhost:8000/bookings/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyBookings(res.data);
    } catch (error) {
      console.error("Failed to fetch my bookings", error);
    }
  };

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const params = {
        booking_date: selectedDate,
        time_slot_id: selectedSlot,
      };
      if (selectedType) params.room_type = selectedType;

      const response = await axios.get('http://localhost:8000/bookings/availability', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch availability', error);
      setStatus({ type: 'error', message: 'Failed to load room availability.' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomClick = (room) => {
    if (room.status === 'AVAILABLE') {
      setSelectedRoom(room);
      setReason('');
      setIsModalOpen(true);
    }
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      // Calculate day of week
      const dateObj = new Date(selectedDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];

      await axios.post('http://localhost:8000/bookings/request', {
        room_id: selectedRoom.id,
        booking_date: selectedDate,
        day: dayName,
        time_slot_id: selectedSlot,
        reason: reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatus({ type: 'success', message: 'Booking request submitted successfully!' });
      setIsModalOpen(false);
      fetchAvailability(); 
      fetchMyBookings();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to submit booking request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Book a Room</h1>
        <p className="text-slate-500">Check availability and request a room booking.</p>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Time Slot</label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(parseInt(e.target.value))}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white"
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot.id} value={slot.id}>{slot.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white"
            >
              <option value="">All Types</option>
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
            </select>
          </div>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search Room</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Room Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room)}
              disabled={room.status !== 'AVAILABLE'}
              className={`p-4 rounded-xl border text-left transition-all ${
                room.status === 'AVAILABLE'
                  ? 'bg-emerald-50 border-emerald-200 hover:shadow-md hover:border-emerald-300 cursor-pointer group'
                  : room.status === 'PENDING'
                  ? 'bg-yellow-50 border-yellow-200 opacity-90 cursor-not-allowed'
                  : 'bg-red-50 border-red-200 opacity-75 cursor-not-allowed'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold text-lg ${
                  room.status === 'AVAILABLE' ? 'text-emerald-700' : 
                  room.status === 'PENDING' ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {room.room_number}
                </span>
                {room.status === 'AVAILABLE' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                ) : room.status === 'PENDING' ? (
                  <Clock className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="text-sm text-slate-600 mb-1">{room.type}</div>
              <div className="text-xs text-slate-500">
                {room.status === 'AVAILABLE' ? 'Available' : 
                 room.status === 'PENDING' ? 'Pending Approval' :
                 `Occupied: ${room.reason}`}
              </div>
            </button>
          ))}
          {filteredRooms.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No rooms found matching your criteria.
            </div>
          )}
        </div>
      )}

      {/* My Bookings Table */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-4">My Booking Requests</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time Slot</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myBookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      No booking requests found.
                    </td>
                  </tr>
                ) : (
                  myBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">{format(new Date(booking.booking_date), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">{TIME_SLOTS.find(s => s.id === booking.time_slot_id)?.label}</td>
                      <td className="px-6 py-4 font-medium">Room {booking.room?.room_number || booking.room_id}</td> 
                      <td className="px-6 py-4 text-slate-600">{booking.reason}</td>
                      <td className="px-6 py-4 text-center">
                        {booking.status === 'PENDING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Pending</span>}
                        {booking.status === 'APPROVED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Approved</span>}
                        {booking.status === 'REJECTED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Rejected</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Book Room {selectedRoom?.room_number}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{TIME_SLOTS.find(s => s.id === selectedSlot)?.label}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for Booking <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="e.g., Extra class for CSE327"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookRoom;
