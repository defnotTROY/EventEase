import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, XCircle } from 'lucide-react';
import { auth } from '../lib/supabase';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'organizer', // Default to organizer
    selectedCategories: [], // User's preferred event categories
    selectedTags: [] // User's preferred tags/interests
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Email validation - must have @gmail.com or similar valid domain
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Password validation - 1 upper, 1 lower, 1 special, 1 number, 8+ chars
  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;

    return {
      isValid: hasUpperCase && hasLowerCase && hasSpecialChar && hasNumber && hasMinLength,
      checks: {
        hasUpperCase,
        hasLowerCase,
        hasSpecialChar,
        hasNumber,
        hasMinLength
      }
    };
  };

  // Phone validation - exactly 11 digits OR +country code + 10 digits
  const validatePhone = (phone) => {
    // Remove all spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Check for exactly 11 digits (no country code)
    const elevenDigits = /^\d{11}$/.test(cleanPhone);
    
    // Check for country code format (+63XXXXXXXXXX)
    const countryCodeFormat = /^\+\d{1,3}\d{10}$/.test(cleanPhone);
    
    return elevenDigits || countryCodeFormat;
  };

  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@gmail.com)';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Phone must be exactly 11 digits or include country code (+63XXXXXXXXXX)';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = 'Password does not meet requirements';
      }
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Use Supabase to sign up
      const { data, error } = await auth.signUp(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: formData.accountType, // Set user role
          selected_categories: formData.selectedCategories, // Include selected categories
          selected_tags: formData.selectedTags // Include selected tags
        }
      );
      
      if (error) {
        setErrors({ general: error.message });
        return;
      }
      
      // Show success state
      setIsSuccess(true);
      
      // Store user preferences if provided (will be saved after email confirmation)
      // The preferences are already stored in user_metadata during signup
      // They'll be used immediately for recommendations when user logs in
      
      // Always redirect to email verification page
      // Supabase will send verification email and user needs to verify before logging in
      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, 2000);
      
    } catch (error) {
      setErrors({ general: 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden w-full">
      {/* Subtle background logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="text-[#3B82F6] opacity-5 text-[6rem] sm:text-[12rem] md:text-[16rem] lg:text-[20rem] font-black tracking-wider select-none whitespace-nowrap">
          EVENTEASE
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Signup Form Section */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg w-full">
            {/* Signup Form Card */}
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Create Your Account
                </h1>
                <p className="text-sm text-gray-600">
                  Join EventEase and start managing your events
                </p>
              </div>

              {/* Success Message */}
              {isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Account Created Successfully!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Welcome to EventEase! Please complete your verification to get started. Redirecting you to verification...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  </div>
                </div>
              )}

              {!isSuccess ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
              {/* General Error Message */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* First Name */}
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        First Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleChange}
                          className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="John"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.firstName}</p>
                      )}
                    </div>

                    {/* Middle Name */}
                    <div>
                      <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Middle Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <input
                          id="middleName"
                          name="middleName"
                          type="text"
                          value={formData.middleName}
                          onChange={handleChange}
                          className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Michael"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div className="sm:col-span-2 md:col-span-1">
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Last Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleChange}
                          className={`block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors.lastName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Doe"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="john.doe@gmail.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="09123456789 or +639123456789"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Enter exactly 11 digits (09123456789) or with country code (+639123456789)
                    </p>
                  </div>

                  {/* Account Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                      Account Type *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, accountType: 'organizer' })}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all text-left ${
                          formData.accountType === 'organizer'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Event Organizer</div>
                        <div className="text-xs text-gray-600">
                          Create and manage events, access analytics, manage participants
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, accountType: 'user' })}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all text-left ${
                          formData.accountType === 'user'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Regular User</div>
                        <div className="text-xs text-gray-600">
                          Browse events and register as a participant
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Event Interests/Preferences Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                      What events interest you? <span className="text-gray-500 text-xs block sm:inline">(Optional - helps us personalize recommendations)</span>
                    </label>
                    
                    {/* Category Selection */}
                    <div className="mb-3 sm:mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Preferred Categories (Select up to 3)
                      </label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {['Academic Conference', 'Tech Summit', 'Community Event', 'Workshop', 'Seminar', 'Networking', 'Cultural Event', 'Sports Event'].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              const current = formData.selectedCategories;
                              if (current.includes(category)) {
                                setFormData({ ...formData, selectedCategories: current.filter(c => c !== category) });
                              } else if (current.length < 3) {
                                setFormData({ ...formData, selectedCategories: [...current, category] });
                              }
                            }}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-full border transition-all ${
                              formData.selectedCategories.includes(category)
                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                            } ${formData.selectedCategories.length >= 3 && !formData.selectedCategories.includes(category) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={formData.selectedCategories.length >= 3 && !formData.selectedCategories.includes(category)}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      {formData.selectedCategories.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Selected: {formData.selectedCategories.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Tags/Interests Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Additional Interests/Tags (e.g., "networking", "coding", "art", "music")
                      </label>
                      <input
                        type="text"
                        placeholder="Enter tags separated by commas (e.g., networking, coding, design)"
                        value={formData.selectedTags.join(', ')}
                        onChange={(e) => {
                          const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          setFormData({ ...formData, selectedTags: tags });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.selectedTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {formData.selectedTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, selectedTags: formData.selectedTags.filter((_, i) => i !== idx) });
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}

                    {/* Password Requirements */}
                    {formData.password && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Password Requirements:</p>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            {passwordValidation.checks.hasMinLength ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 mr-2" />
                            )}
                            <span className={passwordValidation.checks.hasMinLength ? 'text-green-600' : 'text-red-600'}>
                              At least 8 characters
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordValidation.checks.hasUpperCase ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 mr-2" />
                            )}
                            <span className={passwordValidation.checks.hasUpperCase ? 'text-green-600' : 'text-red-600'}>
                              One uppercase letter (A-Z)
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordValidation.checks.hasLowerCase ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 mr-2" />
                            )}
                            <span className={passwordValidation.checks.hasLowerCase ? 'text-green-600' : 'text-red-600'}>
                              One lowercase letter (a-z)
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordValidation.checks.hasNumber ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 mr-2" />
                            )}
                            <span className={passwordValidation.checks.hasNumber ? 'text-green-600' : 'text-red-600'}>
                              One number (0-9)
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordValidation.checks.hasSpecialChar ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 mr-2" />
                            )}
                            <span className={passwordValidation.checks.hasSpecialChar ? 'text-green-600' : 'text-red-600'}>
                              One special character (!@#$%^&*)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-center">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                      I agree to the{' '}
                      <button 
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-blue-600 hover:text-blue-500 underline"
                      >
                        Terms and Conditions
                      </button>{' '}
                      and{' '}
                      <button 
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-blue-600 hover:text-blue-500 underline"
                      >
                        Privacy Policy
                      </button>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating account...
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>

                  {/* Login Link */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <Link 
                        to="/login" 
                        className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                      >
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        {/* Terms and Conditions Modal */}
        {showTermsModal && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[100] flex items-start justify-center pt-20 pb-10 px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTermsModal(false);
              }
            }}
          >
            <div 
              className="relative p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Terms and Conditions</h3>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto text-sm text-gray-600 space-y-4">
                  <p><strong>Last updated:</strong> January 2025</p>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h4>
                    <p>By accessing and using EventEase, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">2. Use License</h4>
                    <p>Permission is granted to temporarily download one copy of EventEase for personal, non-commercial transitory viewing only.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">3. User Accounts</h4>
                    <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">4. Prohibited Uses</h4>
                    <p>You may not use our service for any unlawful purpose or to solicit others to perform unlawful acts.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">5. Content</h4>
                    <p>Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">6. Termination</h4>
                    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever.</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[100] flex items-start justify-center pt-20 pb-10 px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPrivacyModal(false);
              }
            }}
          >
            <div 
              className="relative p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Privacy Policy</h3>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto text-sm text-gray-600 space-y-4">
                  <p><strong>Last updated:</strong> January 2025</p>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">1. Information We Collect</h4>
                    <p>We collect information you provide directly to us, such as when you create an account, register for events, or contact us for support.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">2. How We Use Your Information</h4>
                    <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">3. Information Sharing</h4>
                    <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">4. Data Security</h4>
                    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">5. Cookies</h4>
                    <p>We use cookies and similar tracking technologies to enhance your experience on our service.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">6. Your Rights</h4>
                    <p>You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us.</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 EventEase. All rights reserved. | Your ultimate event management solution.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Signup;
