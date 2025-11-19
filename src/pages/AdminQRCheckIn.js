import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Users,
  Search,
  Filter,
  Shield,
  Clock,
  Mail,
  User,
  Download,
  Trash2
} from 'lucide-react';
import { auth, supabase } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { qrCodeService } from '../services/qrCodeService';
import QRCodeScanner from '../components/QRCodeScanner';

const AdminQRCheckIn = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkedInParticipants, setCheckedInParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, checked-in, pending
  const [sortBy, setSortBy] = useState('time'); // time, name, email
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

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

        await loadEvents();
        await loadCheckedInParticipants();
      } catch (error) {
        console.error('Error checking admin access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  useEffect(() => {
    if (selectedEventId) {
      loadCheckedInParticipants();
      const event = events.find(e => e.id === selectedEventId);
      setSelectedEvent(event);
    } else {
      setSelectedEvent(null);
      setCheckedInParticipants([]);
    }
  }, [selectedEventId, events]);

  const loadEvents = async () => {
    try {
      const { data, error } = await eventsService.getAllEvents();
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadCheckedInParticipants = async () => {
    if (!selectedEventId) return;
    
    try {
      const { data: participants, error } = await eventsService.getEventParticipantsDetails(selectedEventId);
      if (error) throw error;

      // Filter for checked-in participants (status: 'attended' or has check-in timestamp)
      const checkedIn = (participants || []).filter(p => 
        p.status === 'attended' || p.status === 'checked-in'
      ).map(p => ({
        ...p,
        checkInTime: p.checked_in_at || p.updated_at || new Date().toISOString()
      }));

      setCheckedInParticipants(checkedIn);
    } catch (error) {
      console.error('Error loading checked-in participants:', error);
    }
  };

  const handleQRScan = async (qrData) => {
    if (!qrData || qrData.type !== 'user_profile') {
      alert('Invalid QR code. Please scan a user QR code.');
      return;
    }

    if (!selectedEventId) {
      alert('Please select an event first.');
      setScannerOpen(false);
      return;
    }

    try {
      // Check if user is already registered for this event
      const { data: isRegistered } = await eventsService.isUserRegistered(selectedEventId, qrData.userId);
      
      if (!isRegistered) {
        // Register the user first
        const { error: registerError } = await eventsService.registerForEvent(selectedEventId, {
          userId: qrData.userId,
          firstName: qrData.firstName || 'User',
          lastName: qrData.lastName || '',
          email: qrData.email,
          phone: qrData.phone || ''
        });

        if (registerError) throw registerError;
      }

      // Update participant status to 'attended' (checked-in)
      const { error: updateError } = await eventsService.updateParticipantStatus(
        selectedEventId,
        qrData.userId,
        'attended'
      );

      if (updateError) throw updateError;

      // Reload checked-in participants
      await loadCheckedInParticipants();
      setScannerOpen(false);
      
      alert(`Successfully checked in ${qrData.email} to ${selectedEvent?.title || 'the event'}`);
    } catch (error) {
      console.error('Error checking in participant:', error);
      alert(`Failed to check in participant: ${error.message || 'Unknown error'}`);
    }
  };

  const handleManualCheckIn = async () => {
    const email = prompt('Enter user email to check in:');
    if (!email) return;

    const firstName = prompt('Enter first name (optional):') || 'User';
    const lastName = prompt('Enter last name (optional):') || '';
    const phone = prompt('Enter phone number (optional):') || '';

    try {
      // Find participant by email in this event
      const { data: participants, error: fetchError } = await eventsService.getEventParticipantsDetails(selectedEventId);
      
      if (fetchError) throw fetchError;

      const existingParticipant = participants?.find(p => p.email?.toLowerCase() === email.toLowerCase());
      
      if (existingParticipant) {
        // Update existing participant status to attended
        const { error: updateError } = await eventsService.updateParticipantStatus(
          selectedEventId,
          existingParticipant.user_id || existingParticipant.id,
          'attended'
        );

        if (updateError) throw updateError;
      } else {
        // Create new participant entry (manual check-in without user account)
        const { data, error: insertError } = await supabase
          .from('participants')
          .insert([{
            event_id: selectedEventId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            status: 'attended'
          }])
          .select()
          .single();

        if (insertError) throw insertError;
      }

      await loadCheckedInParticipants();
      alert(`Successfully checked in ${email}`);
    } catch (error) {
      console.error('Error manually checking in:', error);
      alert(`Failed to check in: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRemoveCheckIn = async (participantId, participantEmail) => {
    if (!window.confirm(`Remove check-in for ${participantEmail}?`)) return;

    try {
      const { error } = await eventsService.updateParticipantStatus(
        selectedEventId,
        participantId,
        'registered'
      );

      if (error) throw error;

      await loadCheckedInParticipants();
    } catch (error) {
      console.error('Error removing check-in:', error);
      alert(`Failed to remove check-in: ${error.message || 'Unknown error'}`);
    }
  };

  const filteredParticipants = checkedInParticipants
    .filter(p => {
      const matchesSearch = 
        (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'time':
          comparison = new Date(a.checkInTime) - new Date(b.checkInTime);
          break;
        case 'name':
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'email':
          comparison = (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const exportCheckInList = () => {
    if (filteredParticipants.length === 0) {
      alert('No participants to export');
      return;
    }

    const csv = [
      ['Name', 'Email', 'Phone', 'Check-in Time'].join(','),
      ...filteredParticipants.map(p => [
        `"${p.first_name || ''} ${p.last_name || ''}"`,
        p.email || '',
        p.phone || '',
        new Date(p.checkInTime).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `check-in-list-${selectedEvent?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'event'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <QrCode className="mr-3 text-primary-600" size={32} />
                QR Code Check-in
              </h1>
              <p className="text-gray-600 mt-2">Scan user QR codes to check them into events</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="inline mr-2" size={18} />
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select an event --</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>

          {selectedEvent && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{selectedEvent.title}</h3>
                  <p className="text-sm text-blue-700">
                    {new Date(selectedEvent.date).toLocaleDateString()} {selectedEvent.time && `at ${selectedEvent.time}`}
                  </p>
                  {selectedEvent.location && (
                    <p className="text-sm text-blue-700">{selectedEvent.location}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-900">
                    {checkedInParticipants.length} checked in
                  </p>
                  {selectedEvent.max_participants && (
                    <p className="text-xs text-blue-600">
                      of {selectedEvent.max_participants} capacity
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setScannerOpen(true)}
                className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                disabled={!selectedEventId}
              >
                <Camera size={20} className="mr-2" />
                Scan QR Code
              </button>
              <button
                onClick={handleManualCheckIn}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={!selectedEventId}
              >
                <User size={20} className="mr-2" />
                Manual Check-in
              </button>
              <button
                onClick={loadCheckedInParticipants}
                className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                <RefreshCw size={20} className="mr-2" />
                Refresh List
              </button>
              {filteredParticipants.length > 0 && (
                <button
                  onClick={exportCheckInList}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Download size={20} className="mr-2" />
                  Export List
                </button>
              )}
            </div>
          </div>
        )}

        {/* Checked-in Participants List */}
        {selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Filters and Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="time">Sort by Time</option>
                    <option value="name">Sort by Name</option>
                    <option value="email">Sort by Email</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Participants Table */}
            <div className="overflow-x-auto">
              {filteredParticipants.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    {searchQuery ? 'No participants found matching your search.' : 'No participants checked in yet.'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Use the "Scan QR Code" button to check in participants.
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-in Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <User className="text-primary-600" size={20} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {participant.first_name || ''} {participant.last_name || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Mail size={16} className="mr-2 text-gray-400" />
                            {participant.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Clock size={16} className="mr-2 text-gray-400" />
                            {new Date(participant.checkInTime).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveCheckIn(participant.user_id || participant.id, participant.email)}
                            className="text-red-600 hover:text-red-900 flex items-center ml-auto"
                            title="Remove check-in"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Summary */}
            {filteredParticipants.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <strong>{filteredParticipants.length}</strong> of <strong>{checkedInParticipants.length}</strong> checked-in participants
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Event Selected Message */}
        {!selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Selected</h3>
            <p className="text-gray-600">Please select an event above to start checking in participants.</p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <QRCodeScanner
          onScan={handleQRScan}
          onError={(error) => {
            console.error('QR scan error:', error);
            alert(`Scan error: ${error}`);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminQRCheckIn;

