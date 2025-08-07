-- Realtime broadcast function for game state changes
CREATE OR REPLACE FUNCTION broadcast_game_update()
RETURNS trigger AS $$
DECLARE
    game_id uuid;
    complete_game_state jsonb;
BEGIN
    -- Determine the game_id based on the table
    IF TG_TABLE_NAME = 'poker_games' THEN
        game_id = COALESCE(NEW.id, OLD.id);
    ELSIF TG_TABLE_NAME = 'poker_players' THEN
        game_id = COALESCE(NEW.game_id, OLD.game_id);
    ELSIF TG_TABLE_NAME = 'cards' THEN
        game_id = COALESCE(NEW.game_id, OLD.game_id);
    ELSIF TG_TABLE_NAME = 'poker_actions' THEN
        game_id = COALESCE(NEW.game_id, OLD.game_id);
    END IF;

    -- Build complete game state with all relations
    SELECT jsonb_build_object(
        'id', g.id,
        'status', g.status,
        'current_round', g.current_round,
        'current_highest_bet', g.current_highest_bet,
        'current_player_turn', g.current_player_turn,
        'pot', g.pot,
        'big_blind', g.big_blind,
        'small_blind', g.small_blind,
        'updated_at', g.updated_at,
        'last_action', g.last_action,
        'last_bet_amount', g.last_bet_amount,
        'players', COALESCE(players_array, '[]'::jsonb),
        'cards', COALESCE(community_cards, '[]'::jsonb)
    )
    INTO complete_game_state
    FROM poker_games g
    LEFT JOIN (
        SELECT 
            p.game_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'user_id', p.user_id,
                    'seat', p.seat,
                    'stack', p.stack,
                    'current_bet', p.current_bet,
                    'has_folded', p.has_folded,
                    'is_connected', p.is_connected,
                    'last_seen', p.last_seen,
                    'is_button', p.is_button,
                    'has_won', p.has_won,
                    'show_cards', p.show_cards,
                    'hand_rank', p.hand_rank,
                    'hand_value', p.hand_value,
                    'hand_name', p.hand_name,
                    'cards', COALESCE(player_cards.cards_array, '[]'::jsonb)
                ) ORDER BY p.seat
            ) as players_array
        FROM poker_players p
        LEFT JOIN (
            SELECT 
                c.player_id,
                jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'rank', c.rank,
                        'suit', c.suit
                    )
                ) as cards_array
            FROM cards c
            WHERE c.player_id IS NOT NULL
            GROUP BY c.player_id
        ) player_cards ON player_cards.player_id = p.id
        WHERE p.game_id = game_id
        GROUP BY p.game_id
    ) players_data ON players_data.game_id = g.id
    LEFT JOIN (
        SELECT 
            c.game_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'rank', c.rank,
                    'suit', c.suit
                )
            ) as community_cards
        FROM cards c
        WHERE c.player_id IS NULL AND c.game_id = game_id
        GROUP BY c.game_id
    ) community_data ON community_data.game_id = g.id
    WHERE g.id = game_id;

    -- Send the broadcast via Supabase realtime
    PERFORM pg_notify(
        'supabase_realtime',
        json_build_object(
            'type', 'broadcast',
            'event', 'UPDATE',
            'topic', 'topic:' || game_id::text,
            'payload', json_build_object(
                'id', game_id::text,
                'operation', TG_OP,
                'record', complete_game_state,
                'old_record', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE '{}' END,
                'schema', 'public',
                'table', TG_TABLE_NAME
            )
        )::text
    );

    -- Return appropriate record based on operation
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all game-affecting tables
CREATE OR REPLACE TRIGGER games_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON poker_games
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_game_update();

CREATE OR REPLACE TRIGGER players_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON poker_players
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_game_update();

CREATE OR REPLACE TRIGGER cards_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_game_update();

CREATE OR REPLACE TRIGGER actions_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON poker_actions
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_game_update();