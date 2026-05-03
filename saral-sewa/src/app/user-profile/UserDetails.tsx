// UserDetails.tsx
import React, { useState, useEffect } from 'react';

// Define the type for your user profile data
interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  address: string;
  username: string;
  state: string;
  registered_on: string;
}

interface UserDetailsProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

interface UpdateRequest {
  full_name?: string;
  username?: string;
  dob?: string;
  gender?: string;
  state?: string;
  address?: string;
  phone?: string;
}

interface DropdownOption {
  keyCode: string;
  gender?: string;
  state?: string;
}

const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different input formats and ensure country code is included
  if (cleaned.length === 10) {
    // Indian number without country code: 9876543210 -> +919876543210
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Indian number with country code: 919876543210 -> +919876543210  
    return `+${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
    // Indian number with 0 prefix: 0919876543210 -> +919876543210
    return `+${cleaned.substring(1)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already has country code without +: 919876543210 -> +919876543210
    return `+${cleaned}`;
  }
  
  // If it already starts with + or other formats, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume it needs +91 prefix if it's 10 digits
  return cleaned.length === 10 ? `+91${cleaned}` : phone;
};

const UserDetails: React.FC<UserDetailsProps> = ({ userProfile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateRequest>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  // New state for dropdown options
  const [genderOptions, setGenderOptions] = useState<DropdownOption[]>([]);
  const [stateOptions, setStateOptions] = useState<DropdownOption[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);

  // Fetch dropdown options on component mount
  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  const fetchDropdownOptions = async () => {
    try {
      setDropdownsLoading(true);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

      // Fetch genders
      const genderResponse = await fetch(`${API_BASE_URL}/dropdowns/genders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const genderData = await genderResponse.json();
      if (genderData.status === 1) {
        setGenderOptions(genderData.data);
      }

      // Fetch states
      const stateResponse = await fetch(`${API_BASE_URL}/dropdowns/states`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const stateData = await stateResponse.json();
      if (stateData.status === 1) {
        setStateOptions(stateData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dropdown options:', err);
    } finally {
      setDropdownsLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Helper function to format date for input
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    // Initialize edit data with current values
    setEditData({
      full_name: userProfile?.full_name || '',
      username: userProfile?.username || '',
      dob: userProfile?.dob || '',
      gender: userProfile?.gender || '',
      state: userProfile?.state || '',
      address: userProfile?.address || '',
      phone: userProfile?.phone ? '' : '', // Only allow phone if not present
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setError(null);
    setShowPhoneOtp(false);
    setOtpSent(false);
    setPhoneOtp('');
    setPhoneVerified(false);
    setOtpLoading(false);
    setVerifyLoading(false);
  };

  const handleInputChange = (field: keyof UpdateRequest, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));

    // Show phone OTP section if phone is being added and reset verification state
    if (field === 'phone') {
      if (value && !userProfile?.phone) {
        setShowPhoneOtp(true);
        setPhoneVerified(false);
        setOtpSent(false);
        setPhoneOtp('');
      } else if (!value) {
        setShowPhoneOtp(false);
        setOtpSent(false);
        setPhoneVerified(false);
        setPhoneOtp('');
      }
    }
  };

  const sendPhoneOtp = async () => {
    if (!editData.phone) return;

    try {
      setOtpLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      // Normalize phone number before sending
      const normalizedPhone = normalizePhoneNumber(editData.phone);
      
      console.log('🔍 DEBUG - Original phone:', editData.phone);
      console.log('🔍 DEBUG - Normalized phone:', normalizedPhone);
      
      const response = await fetch(`${API_BASE_URL}/auth/otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          action: 'update_phone',
          email: userProfile?.email
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status === 1) {
        setOtpSent(true);
        setError(null);
        // Update edit data with normalized phone
        setEditData(prev => ({
          ...prev,
          phone: normalizedPhone
        }));
      } else if (response.status === 409) {
        setError('This phone number is already registered by another user');
      } else if (response.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!editData.phone || !phoneOtp) {
      setError('Please enter the OTP');
      return;
    }

    try {
      setVerifyLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      // Normalize phone number before sending
      const normalizedPhone = normalizePhoneNumber(editData.phone);
      
      console.log('🔍 DEBUG - Verifying OTP for phone:', normalizedPhone);
      
      const response = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          otp: phoneOtp,
          email: userProfile?.email
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status === 1) {
        setPhoneVerified(true);
        setError(null);
      } else {
        setError(data.message || 'Invalid or expired OTP');
        setPhoneVerified(false);
      }
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      setError(err.message || 'OTP verification failed');
      setPhoneVerified(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!editData.phone) return;

    try {
      setOtpLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      
      const normalizedPhone = normalizePhoneNumber(editData.phone);
      
      const response = await fetch(`${API_BASE_URL}/auth/otp/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          action: 'update_phone',
          email: userProfile?.email
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status === 1) {
        setPhoneOtp(''); // Clear previous OTP
        setPhoneVerified(false); // Reset verification state
        setError(null);
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  
      // Filter out empty/unchanged values
      const updatePayload: UpdateRequest = {};
      Object.entries(editData).forEach(([key, value]) => {
        if (value && value.trim() && value !== userProfile?.[key as keyof UserProfile]) {
          if (key === 'phone') {
            // Only allow phone update if user doesn't have one AND it's verified
            if (userProfile?.phone) {
              setError('Phone number already exists and cannot be changed.');
              return;
            }
            if (!phoneVerified) {
              setError('Please verify your phone number before saving.');
              return;
            }
            updatePayload[key as keyof UpdateRequest] = normalizePhoneNumber(value.trim());
          } else if (key === 'dob') {
            // Format date as DD-MM-YYYY for backend validation
            const dateValue = new Date(value.trim());
            if (!isNaN(dateValue.getTime())) {
              const day = dateValue.getDate().toString().padStart(2, '0');
              const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
              const year = dateValue.getFullYear();
              updatePayload[key as keyof UpdateRequest] = `${day}-${month}-${year}`;
            }
          } else {
            updatePayload[key as keyof UpdateRequest] = value.trim();
          }
        }
      });
  
      // If no changes, just exit edit mode
      if (Object.keys(updatePayload).length === 0) {
        setIsEditing(false);
        return;
      }
  
      console.log('🔍 DEBUG - Sending update payload:', updatePayload);
  
      const response = await fetch(`${API_BASE_URL}/auth/profile/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });
  
      console.log('🔍 DEBUG - Response status:', response.status);
  
      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('🔍 DEBUG - Non-JSON response:', text);
        throw new Error(`Server returned ${response.status}: ${text}`);
      }
  
      console.log('🔍 DEBUG - Response data:', data);
  
      if (response.ok && data.status === 1) {
        // Update the parent component with new profile data
        const updatedProfile = { ...userProfile, ...updatePayload } as UserProfile;
        onProfileUpdate(updatedProfile);
        setIsEditing(false);
        setShowPhoneOtp(false);
        setOtpSent(false);
        setPhoneOtp('');
        setPhoneVerified(false);
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          setError('API endpoint not found. Please check if the server is running correctly.');
        } else if (response.status === 422) {
          setError(`Validation error: ${data?.message || 'Please check your input data format.'}`);
        } else if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(data?.message || `Server error (${response.status}): Failed to update profile`);
        }
      }
    } catch (err: any) {
      console.error('🔍 DEBUG - Catch error:', err);
      
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error: Cannot connect to server. Please check if the server is running.');
      } else {
        setError(err.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    label: string,
    field: keyof UserProfile,
    type: 'text' | 'email' | 'tel' | 'date' | 'select' = 'text',
    options?: DropdownOption[],
    disabled: boolean = false
  ) => {
    const isPhoneField = field === 'phone';
    const canEditPhone = isPhoneField && !userProfile?.phone;
    const fieldDisabled = disabled || (isPhoneField && !canEditPhone);

    if (isEditing && !fieldDisabled) {
      if (type === 'select' && options) {
        const fieldKey = field === 'gender' ? 'gender' : field === 'state' ? 'state' : 'value';
        
        return (
          <div className="col-xl-3 col-md-4 mb-3">
            <label>{label}</label>
            <select
              className="form-control"
              value={editData[field as keyof UpdateRequest] || ''}
              onChange={(e) => handleInputChange(field as keyof UpdateRequest, e.target.value)}
              disabled={dropdownsLoading}
            >
              <option value="">
                {dropdownsLoading ? 'Loading...' : `Select ${label}`}
              </option>
              {options.map(option => (
                <option key={option.keyCode} value={option[fieldKey as keyof DropdownOption]}>
                  {option[fieldKey as keyof DropdownOption]}
                </option>
              ))}
            </select>
          </div>
        );
      }

      return (
        <div className="col-xl-3 col-md-4 mb-3">
          <label>{label}</label>
          <div className="input-group">
            <input
              type={type}
              className="form-control"
              value={type === 'date' ? formatDateForInput(editData[field as keyof UpdateRequest]) : (editData[field as keyof UpdateRequest] || '')}
              onChange={(e) => handleInputChange(field as keyof UpdateRequest, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            {isPhoneField && canEditPhone && editData.phone && phoneVerified && (
              <div className="input-group-text bg-success text-white">
                <i className="fa fa-check" aria-hidden="true"></i>
              </div>
            )}
          </div>
          {isPhoneField && canEditPhone && editData.phone && (
            <div className="mt-2">
              {!otpSent ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={sendPhoneOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={resendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>
              )}
              {/* Visual feedback for normalization */}
              {editData.phone !== normalizePhoneNumber(editData.phone) && (
                <div className="text-muted small mt-1">
                  Will be saved as: {normalizePhoneNumber(editData.phone)}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Display mode
    let displayValue = userProfile?.[field] || 'Not provided';
    if (field === 'dob' || field === 'registered_on') {
      displayValue = formatDate(userProfile?.[field]);
    }

    return (
      <div className="col-xl-3 col-md-4 mb-3">
        <label>{label}</label>
        <p>
          {displayValue}
          {isPhoneField && !userProfile?.phone && (
            <span className="text-muted ms-2">(Can be added)</span>
          )}
        </p>
      </div>
    );
  };

  // Check if save should be disabled
  const isSaveDisabled = () => {
    if (loading) return true;
    
    // If phone is being updated, it must be verified
    if (editData.phone && !userProfile?.phone && !phoneVerified) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="row user-details">
      {error && (
        <div className="col-12 mb-3">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      )}

      {renderField('Name', 'full_name')}
      {renderField('Email', 'email', 'email', undefined, true)} {/* Always disabled */}
      {renderField('Mobile', 'phone', 'tel')}
      <div className="col-xl-3 col-0"></div>
      
      {renderField('Gender', 'gender', 'select', genderOptions)}
      {renderField('DOB', 'dob', 'date')}
      {renderField('Address', 'address')}
      
      {renderField('Username', 'username')}
      {renderField('State', 'state', 'select', stateOptions)}
      {renderField('Registered On', 'registered_on', 'text', undefined, true)} {/* Always disabled */}

      {/* Phone OTP Verification Section */}
      {showPhoneOtp && isEditing && otpSent && (
        <div className="col-12 mb-3">
          <div className={`card border-${phoneVerified ? 'success' : 'warning'}`}>
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <h6 className="mb-0">Phone Verification Required</h6>
                {phoneVerified && (
                  <span className="badge bg-success ms-2">
                    <i className="fa fa-check me-1" aria-hidden="true"></i>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-muted small mb-3">
                Please verify your phone number with the OTP sent to {normalizePhoneNumber(editData.phone || '')}
              </p>
              
              {!phoneVerified ? (
                <div className="row align-items-end">
                  <div className="col-md-4">
                    <label className="form-label small">Enter OTP</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter 6-digit OTP"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={verifyPhoneOtp}
                      disabled={verifyLoading || !phoneOtp || phoneOtp.length !== 6}
                    >
                      {verifyLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success mb-0">
                  <i className="fa fa-check-circle me-2" aria-hidden="true"></i>
                  Phone number successfully verified! You can now save your profile.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="col-12 mt-lg-5 mt-md-4 mt-3 text-end">
        {isEditing ? (
          <div>
            <button 
              className="btn btn-secondary me-2 py-2 px-4"
              onClick={handleCancelEdit}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary py-2 px-4"
              onClick={handleSave}
              disabled={isSaveDisabled()}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            {editData.phone && !userProfile?.phone && !phoneVerified && (
              <div className="text-muted small mt-2">
                Please verify your phone number to enable saving
              </div>
            )}
          </div>
        ) : (
          <button 
            className="btn btn-primary py-2 px-4"
            onClick={handleEditClick}
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default UserDetails;