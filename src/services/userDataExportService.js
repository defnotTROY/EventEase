import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

/**
 * User Data Export Service
 * Fetches all user data and generates a downloadable PDF
 */
class UserDataExportService {
  /**
   * Fetch all data associated with a user
   * @param {string} userId - User ID
   * @param {object} user - User object from auth
   * @returns {Promise<object>} All user data
   */
  async fetchAllUserData(userId, user) {
    try {
      const userRole = user?.user_metadata?.role || 'user';
      const isOrganizer = userRole === 'Organizer' || userRole === 'organizer';
      const isAdmin = userRole === 'Administrator' || userRole === 'Admin';

      // Fetch all data in parallel
      const [
        registrationsResult,
        verificationResult,
        createdEventsResult
      ] = await Promise.all([
        // Get events user is registered for
        this.fetchUserRegistrations(userId),
        // Get verification data
        this.fetchVerificationData(userId),
        // Get events created by user (for organizers/admins)
        (isOrganizer || isAdmin) ? this.fetchCreatedEvents(userId) : Promise.resolve([])
      ]);

      // Compile all data
      return {
        exportDate: new Date().toISOString(),
        profile: {
          email: user?.email || 'N/A',
          firstName: user?.user_metadata?.first_name || 'N/A',
          lastName: user?.user_metadata?.last_name || 'N/A',
          phone: user?.user_metadata?.phone || 'N/A',
          organization: user?.user_metadata?.organization || 'N/A',
          role: userRole,
          timezone: user?.user_metadata?.timezone || 'N/A',
          language: user?.user_metadata?.language || 'English'
        },
        account: {
          id: userId,
          createdAt: user?.created_at || 'N/A',
          lastSignIn: user?.last_sign_in_at || 'N/A',
          emailVerified: user?.email_confirmed_at ? 'Yes' : 'No'
        },
        registeredEvents: registrationsResult,
        verification: verificationResult,
        createdEvents: createdEventsResult,
        notificationPreferences: user?.user_metadata?.notification_settings || {}
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  /**
   * Fetch events the user is registered for
   */
  async fetchUserRegistrations(userId) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          status,
          registration_date,
          checked_in_at,
          events (
            id,
            title,
            date,
            time,
            location,
            category,
            status
          )
        `)
        .eq('user_id', userId)
        .order('registration_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        eventTitle: p.events?.title || 'Unknown Event',
        eventDate: p.events?.date || 'N/A',
        eventTime: p.events?.time || 'N/A',
        eventLocation: p.events?.location || 'N/A',
        eventCategory: p.events?.category || 'N/A',
        eventStatus: p.events?.status || 'N/A',
        registrationDate: p.registration_date || 'N/A',
        registrationStatus: p.status || 'registered',
        checkedInAt: p.checked_in_at || null
      }));
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return [];
    }
  }

  /**
   * Fetch user's verification data
   */
  async fetchVerificationData(userId) {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      return {
        status: data.status || 'N/A',
        verificationType: data.verification_type || 'N/A',
        documentType: data.document_type || 'N/A',
        submittedAt: data.created_at || 'N/A',
        reviewedAt: data.reviewed_at || null,
        rejectionReason: data.rejection_reason || null
      };
    } catch (error) {
      console.error('Error fetching verification:', error);
      return null;
    }
  }

  /**
   * Fetch events created by the user (for organizers)
   */
  async fetchCreatedEvents(userId) {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for each event
      const eventsWithParticipants = await Promise.all(
        (events || []).map(async (event) => {
          const { data: participants } = await supabase
            .from('participants')
            .select('id, first_name, last_name, email, status, registration_date')
            .eq('event_id', event.id);

          return {
            title: event.title,
            description: event.description || 'N/A',
            date: event.date,
            time: event.time || 'N/A',
            location: event.location || 'N/A',
            category: event.category || 'N/A',
            status: event.status,
            maxParticipants: event.max_participants || 'Unlimited',
            createdAt: event.created_at,
            participantCount: participants?.length || 0,
            participants: (participants || []).map(p => ({
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/A',
              email: p.email || 'N/A',
              status: p.status || 'registered',
              registrationDate: p.registration_date || 'N/A'
            }))
          };
        })
      );

      return eventsWithParticipants;
    } catch (error) {
      console.error('Error fetching created events:', error);
      return [];
    }
  }

  /**
   * Generate and download PDF with all user data
   */
  async downloadUserDataPDF(userId, user) {
    try {
      // Fetch all data
      const data = await this.fetchAllUserData(userId, user);
      
      // Create PDF
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to add new page if needed
      const checkPageBreak = (neededSpace = 20) => {
        if (yPos + neededSpace > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Helper to add section header
      const addSectionHeader = (title) => {
        checkPageBreak(30);
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 3, yPos + 6);
        doc.setTextColor(0, 0, 0);
        yPos += 15;
      };

      // Helper to add key-value pair
      const addField = (label, value) => {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, yPos);
        doc.setFont('helvetica', 'normal');
        const valueText = String(value || 'N/A');
        doc.text(valueText, margin + 50, yPos);
        yPos += 7;
      };

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('EventEase - My Data Export', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      // Profile Section
      addSectionHeader('Profile Information');
      addField('First Name', data.profile.firstName);
      addField('Last Name', data.profile.lastName);
      addField('Email', data.profile.email);
      addField('Phone', data.profile.phone);
      addField('Organization', data.profile.organization);
      addField('Role', data.profile.role);
      addField('Timezone', data.profile.timezone);
      addField('Language', data.profile.language);
      yPos += 5;

      // Account Section
      addSectionHeader('Account Information');
      addField('Account ID', data.account.id);
      addField('Created', this.formatDate(data.account.createdAt));
      addField('Last Sign In', this.formatDate(data.account.lastSignIn));
      addField('Email Verified', data.account.emailVerified);
      yPos += 5;

      // Verification Section
      addSectionHeader('Verification Status');
      if (data.verification) {
        addField('Status', this.capitalizeFirst(data.verification.status));
        addField('Type', this.capitalizeFirst(data.verification.verificationType));
        addField('Document', this.capitalizeFirst(data.verification.documentType));
        addField('Submitted', this.formatDate(data.verification.submittedAt));
        if (data.verification.reviewedAt) {
          addField('Reviewed', this.formatDate(data.verification.reviewedAt));
        }
        if (data.verification.rejectionReason) {
          addField('Rejection Reason', data.verification.rejectionReason);
        }
      } else {
        doc.setFontSize(10);
        doc.text('No verification submitted', margin, yPos);
        yPos += 7;
      }
      yPos += 5;

      // Registered Events Section
      addSectionHeader(`Registered Events (${data.registeredEvents.length})`);
      if (data.registeredEvents.length > 0) {
        data.registeredEvents.forEach((event, index) => {
          checkPageBreak(35);
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 2, contentWidth, 28, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${event.eventTitle}`, margin + 3, yPos + 4);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`Date: ${this.formatDate(event.eventDate)} at ${event.eventTime}`, margin + 3, yPos + 11);
          doc.text(`Location: ${event.eventLocation}`, margin + 3, yPos + 17);
          doc.text(`Registration: ${this.formatDate(event.registrationDate)} | Status: ${this.capitalizeFirst(event.registrationStatus)}`, margin + 3, yPos + 23);
          
          yPos += 32;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No event registrations', margin, yPos);
        yPos += 7;
      }
      yPos += 5;

