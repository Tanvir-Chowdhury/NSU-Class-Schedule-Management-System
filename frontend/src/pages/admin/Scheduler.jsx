import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Play, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'R', 'F', 'A'];
const TIME_SLOTS = [
  { id: 1, label: '08:00 AM - 09:30 AM' },
  { id: 2, label: '09:40 AM - 11:10 AM' },
  { id: 3, label: '11:20 AM - 12:50 PM' },
  { id: 4, label: '01:00 PM - 02:30 PM' },
  { id: 5, label: '02:40 PM - 04:10 PM' },
  { id: 6, label: '04:20 PM - 05:50 PM' },
  { id: 7, label: '06:00 PM - 07:30 PM' },
];

const Scheduler = () => {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Dropdown state
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const dropdownRef = React.useRef(null);

  const { token } = useAuth();

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, roomsRes] = await Promise.all([
        axios.get('http://localhost:8000/admin/schedules', {
          params: { limit: 1000 },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/admin/rooms', {
          params: { limit: 1000 },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (schedulesRes.data && Array.isArray(schedulesRes.data.items)) {
        setSchedules(schedulesRes.data.items);
      } else if (Array.isArray(schedulesRes.data)) {
        setSchedules(schedulesRes.data);
      } else {
        setSchedules([]);
      }

      if (roomsRes.data && Array.isArray(roomsRes.data.items)) {
        setRooms(roomsRes.data.items);
      } else if (Array.isArray(roomsRes.data)) {
        setRooms(roomsRes.data);
      } else {
        setRooms([]);
      }
      
      // Handle room selection
      const roomsData = roomsRes.data.items || roomsRes.data || [];
      if (roomsData.length > 0) {
        setSelectedRoom(roomsData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
      setStatus({ type: 'error', message: 'Failed to load scheduler data.' });
    } finally {
      setIsLoading(false);
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
      fetchData(); // Refresh data
    } catch (error) {
      setStatus({ type: 'error', message: 'Auto-scheduling failed.' });
    } finally {
      setIsRunning(false);
    }
  };

  const getScheduleForCell = (day, slotId) => {
    if (!selectedRoom) return null;
    
    // Find schedule for this room, day, and slot
    const schedule = schedules.find(s => 
      s.room_id === parseInt(selectedRoom) && 
      s.day === day && 
      s.time_slot_id === slotId
    );

    if (!schedule) return null;

    // Check if this is the start of an extended lab (which spans 2 slots)
    // We need to know if the course is extended.
    // The schedule object has 'section' -> 'course' -> 'duration_mode'
    const isExtended = schedule.section.course.duration_mode === 'EXTENDED';
    
    // If it's extended, we only render it in the first slot (and span 2)
    // But wait, the backend creates 2 schedule entries for extended labs (one for each slot).
    // So we will find an entry for slot 1 and slot 2.
    // To render a rowspan=2, we should only render the first one and skip the second one?
    // Or just render them as separate blocks?
    // The requirement says "Render as blocks spanning 2 rows".
    // So if I find a schedule at slot X, and it's extended, I should check if it's the "first" part.
    // How do I know if it's the first part?
    // Extended labs are scheduled in consecutive slots.
    // If I have a schedule at Slot 1 and Slot 2 for the same section.
    // At Slot 1: Render with rowspan 2.
    // At Slot 2: Don't render anything (or render hidden).
    
    // Let's check if there is a previous slot with the same section
    const prevSchedule = schedules.find(s => 
      s.room_id === parseInt(selectedRoom) && 
      s.day === day && 
      s.time_slot_id === slotId - 1 &&
      s.section_id === schedule.section_id
    );

    if (prevSchedule && isExtended) {
      return 'SKIP'; // Skip this cell as it's covered by the previous one
    }

    return { ...schedule, isExtended };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduler</h1>
          <p className="text-slate-500">Manage and visualize class schedules.</p>
        </div>
        
        <button
          onClick={runAutoSchedule}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run Auto-Schedule
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

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
              {TIME_SLOTS.map((slot) => (
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
    </div>
  );
};

export default Scheduler;
