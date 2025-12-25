import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Connecting to Google Calendar...');

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setStatus('error');
      setMessage('No authorization code found.');
      return;
    }

    const connectGoogle = async () => {
      try {
        const response = await api.post('/calendar/google/connect', { code });
        setStatus('success');
        setMessage(response.data.message || 'Successfully connected to Google Calendar!');
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/calendar');
        }, 2000);
      } catch (error) {
        console.error('Google connect error:', error);
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Failed to connect to Google Calendar.');
      }
    };

    connectGoogle();
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connected!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-400 mt-4">Redirecting back to calendar...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Failed</h2>
            <p className="text-red-600">{message}</p>
            <button 
              onClick={() => navigate('/calendar')}
              className="mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Return to Calendar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
