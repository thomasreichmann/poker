-- Limit poker_cards realtime broadcast to community cards only

-- Replace the broadcast function for poker_cards to only emit community (player_id is null)
create or replace function public.broadcast_poker_cards_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
  row_new public.poker_cards%rowtype;
  row_old public.poker_cards%rowtype;
begin
  row_new := NEW;
  row_old := OLD;
  gid := coalesce(row_new.game_id, row_old.game_id);

  -- Only broadcast community cards; do not emit hole cards on public channel
  if (TG_OP = 'INSERT') then
    if (row_new.player_id is null) then
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    if ((coalesce(row_new.player_id, '00000000-0000-0000-0000-000000000000') is null)
        or (coalesce(row_old.player_id, '00000000-0000-0000-0000-000000000000') is null)) then
      -- If either version is community, broadcast the update
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    if (row_old.player_id is null) then
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_poker_cards_broadcast on public.poker_cards;
create trigger trg_poker_cards_broadcast
after insert or update or delete on public.poker_cards
for each row execute function public.broadcast_poker_cards_changes();