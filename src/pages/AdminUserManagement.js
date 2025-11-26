import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Loader2,
  RefreshCw,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { adminService } from '../services/adminService';
import { useToast } from '../contexts/ToastContext';

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Modal states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { user, error } = await auth.getCurrentUser();
        if (error || !user) {
          navigate('/login');
          return;
        }

        setUser(user);
        
        // Check if user is admin
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          navigate('/dashboard');
          return;
        }

        await loadUsers();
      } catch (error) {
        console.error('Error checking admin access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch real users and total count in parallel
      const [allUsers, totalCount] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getTotalUsers()
      ]);

      // Check if current user is admin to mark them appropriately
      if (user) {
        allUsers.forEach(userItem => {
          // If this user is the current admin user, mark them as Administrator
          if (userItem.id === user.id && (user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin')) {
            userItem.role = 'Administrator';
          }
        });
      }

      setUsers(allUsers);
      setTotalUsersCount(totalCount);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      setTotalUsersCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.organization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Administrator': return 'bg-red-100 text-red-800';
      case 'Event Organizer': return 'bg-blue-100 text-blue-800';
      case 'Viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Calculate new users this month
  const getNewUsersThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return users.filter(u => {
      if (!u.created_at) return false;
      const createdDate = new Date(u.created_at);
      return createdDate >= startOfMonth;
    }).length;
  };

  // Open status change modal
  const openStatusModal = (userItem) => {
    const statusMap = {
      'active': 'inactive',
      'inactive': 'suspended',
      'suspended': 'active'
    };
    const newStatus = statusMap[userItem.status] || 'inactive';
    setSelectedUserForAction({ ...userItem, newStatus });
    setShowStatusModal(true);
  };

  // Handle status update (called from modal)
  const confirmUpdateStatus = async () => {
    if (!selectedUserForAction) return;
    
    const { id: userId, newStatus } = selectedUserForAction;
    
    setShowStatusModal(false);
    setActionLoading(userId);
    try {
      await adminService.updateUserStatus(userId, newStatus);
      toast.success(`User status updated to ${newStatus}`);
      await loadUsers();
    } catch (error) {
      toast.error(`Unable to update user status: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setActionLoading(null);
      setSelectedUserForAction(null);
    }
  };

  // Open password reset modal
  const openResetPasswordModal = (userItem) => {
    setSelectedUserForAction(userItem);
    setShowResetPasswordModal(true);
  };

  // Handle password reset (called from modal)
  const confirmResetPassword = async () => {
    if (!selectedUserForAction) return;
    
    const userEmail = selectedUserForAction.email;
    
    setShowResetPasswordModal(false);
    try {
      // Use Supabase auth reset password
      const { error } = await auth.resetPassword(userEmail);
      if (error) throw error;
      toast.success(`Password reset email has been sent to ${userEmail}.`);
    } catch (error) {
      toast.error(`Unable to send password reset email: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setSelectedUserForAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage platform users and permissions</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadUsers}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="Administrator">Administrator</option>
                <option value="Event Organizer">Event Organizer</option>
                <option value="User">User</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsersCount || users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'active' || !u.status).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administrators</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'Administrator' || u.role === 'Admin').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{getNewUsersThisMonth()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {userItem.first_name?.[0] || ''}{userItem.last_name?.[0] || ''}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.first_name || 'Unknown'} {userItem.last_name || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">{userItem.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userItem.role)}`}>
                        {userItem.role || 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userItem.status)}`}>
                        {userItem.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userItem.organization || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userItem.last_login)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openResetPasswordModal(userItem)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Reset Password"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openStatusModal(userItem)}
                          disabled={actionLoading === userItem.id}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Change Status"
                        >
                          {actionLoading === userItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                          <UserX className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No users found</p>
                <p className="text-gray-500 mt-2">
                  {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No users in the system yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordModal && selectedUserForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedUserForAction(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedUserForAction.first_name} {selectedUserForAction.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUserForAction.email}</p>
                </div>
              </div>
              <p className="text-gray-600">
                Are you sure you want to send a password reset email to this user?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedUserForAction(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetPassword}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
              >
                Send Reset Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Confirmation Modal */}
      {showStatusModal && selectedUserForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change User Status</h3>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedUserForAction(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedUserForAction.first_name} {selectedUserForAction.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUserForAction.email}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-3">
                Are you sure you want to change this user's status?
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded-full font-medium ${
                  selectedUserForAction.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedUserForAction.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedUserForAction.status || 'active'}
                </span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-1 rounded-full font-medium ${
                  selectedUserForAction.newStatus === 'active' ? 'bg-green-100 text-green-800' :
                  selectedUserForAction.newStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedUserForAction.newStatus}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedUserForAction(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdateStatus}
                className="px-4 py-2 text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 font-medium"
              >
                Change Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
