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
  Mail,
  Calendar,
  Play,
  Filter,
  ChevronDown,
  Check,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TIME_SLOTS = {
  1: "08:00 AM - 09:30 AM",
  2: "09:40 AM - 11:10 AM",
  3: "11:20 AM - 12:50 PM",
  4: "01:00 PM - 02:30 PM",
  5: "02:40 PM - 04:10 PM",
  6: "04:20 PM - 05:50 PM",
  7: "06:00 PM - 07:30 PM"
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'R', 'F', 'A'];
const CALENDAR_TIME_SLOTS = [
  { id: 1, label: '08:00 AM - 09:30 AM' },
  { id: 2, label: '09:40 AM - 11:10 AM' },
  { id: 3, label: '11:20 AM - 12:50 PM' },
  { id: 4, label: '01:00 PM - 02:30 PM' },
  { id: 5, label: '02:40 PM - 04:10 PM' },
  { id: 6, label: '04:20 PM - 05:50 PM' },
  { id: 7, label: '06:00 PM - 07:30 PM' },
];

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]); // For Calendar View
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

  // Auto-Scheduler & Calendar View State
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const dropdownRef = React.useRef(null);
  
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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoomDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchAllSchedules(); // Fetch all for calendar
    fetchTeacherAssignments();
    fetchSections();
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearchQuery, sortConfig]);

  // Set initial selected room when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      const defaultRoom = rooms.find(r => r.room_number === 'SAC201');
      if (defaultRoom) {
        setSelectedRoom(defaultRoom.id);
      } else {
        setSelectedRoom(rooms[0].id);
      }
    }
  }, [rooms]);

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

  const fetchAllSchedules = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/schedules', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 } // Fetch all for calendar
      });
      if (response.data && Array.isArray(response.data.items)) {
        setAllSchedules(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch all schedules for calendar', error);
    }
  };

  const runAutoSchedule = async () => {
    setIsRunning(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await axios.post('http://localhost:8000/admin/schedule/auto', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ 
        type: 'success', 
        message: `Scheduling Complete! Scheduled ${response.data.total_scheduled} classes.` 
      });
      fetchSchedules(); // Refresh data
      fetchAllSchedules(); // Refresh calendar data
    } catch (error) {
      setStatus({ type: 'error', message: 'Auto-scheduling failed.' });
    } finally {
      setIsRunning(false);
    }
  };

  const getScheduleForCell = (day, slotId) => {
    if (!selectedRoom) return null;
    
    // Helper to check if a schedule matches a specific day
    const isDayMatch = (scheduleDay, currentDay) => {
      if (scheduleDay === currentDay) return true;
      if (scheduleDay === 'ST' && (currentDay === 'Sunday' || currentDay === 'Tuesday')) return true;
      if (scheduleDay === 'MW' && (currentDay === 'Monday' || currentDay === 'Wednesday')) return true;
      if (scheduleDay === 'RA' && (currentDay === 'Thursday' || currentDay === 'Saturday')) return true;
      return false;
    };

    // Use allSchedules instead of paginated schedules
    const schedule = allSchedules.find(s => 
      s.room_id === parseInt(selectedRoom) && 
      s.time_slot_id === slotId &&
      isDayMatch(s.day, day)
    );

    if (!schedule) return null;

    const isExtended = schedule.section.course.duration_mode === 'EXTENDED';
    
    const prevSchedule = allSchedules.find(s => 
      s.room_id === parseInt(selectedRoom) && 
      s.time_slot_id === slotId - 1 &&
      s.section_id === schedule.section_id &&
      isDayMatch(s.day, day)
    );

    if (prevSchedule && isExtended) {
      return 'SKIP'; 
    }

    return { ...schedule, isExtended };
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/schedules', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 } // Fetch all
      });
      const allSchedules = response.data.items || [];

      const doc = new jsPDF();
      doc.text("Class Schedules", 14, 10);
      
      const tableColumn = ["ID", "Course", "Section", "Teacher", "Room", "Day", "Time"];
      const tableRows = [];

      allSchedules.forEach(schedule => {
        const scheduleData = [
          schedule.id,
          schedule.section.course.code,
          schedule.section.section_number,
          schedule.section.teacher ? schedule.section.teacher.initial : 'TBA',
          schedule.room.room_number,
          schedule.day,
          TIME_SLOTS[schedule.time_slot_id]
        ];
        tableRows.push(scheduleData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save("schedules.pdf");
    } catch (error) {
      console.error("Failed to download PDF", error);
      setStatus({ type: 'error', message: 'Failed to download PDF.' });
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/schedules', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10000 } // Fetch all
      });
      const allSchedules = response.data.items || [];

      const headers = ["ID,Course,Section,Teacher,Room,Day,Time"];
      const rows = allSchedules.map(schedule => 
        `${schedule.id},${schedule.section.course.code},${schedule.section.section_number},${schedule.section.teacher ? schedule.section.teacher.initial : 'TBA'},${schedule.room.room_number},${schedule.day},"${TIME_SLOTS[schedule.time_slot_id]}"`
      );

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "schedules.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download CSV", error);
      setStatus({ type: 'error', message: 'Failed to download CSV.' });
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
      fetchAllSchedules();
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
      fetchAllSchedules();
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
      fetchAllSchedules();
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
      fetchAllSchedules();
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
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runAutoSchedule}
            disabled={isRunning}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Auto Schedule
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Add Schedule
          </button>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </button>
          <button
            onClick={handleDeleteAll}
            className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors shadow-sm"
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

      {/* Calendar View Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filter by Room:</span>
          </div>
          
          <div className="relative min-w-[250px]" ref={dropdownRef}>
            <button 
              onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
              className="w-full px-3 py-2 text-left border border-slate-300 rounded-lg flex items-center justify-between bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <span className="truncate">
                {selectedRoom 
                  ? (() => {
                      const r = rooms.find(r => r.id == selectedRoom);
                      return r ? `${r.room_number} (${r.type})` : 'Select Room';
                    })()
                  : 'Select Room'
                }
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
            </button>

            {isRoomDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 flex flex-col">
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search room..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500"
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {rooms
                    .filter(room => 
                      room.room_number.toLowerCase().includes(roomSearchQuery.toLowerCase())
                    )
                    .map(room => (
                      <button
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room.id);
                          setIsRoomDropdownOpen(false);
                          setRoomSearchQuery('');
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                          parseInt(selectedRoom) === room.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        <span>{room.room_number} ({room.type})</span>
                        {parseInt(selectedRoom) === room.id && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                    {rooms.filter(room => room.room_number.toLowerCase().includes(roomSearchQuery.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">No rooms found</div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200">
            <thead>
              <tr>
                <th className="p-3 border border-slate-200 bg-slate-50 text-slate-500 font-medium w-32">
                  Time Slot
                </th>
                {DAYS.map((day, index) => (
                  <th 
                    key={day} 
                    className={`p-3 border border-slate-200 font-semibold w-32 ${
                      day === 'Friday' ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {DAY_LABELS[index]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALENDAR_TIME_SLOTS.map((slot) => (
                <tr key={slot.id}>
                  <td className="p-3 border border-slate-200 text-xs text-slate-500 font-medium bg-slate-50">
                    <div className="text-slate-900 font-bold mb-1">Slot {slot.id}</div>
                    {slot.label}
                  </td>
                  {DAYS.map((day) => {
                    const scheduleData = getScheduleForCell(day, slot.id);
                    
                    if (scheduleData === 'SKIP') return null;

                    return (
                      <td 
                        key={day} 
                        rowSpan={scheduleData?.isExtended ? 2 : 1}
                        className={`p-2 border border-slate-200 align-top h-24 ${
                          day === 'Friday' ? 'bg-slate-100/50' : ''
                        }`}
                      >
                        {scheduleData && (
                          <div className={`p-2 rounded-lg border text-xs h-full flex flex-col justify-between ${
                            scheduleData.section.course.type === 'LAB' 
                              ? 'bg-purple-50 border-purple-100 text-purple-700' 
                              : 'bg-blue-50 border-blue-100 text-blue-700'
                          }`}>
                            <div>
                              <div className="font-bold text-sm mb-1">{scheduleData.section.course.code}</div>
                              <div className="line-clamp-2 mb-1">{scheduleData.section.course.title}</div>
                            </div>
                            <div className="font-medium opacity-75">
                              Sec {scheduleData.section.section_number}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
