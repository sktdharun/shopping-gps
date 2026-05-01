'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Address {
  _id: string;
  name: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  mobile: string;
  country: string;
}

function EditAddressPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addressId = searchParams.get('id');

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    mobile: '',
    country: 'India'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!addressId) {
      router.push('/accounts?tab=addresses');
      return;
    }

    const fetchAddress = async () => {
      try {
        const res = await fetch('/api/addresses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const address = data.addresses.find((addr: Address) => addr._id === addressId);
          if (address) {
            setFormData({
              name: address.name,
              type: address.type,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              pinCode: address.pinCode,
              mobile: address.mobile,
              country: address.country
            });
          } else {
            router.push('/accounts?tab=addresses');
          }
        } else {
          router.push('/accounts?tab=addresses');
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        router.push('/accounts?tab=addresses');
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [router, addressId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Address name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Address name must be at least 2 characters';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Address type is required';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address Line 1 is required';
    } else if (formData.addressLine1.trim().length < 5) {
      newErrors.addressLine1 = 'Address Line 1 must be at least 5 characters';
    }

    if (!formData.addressLine2.trim()) {
      newErrors.addressLine2 = 'Address Line 2 is required';
    } else if (formData.addressLine2.trim().length < 5) {
      newErrors.addressLine2 = 'Address Line 2 must be at least 5 characters';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'City must be at least 2 characters';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    } else if (formData.state.trim().length < 2) {
      newErrors.state = 'State must be at least 2 characters';
    }

    if (!formData.pinCode.trim()) {
      newErrors.pinCode = 'Pin code is required';
    } else if (!/^\d{6}$/.test(formData.pinCode.trim())) {
      newErrors.pinCode = 'Please enter a valid 6-digit pin code';
    }

    const mobileRegex = /^\d{10}$/;
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!mobileRegex.test(formData.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pinCode: formData.pinCode.trim(),
          mobile: formData.mobile.trim(),
          country: formData.country.trim()
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/accounts?tab=addresses');
      } else {
        setErrors({ general: data.message || 'Failed to update address' });
      }
    } catch (err) {
      console.error('Update address error:', err);
      setErrors({ general: 'Network error or server unavailable' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Address</h2>
          <button
            onClick={() => router.push('/accounts?tab=addresses')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back to Addresses
          </button>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Home, Office"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Address Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Type</option>
              <option value="home">Home</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Address Line 1 *
            </label>
            <input
              type="text"
              value={formData.addressLine1}
              onChange={(e) => handleInputChange('addressLine1', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.addressLine1 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Flat No, Building Name"
            />
            {errors.addressLine1 && <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Address Line 2 *
            </label>
            <input
              type="text"
              value={formData.addressLine2}
              onChange={(e) => handleInputChange('addressLine2', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.addressLine2 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Street Name, Area"
            />
            {errors.addressLine2 && <p className="text-red-500 text-sm mt-1">{errors.addressLine2}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mumbai"
              />
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.state ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Maharashtra"
              />
              {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Pin Code *
              </label>
              <input
                type="text"
                value={formData.pinCode}
                onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pinCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="400001"
                maxLength={6}
              />
              {errors.pinCode && <p className="text-red-500 text-sm mt-1">{errors.pinCode}</p>}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.mobile ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="9876543210"
                maxLength={10}
              />
              {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Country *
            </label>
            <input
              type="text"
              value={formData.country}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Updating...' : 'Update Address'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EditAddressPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <EditAddressPageContent />
    </Suspense>
  );
}