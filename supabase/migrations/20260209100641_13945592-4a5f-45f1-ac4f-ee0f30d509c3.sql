
-- Bug 1: Add missing unique constraint for ON CONFLICT clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_transactions_unique_pair 
ON public.referral_transactions (referee_id, referrer_id);

-- Bug 2 + Bug 3: Rewrite process_referral_reward function
-- Fixes: log_security_event type mismatch, hardcoded reward percentage
CREATE OR REPLACE FUNCTION public.process_referral_reward(
    p_order_id UUID,
    p_referee_id UUID,
    p_order_amount NUMERIC,
    p_referrer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_amount NUMERIC;
    v_referral_percentage NUMERIC;
    v_result JSONB;
    v_current_role TEXT;
BEGIN
    -- Security: Only allow service_role or postgres to call this function
    v_current_role := current_setting('role', true);
    IF v_current_role NOT IN ('service_role', 'postgres') THEN
        PERFORM public.log_security_event(
            'process_referral_reward',
            p_referee_id,
            jsonb_build_object(
                'event', 'unauthorized_access_attempt',
                'attempted_role', v_current_role
            )
        );
        RETURN jsonb_build_object('processed', false, 'error', 'unauthorized');
    END IF;

    -- 3-level fallback for referrer resolution
    -- Level 1: Check profiles.referred_by
    SELECT referred_by INTO v_referrer_id
    FROM profiles
    WHERE id = p_referee_id;

    -- Level 2: Use the parameter fallback
    IF v_referrer_id IS NULL AND p_referrer_id IS NOT NULL THEN
        v_referrer_id := p_referrer_id;
    END IF;

    -- Level 3: Check order metadata
    IF v_referrer_id IS NULL THEN
        SELECT referrer_id INTO v_referrer_id
        FROM orders
        WHERE id = p_order_id;
    END IF;

    -- No referrer found at any level
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('processed', false, 'reason', 'no_referrer_found');
    END IF;

    -- Prevent self-referral
    IF v_referrer_id = p_referee_id THEN
        RETURN jsonb_build_object('processed', false, 'reason', 'self_referral');
    END IF;

    -- Bug 3 Fix: Read percentage from referral_config instead of hardcoding
    SELECT referrer_percentage INTO v_referral_percentage
    FROM referral_config
    WHERE is_active = true
    LIMIT 1;

    -- Fallback to 5% if no config found
    IF v_referral_percentage IS NULL THEN
        v_referral_percentage := 5;
    END IF;

    -- Calculate reward amount using config percentage
    v_reward_amount := p_order_amount * (v_referral_percentage / 100);

    -- Round to 2 decimal places
    v_reward_amount := ROUND(v_reward_amount, 2);

    -- Update referrer's cashback balance and stats
    UPDATE profiles
    SET 
        cashback_balance = cashback_balance + v_reward_amount,
        referral_earnings = COALESCE(referral_earnings, 0) + v_reward_amount,
        total_referrals = COALESCE(total_referrals, 0) + 1,
        updated_at = now()
    WHERE id = v_referrer_id;

    -- Record cashback transaction for the referrer
    INSERT INTO cashback_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        order_id
    ) VALUES (
        v_referrer_id,
        v_reward_amount,
        'referral_reward',
        'Referral reward (' || v_referral_percentage || '%) from order ' || p_order_id::text,
        p_order_id
    );

    -- Record referral transaction (with unique constraint fix from Bug 1)
    INSERT INTO referral_transactions (
        referrer_id,
        referee_id,
        order_id,
        reward_amount,
        status
    ) VALUES (
        v_referrer_id,
        p_referee_id,
        p_order_id,
        v_reward_amount,
        'completed'
    )
    ON CONFLICT (referee_id, referrer_id) DO UPDATE SET
        order_id = EXCLUDED.order_id,
        reward_amount = EXCLUDED.reward_amount,
        status = 'completed',
        updated_at = now();

    v_result := jsonb_build_object(
        'processed', true,
        'referrer_id', v_referrer_id,
        'reward_amount', v_reward_amount,
        'percentage', v_referral_percentage,
        'order_id', p_order_id
    );

    -- Bug 2 Fix: Use proper UUID (p_referee_id) instead of text string
    PERFORM public.log_security_event(
        'process_referral_reward',
        p_referee_id,
        jsonb_build_object(
            'event', 'referral_reward_processed',
            'order_id', p_order_id,
            'referrer_id', v_referrer_id,
            'reward_amount', v_reward_amount,
            'percentage', v_referral_percentage
        )
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Log the error with proper UUID
    PERFORM public.log_security_event(
        'process_referral_reward',
        p_referee_id,
        jsonb_build_object(
            'event', 'referral_reward_error',
            'error', SQLERRM,
            'order_id', p_order_id
        )
    );
    RETURN jsonb_build_object('processed', false, 'error', SQLERRM);
END;
$$;

-- Re-apply security: revoke from public roles, grant only to service_role and postgres
REVOKE ALL ON FUNCTION public.process_referral_reward(UUID, UUID, NUMERIC, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_referral_reward(UUID, UUID, NUMERIC, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.process_referral_reward(UUID, UUID, NUMERIC, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(UUID, UUID, NUMERIC, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(UUID, UUID, NUMERIC, UUID) TO postgres;
