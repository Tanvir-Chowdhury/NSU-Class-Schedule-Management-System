import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import addMinutes from 'date-fns/addMinutes';
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import addDays from 'date-fns/addDays';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Loader2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  BookOpen
} from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom Toolbar Component
const CustomToolbar = ({ date, onNavigate, onView, view }) => {
  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Today
        </button>
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={goToBack}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-slate-800 ml-2">
          {format(date, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg">
        {['month', 'week', 'day'].map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === v
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Custom Event Component
const CustomEvent = ({ event }) => {
  return (
    <div className="h-full w-full flex flex-col p-1 overflow-hidden">
      <div className="font-semibold text-xs truncate flex items-center gap-1">
        {event.resource.type === 'class' ? <BookOpen className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
        {event.title}
      </div>
      <div className="text-[10px] opacity-90 truncate flex items-center gap-1 mt-0.5">
        <MapPin className="h-3 w-3" />
        {event.resource.room}
      </div>
      <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
      </div>
    </div>
  );
};

// Custom Week Header Component
const CustomWeekHeader = ({ date, label, localizer }) => {
  return (
    <div className="py-3 flex flex-col items-center justify-center">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {format(date, 'EEE')}
      </div>
      <div className={`text-xl font-bold h-8 w-8 flex items-center justify-center rounded-full ${
        format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-slate-800'
      }`}>
        {format(date, 'd')}
      </div>
    </div>
  );
};

const CalendarView = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/calendar/my-schedule');
      
      const rawEvents = res.data;
      const calendarEvents = [];
      
      // Helper to get date of current week for a specific day name
      const getDayDate = (dayName, baseDate) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDayIndex = days.indexOf(dayName);
        const currentDayIndex = getDay(baseDate);
        const diff = targetDayIndex - currentDayIndex;
        return addDays(baseDate, diff);
      };

      // Generate events for the currently viewed week (and maybe surrounding weeks for smooth nav)
      // For simplicity, let's generate for the current month view range
      // But since we default to WEEK view, let's focus on that.
      // Actually, to support navigation, we should generate for a larger range or re-generate on navigate.
      // Let's re-generate on render based on 'date' state.
      
      // We'll generate for 3 weeks: previous, current, next to be safe
      const weeksToGenerate = [-1, 0, 1];
      
      weeksToGenerate.forEach(weekOffset => {
        const baseDate = addDays(date, weekOffset * 7);
        
        rawEvents.forEach(evt => {
          if (evt.type === 'class') {
            // Recurring Event
            const evtDate = getDayDate(evt.day, baseDate);
            const [hours, minutes] = evt.start_time.split(':').map(Number);
            const start = new Date(evtDate);
            start.setHours(hours, minutes, 0, 0);
            const end = addMinutes(start, evt.duration_minutes);
            
            calendarEvents.push({
              id: `${evt.id}-${weekOffset}`, // Unique ID for this instance
              title: evt.title,
              start,
              end,
              resource: evt,
              style: { backgroundColor: '#4f46e5' } // Indigo
            });
          } else if (evt.type === 'booking') {
            // One-time Event
            // Only add if it falls in the range? 
            // Actually, bookings have specific dates, so we just parse them.
            // We don't need to replicate them for weeks.
            // But we need to avoid adding them multiple times if we loop.
            // So we should process bookings outside this loop.
          }
        });
      });

      // Process bookings separately
      rawEvents.forEach(evt => {
        if (evt.type === 'booking') {
          const start = parseISO(evt.start);
          const end = addMinutes(start, evt.duration_minutes);
          calendarEvents.push({
            id: evt.id,
            title: evt.title,
            start,
            end,
            resource: evt,
            style: { backgroundColor: '#059669' } // Emerald
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    } finally {
      setLoading(false);
    }
  }, [token, date]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const eventStyleGetter = (event) => {
    const isClass = event.resource.type === 'class';
    return {
      style: {
        backgroundColor: isClass ? '#4f46e5' : '#059669', // Indigo-600 for classes, Emerald-600 for bookings
        borderRadius: '8px',
        opacity: 1,
        color: 'white',
        border: '0px',
        display: 'block',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '2px'
      }
    };
  };

  const handleSyncGoogle = async () => {
    try {
      const response = await api.get('/calendar/google/login');
      if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      console.error("Failed to initiate Google Sync", error);
      alert("Failed to connect to Google Calendar. Please try again.");
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 p-2">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-slate-500 mt-1">Manage your classes and bookings efficiently.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={fetchSchedule}
                className="p-2.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-slate-200"
                title="Refresh Schedule"
            >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
                onClick={handleSyncGoogle}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow flex items-center gap-2"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Sync to Google Calendar
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', fontFamily: 'inherit' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent,
            header: CustomWeekHeader
          }}
          min={new Date(0, 0, 0, 8, 0, 0)} // Start at 8 AM
          max={new Date(0, 0, 0, 20, 0, 0)} // End at 8 PM
          step={30}
          timeslots={2}
        />
      </div>
    </div>
  );
};

export default CalendarView;
