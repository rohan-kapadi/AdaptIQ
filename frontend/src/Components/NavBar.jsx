/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccountSidebar from './AccountSidebar';
import { getAuthenticated, setAuthenticated } from '../utils/auth';
import logo from '../assets/Logo.png';

function NavBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();


  
  const handleAnalyze = () => {
    navigate(getAuthenticated() ? '/analyze' : '/signin');
  };

  const checkAuthStatus = useCallback(() => {
    const authStatus = getAuthenticated();
    setIsAuthenticated(authStatus);
    if (authStatus) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUserData(JSON.parse(storedUser));
    } else {
      setUserData(null);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
    const intervalId = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(intervalId);
  }, [checkAuthStatus]);

  // Scroll glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(false);
    }
  };
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setAuthenticated(false);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    setUserData(null);
    navigate('/');
  };

  const initials = (userData?.name?.trim?.()?.[0] || userData?.email?.trim?.()?.[0] || '?').toUpperCase();

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(10, 10, 26, 0.9)'
            : 'rgba(10, 10, 26, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: scrolled
            ? '1px solid rgba(245, 166, 35, 0.2)'
            : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={logo}
              alt="AdaptIQ logo"
              className="w-9 h-9 object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,166,35,0.4))' }}
            />
            <span className="text-xl font-extrabold tracking-tight">
              <span className="gold-gradient-text">Adapt</span>
              <span className="text-white">IQ</span>
            </span>
          </Link>

          {/* Nav Links */}
          <ul className="hidden sm:flex items-center gap-1 text-sm font-medium">
            <li>
              <Link
                to="/"
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Home
              </Link>
            </li>
            <li>
              <button
                onClick={handleAnalyze}
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Analyze
              </button>
            </li>
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(p => !p)}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-black transition-transform duration-200 hover:scale-110"
                  style={{ background: 'linear-gradient(135deg, #F5A623, #FFD700)' }}
                >
                  {initials}
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden shadow-2xl"
                    style={{
                      background: 'rgba(15,10,40,0.97)',
                      border: '1px solid rgba(245,166,35,0.2)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-sm font-semibold text-white truncate">{userData?.name || 'User'}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{userData?.email || ''}</p>
                    </div>
                    <div className="py-1">
                      {[
                        { label: 'Account', action: () => { setSidebarOpen(true); setDropdownOpen(false); } },
                        { label: 'Profile', action: () => { navigate('/profile'); setDropdownOpen(false); } },
                        { label: 'Sign Out', action: handleSignOut, danger: true },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                            item.danger
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-gray-200 hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary text-sm py-2"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AccountSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

export default NavBar;
