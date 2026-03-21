/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuthenticated, setAuthenticated } from '../utils/auth';
import { api } from '../utils/api';

const FormInput = ({ label, id, type = 'text', placeholder, value, onChange, required }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
      {label}
    </label>
    <input
      type={type}
      id={id}
      name={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/40"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(245,166,35,0.5)';
        e.target.style.background = 'rgba(255,255,255,0.07)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.background = 'rgba(255,255,255,0.05)';
      }}
    />
  </div>
);

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navi = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      const response = await api.post('/api/login', { email, password });
      setAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navi('/analyze');
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (err.request) {
        setError('Could not reach the backend API. Confirm the Flask server is running on http://localhost:5000.');
      } else {
        setError(err.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-black"
              style={{ background: 'linear-gradient(135deg, #F5A623, #8B5CF6)' }}
            >
              S
            </div>
            <span className="text-2xl font-extrabold">
              <span className="gold-gradient-text">SK</span>
              <span className="text-white">ANA</span>
            </span>
          </Link>
          <p className="text-gray-500 text-sm mt-3">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormInput
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormInput
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-red-300 flex items-center gap-2"
                style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.25)' }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-400 font-medium hover:text-amber-300 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
