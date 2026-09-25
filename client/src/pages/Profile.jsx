import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { User, Mail, Phone, MapPin, Globe, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    preferred_language: user?.preferred_language || 'en'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await updateProfile(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="pb-2 border-b border-slate-900">
        <h1 className="text-2xl font-bold font-display text-white">Farmer Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account information and localization preferences</p>
      </div>

      <Card className="p-8">
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-forest-950/80 border border-forest-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Profile information updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            icon={User}
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Email Address (Login ID)"
            name="email"
            icon={Mail}
            value={user?.email || ''}
            disabled
            helper="Email address cannot be changed."
          />

          <Input
            label="Mobile Number"
            name="phone"
            icon={Phone}
            value={formData.phone}
            onChange={handleChange}
            placeholder="9876543210"
          />

          <Input
            label="Location (District, State)"
            name="location"
            icon={MapPin}
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Nashik, Maharashtra"
          />

          <Select
            label="Preferred Advisory Language"
            name="preferred_language"
            value={formData.preferred_language}
            onChange={handleChange}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी (Hindi)' },
              { value: 'mr', label: 'मराठी (Marathi)' },
              { value: 'te', label: 'తెలుగు (Telugu)' },
              { value: 'ta', label: 'தமிழ் (Tamil)' },
              { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
            ]}
          />

          <div className="pt-4 flex justify-end">
            <Button type="submit" isLoading={loading} size="md">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