      // Created Events Section (for organizers)
      if (data.createdEvents.length > 0) {
        addSectionHeader(`Created Events (${data.createdEvents.length})`);
        data.createdEvents.forEach((event, index) => {
          checkPageBreak(45);
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 2, contentWidth, 35, 'F');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${event.title}`, margin + 3, yPos + 4);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`Date: ${this.formatDate(event.date)} at ${event.time}`, margin + 3, yPos + 11);
          doc.text(`Location: ${event.location} | Category: ${event.category}`, margin + 3, yPos + 17);
          doc.text(`Status: ${this.capitalizeFirst(event.status)} | Participants: ${event.participantCount}/${event.maxParticipants}`, margin + 3, yPos + 23);
          doc.text(`Created: ${this.formatDate(event.createdAt)}`, margin + 3, yPos + 29);
          
          yPos += 40;

          // Add participant list if any
          if (event.participants.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Participants:', margin + 5, yPos);
            yPos += 6;
            
            event.participants.slice(0, 10).forEach((p) => {
              checkPageBreak(6);
              doc.setFont('helvetica', 'normal');
              doc.text(`• ${p.name} (${p.email}) - ${this.capitalizeFirst(p.status)}`, margin + 8, yPos);
              yPos += 5;
            });
            
            if (event.participants.length > 10) {
              doc.text(`... and ${event.participants.length - 10} more`, margin + 8, yPos);
              yPos += 5;
            }
            yPos += 5;
          }
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | EventEase Data Export | Confidential`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }

      // Download
      const fileName = `EventEase_MyData_${data.profile.firstName}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      return { success: true, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  // Helper methods
  formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  capitalizeFirst(str) {
    if (!str) return 'N/A';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }
}

export const userDataExportService = new UserDataExportService();

