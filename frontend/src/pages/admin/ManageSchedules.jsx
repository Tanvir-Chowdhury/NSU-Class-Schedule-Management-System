import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Clock, 
  Loader2, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail
} from 'lucide-react';

const TIME_SLOTS = {
  1: "08:00 AM - 09:30 AM",
  2: "09:40 AM - 11:10 AM",
  3: "11:20 AM - 12:50 PM",
  4: "01:00 PM - 02:30 PM",
  5: "02:40 PM - 04:10 PM",
  6: "04:20 PM - 05:50 PM",
  7: "06:00 PM - 07:30 PM"
};

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'day', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0
  });
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    section_id: '',
    room_id: '',
    day: 'ST',
    time_slot_id: 1,
    is_friday_booking: false
  });
  
  const { token } = useAuth();

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchSchedules();
    fetchTeacherAssignments();
    fetchSections();
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearchQuery, sortConfig]);

  const fetchSections = async () => {
    try {
      const res = await axios.get('http://localhost:8000/admin/sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(res.data);
    } catch (error) {
      console.error("Failed to fetch sections");
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('http://localhost:8000/admin/rooms?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data.items || []);
    } catch (error) {
      console.error("Failed to fetch rooms");
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      const res = await axios.get('http://localhost:8000/admin/teacher-assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherAssignments(res.data);
    } catch (error) {
      console.error("Failed to fetch teacher assignments");
    }
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearchQuery,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      };

      const response = await axios.get('http://localhost:8000/admin/schedules', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data && Array.isArray(response.data.items)) {
        setSchedules(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          total_pages: Math.ceil(response.data.total / prev.limit)
        }));
        // Clear selection if page changes (optional, but safer for now)
        setSelectedIds([]); 
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Failed to fetch schedules', error);
      setStatus({ type: 'error', message: 'Failed to load schedules.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/admin/schedules', newSchedule, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Schedule added successfully.' });
      setIsAddModalOpen(false);
      fetchSchedules();
      setNewSchedule({
        section_id: '',
        room_id: '',
        day: 'ST',
        time_slot_id: 1,
        is_friday_booking: false
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to add schedule.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule entry?')) return;
    
    try {
      await axios.delete(`http://localhost:8000/admin/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'Schedule deleted successfully.' });
      fetchSchedules();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete schedule.' });
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
      setSelectedIds(schedules.map(s => s.id));
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

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} schedule entries?`)) return;

    try {
      await axios.post('http://localhost:8000/admin/schedules/bulk-delete', 
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Selected schedules deleted successfully.' });
      setSelectedIds([]);
      fetchSchedules();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete selected schedules.' });
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL schedules? This action cannot be undone.')) return;

    try {
      await axios.delete('http://localhost:8000/admin/schedules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'All schedules deleted successfully.' });
      fetchSchedules();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete all schedules.' });
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Schedules</h1>
          <p className="text-slate-500">View and manage individual class schedule entries.</p>
        </div>
        
        <div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm mr-2"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Add Schedule
          </button>
          <button
            onClick={handleDeleteAll}
            className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors shadow-sm mr-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by course, room, or faculty..."
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
                <th className="px-6 py-4 w-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={schedules.length > 0 && selectedIds.length === schedules.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">SL</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('course')}>
                  <div className="flex items-center gap-2">
                    Course
                    {sortConfig.key === 'course' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('section')}>
                  <div className="flex items-center gap-2">
                    Section
                    {sortConfig.key === 'section' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('faculty')}>
                  <div className="flex items-center gap-2">
                    Faculty
                    {sortConfig.key === 'faculty' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('day')}>
                  <div className="flex items-center gap-2">
                    Time
                    {sortConfig.key === 'day' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('room')}>
                  <div className="flex items-center gap-2">
                    Room
                    {sortConfig.key === 'room' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('availability')}>
                  <div className="flex items-center gap-2">
                    Availability
                    {sortConfig.key === 'availability' && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading schedules...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Clock className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No schedules found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((schedule, index) => (
                  <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(schedule.id)}
                        onChange={() => handleSelectOne(schedule.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {schedule.section?.course?.code}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {schedule.section?.section_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {schedule.section?.teacher?.initial || 'TBA'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{schedule.day}</span>
                        <span className="text-xs text-slate-500">{TIME_SLOTS[schedule.time_slot_id] || `Slot ${schedule.time_slot_id}`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {schedule.room?.room_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {schedule.availability || schedule.room?.capacity} Seats
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{schedules.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Page {pagination.page} of {pagination.total_pages || 1}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages || pagination.total_pages === 0}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Assignment Overview */}
      <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Teacher Assignment Overview</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Initial</th>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4 text-center">Assigned Sections</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Contact</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {teacherAssignments.map(teacher => (
                          <tr key={teacher.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-medium">{teacher.initial}</td>
                              <td className="px-6 py-4">{teacher.name}</td>
                              <td className="px-6 py-4 text-center">{teacher.assigned_sections}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      teacher.status === 'Assigned' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                      {teacher.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  {teacher.status === 'Unassigned' && (
                                      <a href={`mailto:${teacher.contact_details || ''}`} className="inline-flex items-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Contact Teacher">
                                          <Mail className="h-4 w-4" />
                                      </a>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {teacherAssignments.length === 0 && (
                          <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                  No teacher data available.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add Schedule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Add New Schedule</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                <select
                  required
                  className="w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={newSchedule.section_id}
                  onChange={(e) => setNewSchedule({...newSchedule, section_id: e.target.value})}
                >
                  <option value="">Select Section</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.course?.code} - Section {section.section_number} ({section.teacher?.initial || 'TBA'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select
                  required
                  className="w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={newSchedule.room_id}
                  onChange={(e) => setNewSchedule({...newSchedule, room_id: e.target.value})}
                >
                  <option value="">Select Room</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} (Cap: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                  <select
                    required
                    className="w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={newSchedule.day}
                    onChange={(e) => setNewSchedule({...newSchedule, day: e.target.value})}
                  >
                    <option value="ST">ST (Sun/Tue)</option>
                    <option value="MW">MW (Mon/Wed)</option>
                    <option value="RA">RA (Thu)</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time Slot</label>
                  <select
                    required
                    className="w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={newSchedule.time_slot_id}
                    onChange={(e) => setNewSchedule({...newSchedule, time_slot_id: parseInt(e.target.value)})}
                  >
                    {Object.entries(TIME_SLOTS).map(([id, time]) => (
                      <option key={id} value={id}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_friday"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={newSchedule.is_friday_booking}
                  onChange={(e) => setNewSchedule({...newSchedule, is_friday_booking: e.target.checked})}
                />
                <label htmlFor="is_friday" className="text-sm text-slate-700">Is Friday Booking?</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSchedules;
