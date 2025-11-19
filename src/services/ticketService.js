import { supabase } from '../lib/supabase';

/**
 * Ticket Service
 * Manages tickets and ticket orders for events
 */
class TicketService {
  /**
   * Get all tickets for an event
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async getTickets(eventId, options = {}) {
    try {
      const { activeOnly = false, visibleOnly = false } = options;
      
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
        .order('price', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      if (visibleOnly) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return { data: [], error };
    }
  }

  /**
   * Get a single ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>}
   */
  async getTicket(ticketId) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new ticket
   * @param {string} eventId - Event ID
   * @param {Object} ticketData - Ticket data
   * @returns {Promise<Object>}
   */
  async createTicket(eventId, ticketData) {
    try {
      const ticket = {
        event_id: eventId,
        ticket_type: ticketData.ticketType || 'General',
        name: ticketData.name,
        description: ticketData.description || null,
        price: parseFloat(ticketData.price) || 0,
        currency: ticketData.currency || 'USD',
        quantity: ticketData.quantity ? parseInt(ticketData.quantity) : null,
        min_per_order: parseInt(ticketData.minPerOrder) || 1,
        max_per_order: ticketData.maxPerOrder ? parseInt(ticketData.maxPerOrder) : null,
        sale_start_date: ticketData.saleStartDate || null,
        sale_end_date: ticketData.saleEndDate || null,
        is_active: ticketData.isActive !== undefined ? ticketData.isActive : true,
        is_visible: ticketData.isVisible !== undefined ? ticketData.isVisible : true,
        sort_order: parseInt(ticketData.sortOrder) || 0,
        metadata: ticketData.metadata || {}
      };

      // Calculate initial available count
      if (ticket.quantity !== null) {
        ticket.available = ticket.quantity;
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert([ticket])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a ticket
   * @param {string} ticketId - Ticket ID
   * @param {Object} ticketData - Updated ticket data
   * @returns {Promise<Object>}
   */
  async updateTicket(ticketId, ticketData) {
    try {
      const updateData = {};

      if (ticketData.name !== undefined) updateData.name = ticketData.name;
      if (ticketData.description !== undefined) updateData.description = ticketData.description;
      if (ticketData.ticketType !== undefined) updateData.ticket_type = ticketData.ticketType;
      if (ticketData.price !== undefined) updateData.price = parseFloat(ticketData.price);
      if (ticketData.currency !== undefined) updateData.currency = ticketData.currency;
      if (ticketData.quantity !== undefined) {
        updateData.quantity = ticketData.quantity ? parseInt(ticketData.quantity) : null;
      }
      if (ticketData.minPerOrder !== undefined) updateData.min_per_order = parseInt(ticketData.minPerOrder);
      if (ticketData.maxPerOrder !== undefined) {
        updateData.max_per_order = ticketData.maxPerOrder ? parseInt(ticketData.maxPerOrder) : null;
      }
      if (ticketData.saleStartDate !== undefined) updateData.sale_start_date = ticketData.saleStartDate;
      if (ticketData.saleEndDate !== undefined) updateData.sale_end_date = ticketData.saleEndDate;
      if (ticketData.isActive !== undefined) updateData.is_active = ticketData.isActive;
      if (ticketData.isVisible !== undefined) updateData.is_visible = ticketData.isVisible;
      if (ticketData.sortOrder !== undefined) updateData.sort_order = parseInt(ticketData.sortOrder);
      if (ticketData.metadata !== undefined) updateData.metadata = ticketData.metadata;

      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating ticket:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a ticket
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>}
   */
  async deleteTicket(ticketId) {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a ticket order
   * @param {string} eventId - Event ID
   * @param {string} ticketId - Ticket ID
   * @param {number} quantity - Number of tickets
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async createOrder(eventId, ticketId, quantity, userId) {
    try {
      // Get ticket details
      const { data: ticket, error: ticketError } = await this.getTicket(ticketId);
      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      // Validate ticket availability
      if (!ticket.is_active) {
        throw new Error('This ticket type is not currently available');
      }

      if (ticket.quantity !== null && ticket.available < quantity) {
        throw new Error(`Only ${ticket.available} tickets available`);
      }

      if (quantity < ticket.min_per_order) {
        throw new Error(`Minimum ${ticket.min_per_order} ticket(s) required`);
      }

      if (ticket.max_per_order && quantity > ticket.max_per_order) {
        throw new Error(`Maximum ${ticket.max_per_order} ticket(s) allowed per order`);
      }

      // Check sale dates
      const now = new Date();
      if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) {
        throw new Error('Ticket sales have not started yet');
      }

      if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) {
        throw new Error('Ticket sales have ended');
      }

      // Calculate prices
      const unitPrice = parseFloat(ticket.price);
      const totalPrice = unitPrice * quantity;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const order = {
        event_id: eventId,
        user_id: userId,
        ticket_id: ticketId,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        currency: ticket.currency,
        order_number: orderNumber,
        status: 'pending',
        payment_status: totalPrice === 0 ? 'paid' : 'pending',
        payment_method: totalPrice === 0 ? 'free' : null
      };

      const { data, error } = await supabase
        .from('ticket_orders')
        .insert([order])
        .select()
        .single();

      if (error) throw error;

      // If free ticket, automatically complete the order
      if (totalPrice === 0) {
        return await this.completeOrder(data.id);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error creating ticket order:', error);
      return { data: null, error };
    }
  }

  /**
   * Complete a ticket order (mark as completed)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>}
   */
  async completeOrder(orderId) {
    try {
      const { data, error } = await supabase
        .from('ticket_orders')
        .update({
          status: 'completed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error completing order:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's ticket orders
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserOrders(userId) {
    try {
      const { data, error } = await supabase
        .from('ticket_orders')
        .select(`
          *,
          tickets (*),
          events (id, title, date, time, location)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return { data: [], error };
    }
  }

  /**
   * Get orders for an event (for organizers)
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>}
   */
  async getEventOrders(eventId) {
    try {
      const { data, error } = await supabase
        .from('ticket_orders')
        .select(`
          *,
          tickets (*),
          users:user_id (id, email)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching event orders:', error);
      return { data: [], error };
    }
  }

  /**
   * Check if ticket is available for purchase
   * @param {Object} ticket - Ticket object
   * @returns {Object} { available: boolean, reason: string }
   */
  checkTicketAvailability(ticket) {
    const now = new Date();

    if (!ticket.is_active) {
      return { available: false, reason: 'This ticket type is not currently available' };
    }

    if (ticket.quantity !== null && ticket.available <= 0) {
      return { available: false, reason: 'Sold out' };
    }

    if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) {
      return { available: false, reason: 'Sales start soon' };
    }

    if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) {
      return { available: false, reason: 'Sales have ended' };
    }

    return { available: true, reason: null };
  }
}

export const ticketService = new TicketService();

