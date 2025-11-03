-- Create a function to automatically update event status based on dates
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TRIGGER AS $$
DECLARE
    event_start TIMESTAMP WITH TIME ZONE;
    event_end TIMESTAMP WITH TIME ZONE;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    new_status TEXT;
BEGIN
    -- Parse event date and time (handle time zone properly)
    IF NEW.time IS NOT NULL THEN
        -- Convert time to timestamp by combining with date
        event_start := (NEW.date::DATE || ' ' || NEW.time::TEXT)::TIMESTAMP WITH TIME ZONE;
    ELSE
        -- Default to start of day if no time specified
        event_start := NEW.date::DATE::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Default to 2 hours duration if no end time specified
    event_end := event_start + INTERVAL '2 hours';
    
    -- Determine status based on current time
    IF NEW.status = 'cancelled' THEN
        new_status := 'cancelled';
    ELSIF current_time < event_start THEN
        new_status := 'upcoming';
    ELSIF current_time >= event_start AND current_time <= event_end THEN
        new_status := 'ongoing';
    ELSE
        new_status := 'completed';
    END IF;
    
    -- Update the status if it has changed
    IF NEW.status != new_status THEN
        NEW.status := new_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status on insert/update
DROP TRIGGER IF EXISTS trigger_update_event_status ON events;
CREATE TRIGGER trigger_update_event_status
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_status();

-- Create a function to update all event statuses (for manual calls)
CREATE OR REPLACE FUNCTION update_all_event_statuses()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    event_record RECORD;
    event_start TIMESTAMP WITH TIME ZONE;
    event_end TIMESTAMP WITH TIME ZONE;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    new_status TEXT;
BEGIN
    -- Loop through all events
    FOR event_record IN 
        SELECT id, date, time, status 
        FROM events 
        WHERE status != 'cancelled'
    LOOP
        -- Parse event date and time (handle time zone properly)
        IF event_record.time IS NOT NULL THEN
            -- Convert time to timestamp by combining with date
            event_start := (event_record.date::DATE || ' ' || event_record.time::TEXT)::TIMESTAMP WITH TIME ZONE;
        ELSE
            -- Default to start of day if no time specified
            event_start := event_record.date::DATE::TIMESTAMP WITH TIME ZONE;
        END IF;
        event_end := event_start + INTERVAL '2 hours';
        
        -- Determine new status
        IF current_time < event_start THEN
            new_status := 'upcoming';
        ELSIF current_time >= event_start AND current_time <= event_end THEN
            new_status := 'ongoing';
        ELSE
            new_status := 'completed';
        END IF;
        
        -- Update if status has changed
        IF event_record.status != new_status THEN
            UPDATE events 
            SET status = new_status 
            WHERE id = event_record.id;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run status updates every hour (optional)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('update-event-statuses', '0 * * * *', 'SELECT update_all_event_statuses();');
