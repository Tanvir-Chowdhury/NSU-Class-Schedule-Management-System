import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Bell, Check, Clock, Mail } from 'lucide-react';

const Notifications = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/notifications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.post(`http://localhost:8000/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      // Dispatch a custom event so the navbar can update the count immediately
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-600" />
          Notifications
        </h1>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id}
              className={`bg-white rounded-xl p-6 border transition-all ${
                notification.is_read 
                  ? 'border-slate-200' 
                  : 'border-indigo-200 shadow-sm ring-1 ring-indigo-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <h3 className={`font-semibold ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {notification.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap mb-3">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;