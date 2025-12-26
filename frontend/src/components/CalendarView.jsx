import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';

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

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/calendar/my-schedule');
      setEvents(response.data);
    } catch (err) {
      console.error("Failed to fetch schedule", err);
      setError("Failed to load schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScheduleForCell = (day, slotId) => {
    // Helper to check if a schedule matches a specific day
    const isDayMatch = (scheduleDay, currentDay) => {
      if (scheduleDay === currentDay) return true;
      if (scheduleDay === 'ST' && (currentDay === 'Sunday' || currentDay === 'Tuesday')) return true;
      if (scheduleDay === 'MW' && (currentDay === 'Monday' || currentDay === 'Wednesday')) return true;
      if (scheduleDay === 'RA' && (currentDay === 'Thursday' || currentDay === 'Saturday')) return true;
      return false;
    };

    // Check if this cell is covered by a previous extended slot
    const previousSlot = events.find(s => 
      isDayMatch(s.day, day) && 
      s.time_slot_id === slotId - 1 && 
      s.duration_minutes > 90
    );

    if (previousSlot) return 'SKIP';

    const schedule = events.find(s => 
      isDayMatch(s.day, day) && 
      s.time_slot_id === slotId
    );

    return schedule;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">My Weekly Schedule</h2>
      
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
                  const schedule = getScheduleForCell(day, slot.id);
                  
                  if (schedule === 'SKIP') return null;

                  return (
                    <td 
                      key={`${day}-${slot.id}`}
                      className={`p-2 border border-slate-200 relative h-24 align-top transition-colors ${
                        day === 'Friday' ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                      rowSpan={schedule && schedule.duration_minutes > 90 ? 2 : 1}
                    >
                      {schedule ? (
                        <div className={`h-full w-full p-2 rounded-lg border text-xs flex flex-col gap-1 shadow-sm ${
                          schedule.type === 'booking' 
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        }`}>
                          <div className="font-bold truncate" title={schedule.title}>
                            {schedule.title}
                          </div>
                          <div className="flex items-center gap-1 opacity-90">
                            <span className="font-medium">Sec: {schedule.section}</span>
                          </div>
                          <div className="mt-auto font-mono font-medium bg-white/50  py-0.5 rounded w-fit">
                            {schedule.room}
                          </div>
                        </div>
                      ) : (
                        day === 'Friday' && (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-300 text-2xl select-none">×</span>
                          </div>
                        )
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
  );
};

export default CalendarView;
