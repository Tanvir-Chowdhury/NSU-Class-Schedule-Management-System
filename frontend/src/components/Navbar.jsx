import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, GraduationCap, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuth();

  const getPortalLink = () => {
    if (!user) return '/login';
    const role = user.role ? user.role.toLowerCase() : '';
    switch(role) {
      case 'admin': return '/admin/dashboard';
      case 'teacher': return '/teacher/dashboard';
      case 'student': return '/student/dashboard';
      default: return '/login';
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-slate-900">NSU CSMS</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Home</Link>
            <Link to="/teachers" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Teachers</Link>
            
            <div className="flex items-center space-x-4 ml-4">
              {user ? (
                <Link 
                  to={getPortalLink()} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Open Portal
                </Link>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-indigo-600 hover:text-indigo-700 font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-500 hover:text-slate-700 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" className="block px-3 py-2 text-slate-600 hover:text-indigo-600 font-medium">Home</Link>
            <Link to="/teachers" className="block px-3 py-2 text-slate-600 hover:text-indigo-600 font-medium">Teachers</Link>
            <div className="pt-4 flex flex-col space-y-2 px-3">
              {user ? (
                <Link to={getPortalLink()} className="w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Open Portal
                </Link>
              ) : (
                <>
                  <Link to="/login" className="w-full text-center text-indigo-600 border border-indigo-600 px-4 py-2 rounded-lg">Login</Link>
                  <Link to="/register" className="w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
