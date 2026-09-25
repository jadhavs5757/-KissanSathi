import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, UserPlus, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    preferred_language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a110c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-forest-600 flex items-center justify-center shadow-xl shadow-forest-900/40 border border-forest-400/40">
              <Sprout className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold font-display text-white mt-4 tracking-tight">
            Create Farmer Account
          </h2>
          <p className="text-xs text-slate-400 mt-1">Start your digital farm record & AI decision support</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. Ramesh Patel"
              icon={User}
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="ramesh@example.com"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Password (min 8 characters)"
              name="password"
              type="password"
              placeholder="Create a strong password"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Input
              label="Mobile Number"
              name="phone"
              placeholder="9876543210"
              icon={Phone}
              value={formData.phone}
              onChange={handleChange}
            />

            <Input
              label="Location (District, State)"
              name="location"
              placeholder="e.g. Nashik, Maharashtra"
              icon={MapPin}
              value={formData.location}
              onChange={handleChange}
            />

            <Button type="submit" isLoading={loading} className="w-full mt-3" size="lg" icon={UserPlus}>
              Register Account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
