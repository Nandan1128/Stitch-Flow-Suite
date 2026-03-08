-- 1. Add origin tracking ID to worker_salaries
ALTER TABLE public.worker_salaries
ADD COLUMN related_production_operation_id UUID UNIQUE;


-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.sync_production_operation_to_salary()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_amount_per_piece NUMERIC;
BEGIN
    -- Only run for INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        
        -- Fetch strictly necessary info from the operations table (product ID and piece rate)
        SELECT product_id, amount_per_piece 
        INTO v_product_id, v_amount_per_piece
        FROM public.operations 
        WHERE id = NEW.operation_id;

        IF TG_OP = 'INSERT' THEN
            -- Handle INSERT: Create matching salary record
            INSERT INTO public.worker_salaries (
                worker_id,
                product_id,
                operation_id,
                pieces_done,
                amount_per_piece,
                total_amount,
                date,
                entered_by,
                paid,
                related_production_operation_id
            ) VALUES (
                NEW.worker_id,
                v_product_id,
                NEW.operation_id,
                NEW.pieces_done,
                v_amount_per_piece,
                NEW.earnings,
                NEW.date,
                NEW.entered_by,
                false,            -- initially not paid
                NEW.id            -- link back to the production operation
            );

        ELSIF TG_OP = 'UPDATE' THEN
            -- Handle UPDATE: Modify the existing matched salary record
            UPDATE public.worker_salaries
            SET
                pieces_done = NEW.pieces_done,
                total_amount = NEW.earnings,
                -- In case the admin changes the operation entirely:
                operation_id = NEW.operation_id,
                product_id = v_product_id,
                amount_per_piece = v_amount_per_piece,
                date = NEW.date
            WHERE related_production_operation_id = NEW.id;
        END IF;

        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.worker_salaries
        WHERE related_production_operation_id = OLD.id;
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Bind the Trigger immediately
DROP TRIGGER IF EXISTS tr_sync_production_operation_to_salary ON public.production_operation;

CREATE TRIGGER tr_sync_production_operation_to_salary
AFTER INSERT OR UPDATE OR DELETE ON public.production_operation
FOR EACH ROW
EXECUTE FUNCTION public.sync_production_operation_to_salary();
