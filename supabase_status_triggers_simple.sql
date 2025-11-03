-- Temporarily disable the trigger to avoid conflicts during event creation
DROP TRIGGER IF EXISTS trigger_update_event_status ON events;

-- Create a simpler function that only updates status when explicitly called
CREATE OR REPLACE FUNCTION update_event_status_manual(event_id UUID, new_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE events 
    SET status = new_status 
    WHERE id = event_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update all event statuses based on current time
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
