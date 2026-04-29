'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Role {
  _id: string;
  name: string;
  description: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    gender: '',
    mobile: '',
    roleId: ''
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Fetch available roles
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles);
          // Set default role to 'user'
          const userRole = data.roles.find((role: Role) => role.name === 'user');
          if (userRole) {
            setFormData(prev => ({ ...prev, roleId: userRole._id }));
          }
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Firstname validation
    if (!formData.firstname.trim()) {
      newErrors.firstname = 'First name is required';
    } else if (formData.firstname.trim().length < 3) {
      newErrors.firstname = 'First name must be at least 3 characters';
    } else if (formData.firstname.trim().length > 30) {
      newErrors.firstname = 'First name cannot exceed 30 characters';
    }

    // Lastname validation
    if (!formData.lastname.trim()) {
      newErrors.lastname = 'Last name is required';
    } else if (formData.lastname.trim().length < 1) {
      newErrors.lastname = 'Last name must be at least 1 character';
    } else if (formData.lastname.trim().length > 30) {
      newErrors.lastname = 'Last name cannot exceed 30 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.trim().length > 15) {
      newErrors.username = 'Username cannot exceed 15 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // Mobile validation
    const mobileRegex = /^\d{10}$/;
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!mobileRegex.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
    }

    // Role validation
    if (!formData.roleId) {
      newErrors.roleId = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password,
          gender: formData.gender,
          mobile: formData.mobile.trim(),
          roleId: formData.roleId
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Registration successful! Please wait for admin approval before logging in.');
        setFormData({
          firstname: '',
          lastname: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          gender: '',
          mobile: '',
          roleId: formData.roleId // Keep the selected role
        });
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message || 'Registration failed' });
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ general: 'Network error or server unavailable' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center py-8">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-600">Register New Account</h2>
          <button
            onClick={() => router.push('/login')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back to Login
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstname}
                onChange={(e) => handleInputChange('firstname', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.firstname ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={30}
              />
              {errors.firstname && <p className="text-red-500 text-sm mt-1">{errors.firstname}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastname}
                onChange={(e) => handleInputChange('lastname', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.lastname ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={30}
              />
              {errors.lastname && <p className="text-red-500 text-sm mt-1">{errors.lastname}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={15}
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="At least 8 characters with uppercase, lowercase, number, and symbol"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Gender *
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="mr-2"
                />
                Male
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="mr-2"
                />
                Female
              </label>
            </div>
            {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.mobile ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
              {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Role *
              </label>
              <select
                value={formData.roleId}
                onChange={(e) => handleInputChange('roleId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.roleId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </option>
                ))}
              </select>
              {errors.roleId && <p className="text-red-500 text-sm mt-1">{errors.roleId}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-green-600 hover:text-green-800 font-medium underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}