ALTER TABLE public.versus_rooms ADD COLUMN time_limit_seconds integer NOT NULL DEFAULT 60 CHECK (time_limit_seconds IN (40,60,180)), ADD COLUMN round_deadline timestamptz;
CREATE OR REPLACE FUNCTION public.versus_round_clock() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status = 'playing' AND NEW.phase = 'answer' THEN
  IF TG_OP = 'INSERT' THEN NEW.round_deadline := clock_timestamp() + make_interval(secs => NEW.time_limit_seconds);
  ELSIF OLD.status <> 'playing' OR OLD.phase <> 'answer' OR OLD.current_round <> NEW.current_round OR NEW.round_deadline IS NULL THEN
   NEW.round_deadline := clock_timestamp() + make_interval(secs => NEW.time_limit_seconds);
  ELSE NEW.round_deadline := OLD.round_deadline;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER versus_round_clock BEFORE INSERT OR UPDATE ON public.versus_rooms FOR EACH ROW EXECUTE FUNCTION public.versus_round_clock();
UPDATE public.versus_rooms SET round_deadline = clock_timestamp() + make_interval(secs => time_limit_seconds) WHERE status = 'playing' AND phase = 'answer' AND round_deadline IS NULL;
CREATE OR REPLACE FUNCTION public.submit_versus_answer(p_room uuid, p_round integer, p_seat integer, p_pick integer, p_correct integer) RETURNS public.versus_rooms LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.versus_rooms; a integer; b integer; delta1 integer := 0; delta2 integer := 0;
BEGIN
 IF p_seat NOT IN (0,1) OR p_pick NOT BETWEEN -1 AND 3 OR p_correct NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
 SELECT * INTO r FROM public.versus_rooms WHERE id = p_room FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
 IF r.status <> 'playing' OR r.phase <> 'answer' OR r.current_round <> p_round THEN RETURN r; END IF;
 a := r.p1_pick; b := r.p2_pick;
 IF clock_timestamp() >= r.round_deadline THEN
  a := coalesce(a, -1); b := coalesce(b, -1);
 ELSIF p_pick <> -1 THEN
  IF p_seat = 0 AND a IS NULL THEN a := p_pick; END IF;
  IF p_seat = 1 AND b IS NULL THEN b := p_pick; END IF;
 END IF;
 IF a IS NOT NULL AND b IS NOT NULL THEN
  IF NOT (a = -1 AND b = -1) THEN
   IF a = p_correct OR b = -1 THEN delta1 := 1; END IF;
   IF b = p_correct OR a = -1 THEN delta2 := 1; END IF;
  END IF;
  r.phase := 'reveal';
  r.scores := ARRAY[r.scores[1] + delta1, r.scores[2] + delta2];
 END IF;
 UPDATE public.versus_rooms SET p1_pick = a, p2_pick = b, phase = r.phase, scores = r.scores, updated_at = clock_timestamp() WHERE id = p_room RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.submit_versus_answer(uuid,integer,integer,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_versus_answer(uuid,integer,integer,integer,integer) TO anon, authenticated, service_role;