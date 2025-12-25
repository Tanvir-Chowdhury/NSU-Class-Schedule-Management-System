import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, GraduationCap, ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'STUDENT',
    verificationCode: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendVerificationCode = async () => {
    if (!formData.email.endsWith('@northsouth.edu')) {
        setError('Please use your North South University email (@northsouth.edu)');
        return;
    }
    
    setIsLoading(true);
    setError('');
    try {
        await axios.post('http://localhost:8000/send-verification-code', { email: formData.email });
        setCodeSent(true);
        alert('Verification code sent to your email!');
    } catch (err) {
        setError(err.response?.data?.detail || 'Failed to send verification code.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await axios.post('http://localhost:8000/register', {
        email: formData.email,
        password: formData.password,
        role: 'STUDENT',
        verification_code: formData.verificationCode,
        is_active: true
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex items-center justify-between">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
            <div className="w-6"></div> {/* Spacer */}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Student Registration Only</p>
                <p>Teacher accounts are automatically created by the administration. If you are a teacher, please contact the admin for your credentials.</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <div className="flex gap-2">
                <div className="relative grow">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="student@northsouth.edu"
                    disabled={codeSent}
                />
                </div>
                <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isLoading || codeSent || !formData.email}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (codeSent ? 'Sent' : 'Send Code')}
                </button>
            </div>
          </div>

          {codeSent && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Verification Code</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    type="text"
                    name="verificationCode"
                    required
                    value={formData.verificationCode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Enter 6-digit code"
                  />
                </div>
              </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !codeSent}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
