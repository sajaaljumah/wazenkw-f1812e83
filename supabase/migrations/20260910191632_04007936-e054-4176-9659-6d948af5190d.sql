DO $$
DECLARE
  u record;
  m int; i int; n int;
  ms date; dmax int;
  base numeric; growth numeric; exp_pool numeric;
  cats text[]; mers text[]; inc_cat text; inc_mer text;
  k int; amt numeric; d date; g uuid; r numeric;
BEGIN
FOR u IN
  SELECT p.id, p.life_stage
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE au.email LIKE '%@wazen.app'
LOOP
  DELETE FROM public.transactions WHERE user_id = u.id;
  DELETE FROM public.budgets WHERE user_id = u.id;

  IF u.life_stage = 'child' THEN
    cats := ARRAY['Toys','Snacks','Books','Games','Gifts'];
    mers := ARRAY['Toy shop','School canteen','Bookstore','App store','Family gift'];
    inc_cat := 'Allowance'; inc_mer := 'Family'; base := 12;
  ELSIF u.life_stage = 'teenager' THEN
    cats := ARRAY['Dining','Coffee','Clothes','Mobile','Entertainment','Transport','Books'];
    mers := ARRAY['Shake Shack','Starbucks','H&M','Zain','Cinema','Taxi','Bookstore'];
    inc_cat := 'Allowance'; inc_mer := 'Family'; base := 45;
  ELSIF u.life_stage = 'university_student' THEN
    cats := ARRAY['Dining','Coffee','Transport','Books','Mobile','Clothes','Entertainment','Groceries'];
    mers := ARRAY['Subway','Caribou','Fuel','University bookstore','Ooredoo','Zara','Cinema','Sultan Center'];
    inc_cat := 'Stipend'; inc_mer := 'University'; base := 220;
  ELSIF u.life_stage = 'employee' THEN
    cats := ARRAY['Housing','Groceries','Dining','Fuel','Utilities','Health','Clothes','Mobile','Entertainment'];
    mers := ARRAY['Landlord','Carrefour','Mais Alghanim','Q8 Station','MEW','Gym','Zara','Zain','Cinema'];
    inc_cat := 'Salary'; inc_mer := 'Employer'; base := 1250;
  ELSIF u.life_stage = 'self_employed' THEN
    cats := ARRAY['Housing','Groceries','Software','Fuel','Utilities','Marketing','Dining','Health','Equipment'];
    mers := ARRAY['Studio rent','Sultan Center','Adobe','Q8 Station','MEW','Instagram ads','Freej Swaileh','Clinic','Supplier'];
    inc_cat := 'Freelance'; inc_mer := 'Client'; base := 1150;
  ELSE
    cats := ARRAY['Housing','Groceries','School fees','Fuel','Utilities','Health','Dining','Clothes','Family support'];
    mers := ARRAY['Landlord','Carrefour','School','Q8 Station','MEW','Clinic','Burger Boutique','Debenhams','Family'];
    inc_cat := 'Salary'; inc_mer := 'Employer'; base := 1650;
  END IF;

  FOR m IN 0..23 LOOP
    ms := (date_trunc('month', CURRENT_DATE) - (m || ' months')::interval)::date;
    dmax := CASE WHEN m = 0 THEN EXTRACT(day FROM CURRENT_DATE)::int
                 ELSE EXTRACT(day FROM (ms + interval '1 month' - interval '1 day'))::int END;
    IF dmax < 1 THEN CONTINUE; END IF;
    growth := 1 + 0.004 * (23 - m);

    IF u.life_stage IN ('employee','parent') THEN
      INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
      VALUES (u.id, 'income', inc_cat, inc_mer,
              ROUND(base * growth * (1 + (random()::numeric - 0.5) * 0.04), 3),
              ms + (LEAST(25, dmax) - 1), NULL, ms::timestamptz);
      IF m IN (23, 11) AND dmax > 20 THEN
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
        VALUES (u.id, 'income', 'Bonus', 'Employer', ROUND(base * (0.3 + random()::numeric * 0.5), 3), ms + 19, 'Annual bonus', ms::timestamptz);
      END IF;
    ELSIF u.life_stage = 'self_employed' THEN
      n := 2 + floor(random() * 3)::int;
      FOR i IN 1..n LOOP
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
        VALUES (u.id, 'income', inc_cat, inc_mer || ' ' || i,
                ROUND((base * growth / n) * (0.6 + random()::numeric * 0.8), 3),
                ms + floor(random() * dmax)::int, NULL, ms::timestamptz);
      END LOOP;
    ELSIF u.life_stage = 'university_student' THEN
      INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
      VALUES (u.id, 'income', inc_cat, inc_mer, ROUND(base * growth * (1 + (random()::numeric - 0.5) * 0.06), 3),
              ms + LEAST(4, dmax - 1), NULL, ms::timestamptz);
      IF random() < 0.45 THEN
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
        VALUES (u.id, 'income', 'Part-time work', 'Campus job', ROUND(60 + random()::numeric * 90, 3),
                ms + floor(random() * dmax)::int, NULL, ms::timestamptz);
      END IF;
    ELSE
      n := 3 + floor(random() * 2)::int;
      FOR i IN 1..n LOOP
        EXIT WHEN (i - 1) * 7 >= dmax;
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
        VALUES (u.id, 'income', inc_cat, inc_mer,
                ROUND((base * growth / n) * (0.7 + random()::numeric * 0.6), 3),
                ms + LEAST((i - 1) * 7, dmax - 1), NULL, ms::timestamptz);
      END LOOP;
    END IF;

    n := CASE u.life_stage
           WHEN 'child' THEN 2 + floor(random() * 3)::int
           WHEN 'teenager' THEN 4 + floor(random() * 4)::int
           WHEN 'university_student' THEN 6 + floor(random() * 5)::int
           ELSE 8 + floor(random() * 7)::int END;
    exp_pool := base * growth * (0.55 + random()::numeric * 0.2);
    FOR i IN 1..n LOOP
      k := 1 + floor(random() * array_length(cats, 1))::int;
      amt := ROUND((exp_pool / n) * (0.4 + random()::numeric * 1.3), 3);
      IF amt <= 0 THEN amt := 0.5; END IF;
      d := ms + floor(random() * dmax)::int;
      INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
      VALUES (u.id, 'expense', cats[k], mers[k], amt, d, NULL, d::timestamptz);
    END LOOP;

    IF random() < 0.85 THEN
      SELECT gg.id INTO g FROM public.goals gg WHERE gg.user_id = u.id ORDER BY random() LIMIT 1;
      amt := ROUND(base * growth * (0.08 + random()::numeric * 0.14), 3);
      IF amt > 0 THEN
        d := ms + LEAST(GREATEST(floor(random() * dmax)::int, 0), dmax - 1);
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, goal_id, created_at)
        VALUES (u.id, 'saving', 'Savings', 'Transfer', amt, d, NULL, g, d::timestamptz);
      END IF;
    END IF;

    IF random() < 0.18 THEN
      k := 1 + floor(random() * array_length(cats, 1))::int;
      amt := ROUND(base * (0.02 + random()::numeric * 0.06), 3);
      IF amt > 0 THEN
        d := ms + floor(random() * dmax)::int;
        INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, note, created_at)
        VALUES (u.id, 'refund', cats[k], mers[k], amt, d, 'Returned item', d::timestamptz);
      END IF;
    END IF;

    IF random() < 0.85 THEN
      INSERT INTO public.budgets (user_id, period_month, amount, created_at)
      VALUES (u.id, ms, ROUND(base * growth * (0.6 + random()::numeric * 0.2), 3), ms::timestamptz)
      ON CONFLICT (user_id, period_month) DO UPDATE SET amount = EXCLUDED.amount;
    END IF;
  END LOOP;

  UPDATE public.goals gg
  SET created_at = (date_trunc('month', CURRENT_DATE) - ((3 + floor(random() * 20)::int) || ' months')::interval),
      target_date = COALESCE(gg.target_date, (CURRENT_DATE + ((2 + floor(random() * 16)::int) || ' months')::interval)::date)
  WHERE gg.user_id = u.id;
END LOOP;
END $$;