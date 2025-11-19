import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Eye, 
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { auth } from '../lib/supabase';
import { verificationService } from '../services/verificationService';
import { storageService } from '../services/storageService';

const AdminVerificationReview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [filteredVerifications, setFilteredVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    action: '', // 'approve' or 'reject'
    rejectionReason: '',
    adminNotes: ''
  });
  const [documentUrl, setDocumentUrl] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processing, setProcessing] = useState(false);

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

        await loadVerifications();
      } catch (error) {
        console.error('Error checking admin access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await verificationService.getPendingVerifications({
        status: statusFilter === 'all' ? 'all' : statusFilter,
        limit: 100
      });

      if (error) throw error;
      setVerifications(data || []);
      setFilteredVerifications(data || []);
    } catch (error) {
      console.error('Error loading verifications:', error);
      setVerifications([]);
      setFilteredVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = verifications;

    if (searchQuery) {
      filtered = filtered.filter(verification => 
        verification.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.verification_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.document_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVerifications(filtered);
  }, [verifications, searchQuery]);

  useEffect(() => {
    loadVerifications();
  }, [statusFilter]);

  const handleViewVerification = async (verification) => {
    setSelectedVerification(verification);
    setReviewModalOpen(true);
    setLoadingDocument(true);
    setDocumentUrl(null);

    try {
      // Get signed URL for the document
      const { data: url, error } = await storageService.getVerificationDocumentUrl(
        verification.file_path,
        3600 // 1 hour expiry
      );

      if (error) throw error;
      setDocumentUrl(url);
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Failed to load document. Please try again.');
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleReview = async () => {
    if (!selectedVerification || !reviewData.action) {
      alert('Please select an action (Approve or Reject)');
      return;
    }

    if (reviewData.action === 'reject' && !reviewData.rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      if (reviewData.action === 'approve') {
        const { error } = await verificationService.approveVerification(
          selectedVerification.id,
          user.id,
          reviewData.adminNotes || null
        );
        if (error) throw error;
      } else {
        const { error } = await verificationService.rejectVerification(
          selectedVerification.id,
          user.id,
          reviewData.rejectionReason,
          reviewData.adminNotes || null
        );
        if (error) throw error;
      }

      // Reload verifications
      await loadVerifications();
      
      // Close modal and reset
      setReviewModalOpen(false);
      setSelectedVerification(null);
      setReviewData({
        action: '',
        rejectionReason: '',
        adminNotes: ''
      });
      setDocumentUrl(null);
      
      alert(`Verification ${reviewData.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error reviewing verification:', error);
      alert(`Failed to ${reviewData.action} verification. Please try again.`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected': return <XCircle size={16} className="text-red-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'under_review': return <AlertCircle size={16} className="text-blue-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading verifications...</p>
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
          <p className="text-gray-600">You don't have permission to access verification review.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Verification Review</h1>
              <p className="text-gray-600 mt-1">Review and approve/reject user verification documents</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadVerifications}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, type..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredVerifications.length}</span> verification{filteredVerifications.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        </div>

        {/* Verifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredVerifications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredVerifications.map((verification) => (
                <div key={verification.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {verification.users?.email || 'Unknown User'}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(verification.status)}`}>
                          {getStatusIcon(verification.status)}
                          <span className="ml-1 capitalize">{verification.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Verification Type</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{verification.verification_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Document Type</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{verification.document_type.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(verification.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {verification.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600 font-medium mb-1">Previous Rejection Reason:</p>
                          <p className="text-sm text-red-800">{verification.rejection_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => handleViewVerification(verification)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No verifications found</p>
              <p className="text-sm text-gray-500">
                {statusFilter === 'pending' 
                  ? 'No pending verifications at this time.'
                  : 'No verifications match your search criteria.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedVerification && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReviewModalOpen(false);
              setSelectedVerification(null);
              setDocumentUrl(null);
              setReviewData({
                action: '',
                rejectionReason: '',
                adminNotes: ''
              });
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Review Verification</h2>
                <button
                  onClick={() => {
                    setReviewModalOpen(false);
                    setSelectedVerification(null);
                    setDocumentUrl(null);
                    setReviewData({
                      action: '',
                      rejectionReason: '',
                      adminNotes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedVerification.users?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Verification Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedVerification.verification_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Document Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedVerification.document_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Submitted</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedVerification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Verification Document</h3>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {loadingDocument ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    </div>
                  ) : documentUrl ? (
                    <div className="space-y-4">
                      {selectedVerification.mime_type?.startsWith('image/') ? (
                        <img
                          src={documentUrl}
                          alt="Verification document"
                          className="max-w-full h-auto mx-auto rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-4">
                            {selectedVerification.document_name}
                          </p>
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Document
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Failed to load document</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Review Action</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setReviewData(prev => ({ ...prev, action: 'approve' }))}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      reviewData.action === 'approve'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className={`h-6 w-6 ${reviewData.action === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Approve</p>
                        <p className="text-sm text-gray-500">Verify this user's identity</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setReviewData(prev => ({ ...prev, action: 'reject' }))}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      reviewData.action === 'reject'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <XCircle className={`h-6 w-6 ${reviewData.action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Reject</p>
                        <p className="text-sm text-gray-500">Reject this verification</p>
                      </div>
                    </div>
                  </button>
                </div>

                {reviewData.action === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={reviewData.rejectionReason}
                      onChange={(e) => setReviewData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Please provide a clear reason for rejection so the user can resubmit with correct documents..."
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={reviewData.adminNotes}
                    onChange={(e) => setReviewData(prev => ({ ...prev, adminNotes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Internal notes (not visible to user)..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setReviewModalOpen(false);
                  setSelectedVerification(null);
                  setDocumentUrl(null);
                  setReviewData({
                    action: '',
                    rejectionReason: '',
                    adminNotes: ''
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing || !reviewData.action || (reviewData.action === 'reject' && !reviewData.rejectionReason.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  reviewData.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processing ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  reviewData.action === 'approve' ? 'Approve Verification' : 'Reject Verification'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationReview;

