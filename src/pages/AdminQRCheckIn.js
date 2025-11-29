import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Trash2,
  ChevronDown,
  ChevronUp,
  Phone
} from 'lucide-react';
import { auth, supabase } from '../lib/supabase';
import { eventsService } from '../services/eventsService';
import { qrCodeService } from '../services/qrCodeService';
import { checkInService } from '../services/checkInService';
import { useToast } from '../contexts/ToastContext';
import { canCreateEvents, isOrganizer } from '../services/roleService';
import QRCodeScanner from '../components/QRCodeScanner';

const AdminQRCheckIn = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizerUser, setIsOrganizerUser] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkedInParticipants, setCheckedInParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]); // All participants for the selected event
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, checked-in, pending
  const [sortBy, setSortBy] = useState('time'); // time, name, email
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [showParticipantDetails, setShowParticipantDetails] = useState(false); // Show/hide participant details
  const lastLoadedEventIdRef = useRef(null); // Track which event we've loaded to prevent unnecessary reloads

  // Helper function to check if an event is checkable (today or ongoing only)
  const isEventCheckable = useCallback((event) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    
    // Event is checkable if:
    // 1. It's happening today
    // 2. It's ongoing (started but not completed)
    // 3. It's not cancelled or completed
    const isToday = eventDate.getTime() === today.getTime();
    const isOngoing = event.status === 'ongoing';
    const isCancelled = event.status === 'cancelled';
    const isCompleted = event.status === 'completed';
    
    return (isToday || isOngoing) && !isCancelled && !isCompleted;
  }, []);

  // Define loadEvents before useEffects that use it
  const loadEvents = useCallback(async () => {
    if (!user) return;
    
    try {
      let eventsData;
      
      // Check role directly from user metadata instead of state
      const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
      const organizerStatus = canCreateEvents(user) || isOrganizer(user);
      
      if (adminStatus) {
        // Admins can see all events
        const { data, error } = await eventsService.getAllEvents();
        if (error) throw error;
        eventsData = data || [];
      } else if (organizerStatus) {
        // Organizers can only see their own events
        const { data, error } = await eventsService.getEvents(user.id);
        if (error) throw error;
        eventsData = data || [];
      } else {
        eventsData = [];
      }
      
      // Filter to only show checkable events (today, ongoing, or past - not future)
      const checkableEvents = eventsData.filter(event => isEventCheckable(event));
      
      // Sort by date (most recent first)
      checkableEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setEvents(checkableEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events. Please try again.');
    }
  }, [user, toast, isEventCheckable]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { user, error } = await auth.getCurrentUser();
        if (error || !user) {
          navigate('/login');
          return;
        }

        setUser(user);
        
        // Check if user is admin or organizer
        const adminStatus = user.user_metadata?.role === 'Administrator' || user.user_metadata?.role === 'Admin';
        const organizerStatus = canCreateEvents(user) || isOrganizer(user);
        
        setIsAdmin(adminStatus);
        setIsOrganizerUser(organizerStatus);
        
        // Allow access to admins and organizers
        if (!adminStatus && !organizerStatus) {
          navigate('/dashboard');
          return;
        }

        // Load events based on role (don't call loadEvents here, let the useEffect handle it)
        // This ensures state is properly set before loading
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // Reload events when user or role changes
  useEffect(() => {
    if (user && (isAdmin || isOrganizerUser) && !loading) {
      loadEvents();
    }
  }, [user, isAdmin, isOrganizerUser, loading, loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      // Only load if this is a different event than what we've already loaded
      if (lastLoadedEventIdRef.current !== selectedEventId) {
        console.log('🔄 Loading participants for new event:', selectedEventId);
        loadAllParticipants(); // Load all participants when event is selected
        lastLoadedEventIdRef.current = selectedEventId;
      }
      const event = events.find(e => e.id === selectedEventId);
      setSelectedEvent(event);
    } else {
      setSelectedEvent(null);
      setCheckedInParticipants([]);
      setAllParticipants([]);
      lastLoadedEventIdRef.current = null;
    }
  }, [selectedEventId, events]);

  // Load ALL participants for the selected event
  const loadAllParticipants = async () => {
    if (!selectedEventId) {
      console.log('⚠️ No event selected, skipping participant load');
      return;
    }
    
    try {
      console.log('📋 Loading participants for event:', selectedEventId);
      const { data: participants, error } = await eventsService.getEventParticipantsDetails(selectedEventId);
      
      if (error) {
        console.error('❌ Error fetching participants:', error);
        throw error;
      }

      console.log('📋 Raw participants response:', participants);
      console.log('📋 Number of participants:', participants?.length || 0);
      
      if (participants && participants.length > 0) {
        console.log('📋 Sample participant:', participants[0]);
        console.log('📋 All participant emails:', participants.map(p => p.email));
        console.log('📋 All participant user_ids:', participants.map(p => p.user_id));
      } else {
        console.warn('⚠️ No participants found for this event!');
        toast.warning('No participants found for this event. Make sure users have registered.');
      }

      // Store all participants
      setAllParticipants(participants || []);

      // Log all participant statuses for debugging
      console.log('📊 All participants statuses:', (participants || []).map(p => ({
        id: p.id,
        email: p.email,
        name: `${p.first_name} ${p.last_name}`,
        status: p.status,
        checked_in_at: p.checked_in_at,
        updated_at: p.updated_at
      })));

      // Filter for checked-in participants (status: 'attended' or has check-in timestamp)
      const checkedInFromDB = (participants || []).filter(p => {
        const isCheckedIn = p.status === 'attended' || p.status === 'checked-in';
        const hasCheckInTime = p.checked_in_at != null;
        
        console.log(`🔍 Participant ${p.email}: status=${p.status}, checked_in_at=${p.checked_in_at}, isCheckedIn=${isCheckedIn}, hasCheckInTime=${hasCheckInTime}`);
        
        return isCheckedIn || hasCheckInTime;
      }).map(p => ({
        ...p,
        checkInTime: p.checked_in_at || p.updated_at || new Date().toISOString()
      }));

      console.log('✅ Checked-in participants from DB:', checkedInFromDB.length);
      console.log('✅ Checked-in participants details:', checkedInFromDB.map(p => ({
        id: p.id,
        email: p.email,
        name: `${p.first_name} ${p.last_name}`,
        status: p.status,
        checked_in_at: p.checked_in_at
      })));
      
      // Always use database data as source of truth when reloading
      // The database should have the persisted check-in status
      setCheckedInParticipants(checkedInFromDB);
      console.log('✅ Set checked-in list from database:', checkedInFromDB.length, 'participants');
      
      if (checkedInFromDB.length === 0 && participants && participants.length > 0) {
        console.warn('⚠️ WARNING: Found participants but none are checked in. This might indicate a database update issue.');
      }
    } catch (error) {
      console.error('❌ Error loading participants:', error);
      toast.error(`Failed to load participants list: ${error.message || 'Unknown error'}`);
      setAllParticipants([]);
      setCheckedInParticipants([]);
    }
  };

  const loadCheckedInParticipants = async () => {
    // Reload all participants and update checked-in list
    await loadAllParticipants();
  };

  const handleQRScan = async (qrData) => {
    if (!qrData || qrData.type !== 'user_profile') {
      toast.error('Invalid QR code detected. Please scan a valid user QR code.');
      return;
    }

    if (!selectedEventId) {
      toast.warning('Please select an event before scanning a QR code.');
      setScannerOpen(false);
      return;
    }

    try {
      console.log('🔍 Scanning QR code for:', {
        userId: qrData.userId,
        email: qrData.email,
        eventId: selectedEventId
      });
      console.log('🔍 All participants in cache:', allParticipants);
      console.log('🔍 Looking for match...');

      // Check against the cached participants list first
      const participant = allParticipants.find(p => {
        const userIdMatch = p.user_id === qrData.userId;
        const emailMatch = qrData.email && p.email && p.email.toLowerCase() === qrData.email.toLowerCase();
        
        console.log('🔍 Checking participant:', {
          p_user_id: p.user_id,
          p_email: p.email,
          qr_userId: qrData.userId,
          qr_email: qrData.email,
          userIdMatch,
          emailMatch
        });
        
        return userIdMatch || emailMatch;
      });

      console.log('🔍 Found participant:', participant);

      if (!participant) {
        console.log('❌ Participant not found in cache. All participants:', allParticipants.map(p => ({
          id: p.id,
          user_id: p.user_id,
          email: p.email,
          name: `${p.first_name} ${p.last_name}`
        })));
        toast.error(`${qrData.email || 'This user'} is not registered for this event.`);
        return;
      }

      // Check if already checked in (check both database status and local list)
      const alreadyCheckedIn = participant.status === 'attended' || 
                                participant.status === 'checked-in' ||
                                checkedInParticipants.some(p => p.id === participant.id);
      
      if (alreadyCheckedIn) {
        toast.warning(`${participant.first_name || participant.email} is already checked in.`);
        return; // Don't reload, just show warning
      }

      // Update participant status directly using Supabase
      // We already have the participant, so we can update by ID
      // Try updating with checked_in_at first, if that fails, update without it
      const updateData = {
        status: 'attended'
      };
      
      // Try to add checked_in_at (might not exist if migration wasn't run)
      try {
        updateData.checked_in_at = new Date().toISOString();
      } catch (e) {
        console.warn('Could not set checked_in_at:', e);
      }

      console.log('📝 Updating participant:', participant.id, 'with data:', updateData);
      console.log('📝 Current participant status:', participant.status);

      // Step 1: Update the participant status
      const { error: updateError } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', participant.id);

      if (updateError) {
        console.error('Update error:', updateError);
        
        // If checked_in_at column doesn't exist, try without it
        if (updateError.message?.includes('checked_in_at') || updateError.message?.includes('column')) {
          console.log('⚠️ checked_in_at column might not exist, trying without it...');
          const { error: retryError } = await supabase
            .from('participants')
            .update({ status: 'attended' })
            .eq('id', participant.id);
          
          if (retryError) {
            throw new Error(retryError.message || 'Failed to update participant status');
          }
        } else {
          throw new Error(updateError.message || 'Failed to update participant status');
        }
      }

      console.log('✅ Update query succeeded, verifying update...');

      // Step 2: Wait a moment for database to commit, then fetch the updated participant
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for DB commit

      // Step 3: Fetch the updated participant to verify and get the latest data
      let fetchedParticipant = null;
      let fetchAttempts = 0;
      const maxAttempts = 3;

      while (fetchAttempts < maxAttempts && !fetchedParticipant) {
        const { data: fetched, error: fetchError } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participant.id)
          .eq('status', 'attended') // Verify status was actually updated
          .single();

        if (!fetchError && fetched) {
          fetchedParticipant = fetched;
          console.log(`✅ Successfully fetched updated participant (attempt ${fetchAttempts + 1}):`, fetchedParticipant);
          console.log('✅ Verified status:', fetchedParticipant.status);
          console.log('✅ Verified checked_in_at:', fetchedParticipant.checked_in_at);
          break;
        } else {
          fetchAttempts++;
          if (fetchAttempts < maxAttempts) {
            console.log(`⚠️ Fetch attempt ${fetchAttempts} failed, retrying...`, fetchError);
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait before retry
          } else {
            console.error('❌ All fetch attempts failed:', fetchError);
            // Try one more time without status filter
            const { data: fallbackFetch, error: fallbackError } = await supabase
              .from('participants')
              .select('*')
              .eq('id', participant.id)
              .single();
            
            if (!fallbackError && fallbackFetch) {
              fetchedParticipant = fallbackFetch;
              console.log('✅ Fallback fetch succeeded:', fetchedParticipant);
              console.log('⚠️ But status might not be updated:', fetchedParticipant.status);
            }
          }
        }
      }

      // Step 4: Use fetched data if available, otherwise construct from update
      const finalUpdatedData = fetchedParticipant || {
        ...participant,
        status: 'attended',
        checked_in_at: updateData.checked_in_at || new Date().toISOString()
      };

      console.log('✅ Final updated participant data:', finalUpdatedData);
      console.log('✅ Updated participant status:', finalUpdatedData.status);
      console.log('✅ Updated participant checked_in_at:', finalUpdatedData.checked_in_at);

      // Verify the status is actually 'attended'
      if (finalUpdatedData.status !== 'attended' && finalUpdatedData.status !== 'checked-in') {
        console.error('❌ WARNING: Participant status was not updated correctly!', {
          expected: 'attended',
          actual: finalUpdatedData.status,
          participantId: participant.id
        });
      }

      // Prepare updated participant data with check-in time
      const checkInTime = finalUpdatedData.checked_in_at || new Date().toISOString();
      const updatedParticipantData = {
        ...finalUpdatedData,
        checkInTime: checkInTime,
        checked_in_at: finalUpdatedData.checked_in_at || checkInTime
      };

      console.log('✅ Prepared updated participant data:', updatedParticipantData);

      // Update all participants list (for the expandable list)
      setAllParticipants(prev => 
        prev.map(p => 
          p.id === participant.id ? updatedParticipantData : p
        )
      );
      
      // Add to checked-in list (prevent duplicates)
      setCheckedInParticipants(prev => {
        // Check if already exists
        const exists = prev.some(p => p.id === participant.id);
        if (exists) {
          // Update existing entry
          return prev.map(p => 
            p.id === participant.id ? updatedParticipantData : p
          );
        } else {
          // Add new entry to the top
          const newList = [updatedParticipantData, ...prev];
          console.log('✅ Added to checked-in list. New count:', newList.length);
          return newList;
        }
      });

      // Show success message with participant name and timestamp
      const participantName = `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.email || 'Participant';
      const checkInTimeFormatted = new Date(checkInTime).toLocaleString();
      toast.success(`${participantName} checked in at ${checkInTimeFormatted}`);

      // Close the scanner modal after successful check-in
      setScannerOpen(false);

      // Reload participants from database after a short delay to ensure persistence
      // This ensures the list is synced with the database and will persist on refresh
      setTimeout(async () => {
        console.log('🔄 Reloading participants to verify database persistence...');
        await loadAllParticipants();
      }, 800);
    } catch (error) {
      console.error('Error checking in participant:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      toast.error(`Unable to check in participant: ${errorMessage}`);
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
      
      const checkInTime = new Date().toISOString();
      let updatedParticipant;

      if (existingParticipant) {
        // Update existing participant status to attended
        if (existingParticipant.user_id) {
          // Use user_id if available
          const { error: updateError } = await eventsService.updateParticipantStatus(
            selectedEventId,
            existingParticipant.user_id,
            'attended'
          );
          if (updateError) throw updateError;
        } else {
          // Use participant ID if no user_id
          const { error: updateError } = await eventsService.updateParticipantStatusById(
            existingParticipant.id,
            'attended'
          );
          if (updateError) throw updateError;
        }
        
        // Update local state
        updatedParticipant = {
          ...existingParticipant,
          status: 'attended',
          checked_in_at: checkInTime,
          checkInTime: checkInTime
        };
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
            status: 'attended',
            checked_in_at: checkInTime
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        
        updatedParticipant = {
          ...data,
          checkInTime: checkInTime
        };
      }

      // Update local state immediately - add to checked-in list
      setAllParticipants(prev => {
        const existing = prev.find(p => p.id === updatedParticipant.id);
        if (existing) {
          return prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p);
        } else {
          return [...prev, updatedParticipant];
        }
      });

      setCheckedInParticipants(prev => {
        // Remove if already exists (to avoid duplicates)
        const filtered = prev.filter(p => p.id !== updatedParticipant.id);
        // Add updated participant to the top
        return [updatedParticipant, ...filtered];
      });

      toast.success(`${email} has been successfully checked in.`);
    } catch (error) {
      console.error('Error manually checking in:', error);
      toast.error(`Unable to complete check-in: ${error.message || 'An unexpected error occurred. Please try again.'}`);
    }
  };

  const handleRemoveCheckIn = async (participantId, participantEmail) => {
    if (!window.confirm(`Are you sure you want to remove the check-in for ${participantEmail}? This action cannot be undone.`)) return;

    try {
      // Use updateParticipantStatusById since we have the participant ID
      const { error } = await eventsService.updateParticipantStatusById(
        participantId,
        'registered'
      );

      if (error) throw error;

      // Update local state immediately - remove from checked-in list
      setCheckedInParticipants(prev => prev.filter(p => p.id !== participantId));
      
      // Update allParticipants list to reflect status change
      setAllParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, status: 'registered', checked_in_at: null, checkInTime: null } : p
        )
      );

      toast.success(`Check-in removed for ${participantEmail}.`);
    } catch (error) {
      console.error('Error removing check-in:', error);
      toast.error(`Unable to remove check-in: ${error.message || 'An unexpected error occurred. Please try again.'}`);
    }
  };

  // Memoize filtered participants to ensure it updates when checkedInParticipants changes
  const filteredParticipants = React.useMemo(() => {
    console.log('🔄 Computing filteredParticipants from', checkedInParticipants.length, 'checked-in participants');
    console.log('🔄 Current checkedInParticipants:', checkedInParticipants);
    const filtered = checkedInParticipants
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
            comparison = new Date(a.checkInTime || 0) - new Date(b.checkInTime || 0);
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
    
    console.log('🔄 Filtered result:', filtered.length, 'participants');
    return filtered;
  }, [checkedInParticipants, searchQuery, sortBy, sortOrder]);

  // Debug: Log when checkedInParticipants changes
  useEffect(() => {
    console.log('📊 checkedInParticipants state changed:', checkedInParticipants.length, checkedInParticipants);
  }, [checkedInParticipants]);

  // Debug: Log when filteredParticipants changes
  useEffect(() => {
    console.log('📊 filteredParticipants computed:', filteredParticipants.length, filteredParticipants);
  }, [filteredParticipants, searchQuery, sortBy, sortOrder]);

  const exportCheckInList = () => {
    if (filteredParticipants.length === 0) {
      toast.warning('No checked-in participants available to export.');
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

  // Allow access to both admins and organizers
  if (!isAdmin && !isOrganizerUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <QrCode className="mr-2 sm:mr-3 text-primary-600" size={24} />
                <span className="sm:hidden">QR Check-in</span>
                <span className="hidden sm:inline">QR Code Check-in</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                {isAdmin 
                  ? 'Scan user QR codes to check them into any event' 
                  : 'Scan user QR codes to check them into your events'}
              </p>
            </div>
            <div className="flex items-center">
              {isAdmin ? (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Admin
              </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
            <Calendar className="inline mr-1.5 sm:mr-2" size={16} />
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select an event --</option>
            {events.map(event => {
              const eventDate = new Date(event.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              eventDate.setHours(0, 0, 0, 0);
              
              const isToday = eventDate.getTime() === today.getTime();
              const statusLabel = isToday ? '(Today)' : event.status === 'ongoing' ? '(Ongoing)' : '';
              
              return (
                <option key={event.id} value={event.id}>
                  {event.title} - {eventDate.toLocaleDateString()} {statusLabel}
                </option>
              );
            })}
          </select>
          
          {events.length === 0 && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs sm:text-sm text-yellow-800">
                <AlertCircle className="inline mr-1.5 sm:mr-2" size={14} />
                No events available for check-in. Events must be happening today or be ongoing to allow check-ins.
              </p>
            </div>
          )}

          {selectedEvent && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowParticipantDetails(!showParticipantDetails)}
                className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center justify-between flex-1">
                  <div className="text-left">
                    <h3 className="font-semibold text-blue-900">{selectedEvent.title}</h3>
                    <p className="text-sm text-blue-700">
                      {new Date(selectedEvent.date).toLocaleDateString()} {selectedEvent.time && (() => {
                        const formatTime = (timeStr) => {
                          if (!timeStr) return '';
                          if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
                          const [hours, minutes] = timeStr.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour % 12 || 12;
                          return `${displayHour}:${minutes} ${ampm}`;
                        };
                        const startTime = formatTime(selectedEvent.time);
                        const endTime = selectedEvent.end_time ? formatTime(selectedEvent.end_time) : null;
                        return `at ${endTime ? `${startTime} - ${endTime}` : startTime}`;
                      })()}
                    </p>
                    {selectedEvent.location && (
                      <p className="text-sm text-blue-700">{selectedEvent.location}</p>
                    )}
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-blue-900">
                      {checkedInParticipants.length} checked in
                    </p>
                    <p className="text-xs text-blue-600">
                      {allParticipants.length} total registered
                    </p>
                    {selectedEvent.max_participants && (
                      <p className="text-xs text-blue-600">
                        of {selectedEvent.max_participants} capacity
                      </p>
                    )}
                  </div>
                </div>
                {showParticipantDetails ? (
                  <ChevronUp className="text-blue-600" size={20} />
                ) : (
                  <ChevronDown className="text-blue-600" size={20} />
                )}
              </button>

              {/* Expandable Participant Details */}
              {showParticipantDetails && (
                <div className="border-t border-blue-200 p-4 bg-white">
                  <h4 className="font-semibold text-gray-900 mb-3">All Participants ({allParticipants.length})</h4>
                  {allParticipants.length === 0 ? (
                    <p className="text-sm text-gray-500">No participants registered yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`p-3 rounded-lg border ${
                            participant.status === 'attended' || participant.status === 'checked-in'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">
                                  {participant.first_name} {participant.last_name}
                                </p>
                                {participant.status === 'attended' || participant.status === 'checked-in' ? (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                    Checked In
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                                    {participant.status || 'Registered'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} />
                                  {participant.email}
                                </span>
                                {participant.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={14} />
                                    {participant.phone}
                                  </span>
                                )}
                              </div>
                              {participant.checked_in_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Checked in: {new Date(participant.checked_in_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setScannerOpen(true)}
                className="flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-xs sm:text-base"
                disabled={!selectedEventId}
              >
                <Camera size={16} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Scan QR</span>
              </button>
              <button
                onClick={handleManualCheckIn}
                className="flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs sm:text-base"
                disabled={!selectedEventId}
              >
                <User size={16} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Manual</span>
              </button>
              <button
                onClick={loadCheckedInParticipants}
                className="flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-xs sm:text-base"
              >
                <RefreshCw size={16} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Refresh</span>
              </button>
              {filteredParticipants.length > 0 && (
                <button
                  onClick={exportCheckInList}
                  className="flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-xs sm:text-base"
                >
                  <Download size={16} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Export</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Checked-in Participants List */}
        {selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Filters and Search */}
            <div className="p-3 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="time">Sort by Time</option>
                    <option value="name">Sort by Name</option>
                    <option value="email">Sort by Email</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Participants Table/List */}
            <div className="overflow-x-auto">
              {filteredParticipants.length === 0 ? (
                <div className="p-6 sm:p-12 text-center">
                  <Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">
                    {searchQuery ? 'No participants found matching your search.' : 'No participants checked in yet.'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">
                    Use the "Scan QR Code" button to check in participants.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <table className="w-full hidden sm:table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Phone
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check-in Time
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredParticipants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="text-primary-600" size={16} />
                              </div>
                              <div className="ml-3 sm:ml-4">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {participant.first_name || ''} {participant.last_name || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900 flex items-center">
                              <Mail size={14} className="mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-none">{participant.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                            {participant.phone || 'N/A'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900 flex items-center">
                              <Clock size={14} className="mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                              {new Date(participant.checkInTime).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                            <button
                              onClick={() => handleRemoveCheckIn(participant.id, participant.email)}
                              className="text-red-600 hover:text-red-900 flex items-center ml-auto"
                              title="Remove check-in"
                            >
                              <Trash2 size={14} className="mr-1" />
                              <span className="hidden md:inline">Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Card List */}
                  <div className="sm:hidden divide-y divide-gray-200">
                    {filteredParticipants.map((participant) => (
                      <div key={participant.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <User className="text-primary-600" size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {participant.first_name || ''} {participant.last_name || ''}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{participant.email || 'N/A'}</p>
                              <p className="text-xs text-gray-400 mt-1 flex items-center">
                                <Clock size={10} className="mr-1" />
                                {new Date(participant.checkInTime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCheckIn(participant.id, participant.email)}
                            className="text-red-600 p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0"
                            title="Remove check-in"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
            toast.error(`QR code scan error: ${error}. Please ensure the QR code is clear and try again.`);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminQRCheckIn;

