-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type VARCHAR(100) NOT NULL, -- e.g., 'General Admission', 'VIP', 'Early Bird', 'Student'
  name VARCHAR(255) NOT NULL, -- Display name
  description TEXT, -- Description of what's included
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  quantity INTEGER, -- Total quantity available (NULL = unlimited)
  sold INTEGER DEFAULT 0, -- Number of tickets sold
  available INTEGER, -- Calculated: quantity - sold (NULL if quantity is NULL)
  min_per_order INTEGER DEFAULT 1, -- Minimum tickets per order
  max_per_order INTEGER, -- Maximum tickets per order (NULL = unlimited)
  sale_start_date TIMESTAMPTZ, -- When ticket sales start
  sale_end_date TIMESTAMPTZ, -- When ticket sales end
  is_active BOOLEAN DEFAULT TRUE, -- Whether this ticket type is currently available
  is_visible BOOLEAN DEFAULT TRUE, -- Whether to show this ticket type publicly
  sort_order INTEGER DEFAULT 0, -- Order in which tickets are displayed
  metadata JSONB DEFAULT '{}', -- Additional metadata (e.g., access level, benefits)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_active ON tickets(is_active);
CREATE INDEX IF NOT EXISTS idx_tickets_is_visible ON tickets(is_visible);
CREATE INDEX IF NOT EXISTS idx_tickets_sale_dates ON tickets(sale_start_date, sale_end_date);

-- Ticket Purchases/Orders Table
CREATE TABLE IF NOT EXISTS ticket_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL, -- Price at time of purchase
  total_price DECIMAL(10, 2) NOT NULL, -- quantity * unit_price
  currency VARCHAR(10) DEFAULT 'USD',
  order_number VARCHAR(50) UNIQUE, -- Unique order number
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50), -- 'credit_card', 'paypal', 'stripe', 'free', etc.
  payment_transaction_id VARCHAR(255), -- External payment transaction ID
  metadata JSONB DEFAULT '{}', -- Additional order metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ticket orders
CREATE INDEX IF NOT EXISTS idx_ticket_orders_event_id ON ticket_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_user_id ON ticket_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_ticket_id ON ticket_orders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_status ON ticket_orders(status);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_payment_status ON ticket_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_order_number ON ticket_orders(order_number);

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_order_number TEXT;
BEGIN
  LOOP
    new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM ticket_orders WHERE order_number = new_order_number);
  END LOOP;
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticket sold count when order is completed
CREATE OR REPLACE FUNCTION update_ticket_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE tickets
    SET sold = sold + NEW.quantity,
        available = CASE 
          WHEN quantity IS NOT NULL THEN quantity - (sold + NEW.quantity)
          ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = NEW.ticket_id;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    -- If order is cancelled/refunded, decrease sold count
    UPDATE tickets
    SET sold = GREATEST(0, sold - OLD.quantity),
        available = CASE 
          WHEN quantity IS NOT NULL THEN quantity - GREATEST(0, sold - OLD.quantity)
          ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = OLD.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket sold count
CREATE TRIGGER update_ticket_sold_on_order_status
  AFTER UPDATE OF status ON ticket_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_ticket_sold_count();

-- Function to calculate available tickets
CREATE OR REPLACE FUNCTION calculate_ticket_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS NOT NULL THEN
    NEW.available = NEW.quantity - COALESCE(NEW.sold, 0);
  ELSE
    NEW.available = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate available tickets
CREATE TRIGGER calculate_ticket_availability_trigger
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ticket_availability();

-- Enable Row Level Security (RLS)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Anyone can view active tickets for public events"
  ON tickets FOR SELECT
  USING (
    is_visible = TRUE AND
    is_active = TRUE AND
    (sale_start_date IS NULL OR sale_start_date <= NOW()) AND
    (sale_end_date IS NULL OR sale_end_date >= NOW()) AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.status IN ('published', 'upcoming')
    )
  );

CREATE POLICY "Event organizers can view all tickets for their events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can manage tickets for their events"
  ON tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- RLS Policies for ticket orders
CREATE POLICY "Users can view their own ticket orders"
  ON ticket_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view all orders for their events"
  ON ticket_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_orders.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ticket orders"
  ON ticket_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ticket orders"
  ON ticket_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_orders_updated_at
  BEFORE UPDATE ON ticket_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

