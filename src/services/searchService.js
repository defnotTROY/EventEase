import { supabase } from '../lib/supabase';

export const searchService = {
  // Global search across all user's data
  async globalSearch(userId, query) {
    if (!query || query.trim().length < 2) {
      return { events: [], participants: [], total: 0 };
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Search events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10);

      if (eventsError) throw eventsError;

      // Search participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
          *,
          events!inner(title, user_id)
        `)
        .eq('events.user_id', userId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(10);

      if (participantsError) throw participantsError;

      const total = (events?.length || 0) + (participants?.length || 0);

      return {
        events: events || [],
        participants: participants || [],
        total
      };
    } catch (error) {
      console.error('Error performing global search:', error);
      return { events: [], participants: [], total: 0, error: error.message };
    }
  },

  // Search only events
  async searchEvents(userId, query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  },

  // Search only participants
  async searchParticipants(userId, query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          events!inner(title, user_id)
        `)
        .eq('events.user_id', userId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .order('registration_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching participants:', error);
      return [];
    }
  }
};
