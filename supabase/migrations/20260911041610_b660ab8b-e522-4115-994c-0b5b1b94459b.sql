WITH sadaqah_seed(email, amount, days_ago, merchant, note) AS (
  VALUES
    ('mariam@wazen.app', 12.000::numeric, 42, 'Kuwait Food Bank', 'Demo Sadaqah — winter support'),
    ('yousef@wazen.app', 15.000::numeric, 71, 'Direct Aid', 'Demo Sadaqah — community support'),
    ('layan@wazen.app', 1.000::numeric, 18, 'School charity box', 'Demo Sadaqah — kindness day'),
    ('abdulrahman@wazen.app', 1.500::numeric, 25, 'School charity box', 'Demo Sadaqah — kindness day'),
    ('reem@wazen.app', 3.000::numeric, 34, 'Kuwait Food Bank', 'Demo Sadaqah — meal support'),
    ('fahad@wazen.app', 4.000::numeric, 51, 'Direct Aid', 'Demo Sadaqah — community support'),
    ('dana@wazen.app', 8.000::numeric, 29, 'Student charity drive', 'Demo Sadaqah — campus drive'),
    ('yaqoub@wazen.app', 7.500::numeric, 63, 'Student charity drive', 'Demo Sadaqah — campus drive'),
    ('hessa@wazen.app', 20.000::numeric, 47, 'Kuwait Food Bank', 'Demo Sadaqah — family baskets'),
    ('saad@wazen.app', 18.000::numeric, 82, 'Direct Aid', 'Demo Sadaqah — water project'),
    ('deema@wazen.app', 25.000::numeric, 38, 'Kuwait Food Bank', 'Demo Sadaqah — family baskets'),
    ('khaled@wazen.app', 30.000::numeric, 67, 'Direct Aid', 'Demo Sadaqah — community support')
)
INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, currency, note)
SELECT u.id, 'expense', 'Sadaqah', s.merchant, s.amount, CURRENT_DATE - s.days_ago, 'KWD', s.note
FROM sadaqah_seed s
JOIN auth.users u ON lower(u.email) = s.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.user_id = u.id AND t.note = s.note
);

WITH adult_seed(email, nisab, wealth, due_amount, days_ago) AS (
  VALUES
    ('mariam@wazen.app', 1972.000::numeric, 8240.000::numeric, 206.000::numeric, 369),
    ('yousef@wazen.app', 1972.000::numeric, 10960.000::numeric, 274.000::numeric, 371),
    ('dana@wazen.app', 1972.000::numeric, 2480.000::numeric, 62.000::numeric, 366),
    ('yaqoub@wazen.app', 1972.000::numeric, 2960.000::numeric, 74.000::numeric, 368),
    ('hessa@wazen.app', 1972.000::numeric, 13800.000::numeric, 345.000::numeric, 372),
    ('saad@wazen.app', 1972.000::numeric, 15200.000::numeric, 380.000::numeric, 367),
    ('deema@wazen.app', 1972.000::numeric, 17600.000::numeric, 440.000::numeric, 374),
    ('khaled@wazen.app', 1972.000::numeric, 19200.000::numeric, 480.000::numeric, 370)
)
INSERT INTO public.zakat_calculations (
  user_id, calculation_date, nisab_value_kwd, eligible_assets_total_kwd,
  deductions_kwd, zakatable_amount_kwd, zakat_rate, zakat_due_kwd,
  hawl_status, methodology_reference, breakdown
)
SELECT u.id, CURRENT_DATE - a.days_ago, a.nisab, a.wealth, 0, a.wealth, 0.025, a.due_amount,
       'completed', 'Kuwait Zakat House — https://www.zakathouse.org.kw/calculate.aspx',
       jsonb_build_array(jsonb_build_object('type','demo_snapshot','value',a.wealth))
FROM adult_seed a
JOIN auth.users u ON lower(u.email) = a.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.zakat_calculations z
  WHERE z.user_id = u.id AND z.breakdown @> '[{"type":"demo_snapshot"}]'::jsonb
);

WITH adult_seed(email, amount, days_ago, recipient) AS (
  VALUES
    ('mariam@wazen.app', 206.000::numeric, 368, 'Kuwait Zakat House'),
    ('yousef@wazen.app', 274.000::numeric, 370, 'Kuwait Zakat House'),
    ('dana@wazen.app', 62.000::numeric, 365, 'Kuwait Zakat House'),
    ('yaqoub@wazen.app', 74.000::numeric, 367, 'Kuwait Zakat House'),
    ('hessa@wazen.app', 345.000::numeric, 371, 'Kuwait Zakat House'),
    ('saad@wazen.app', 380.000::numeric, 366, 'Kuwait Zakat House'),
    ('deema@wazen.app', 440.000::numeric, 373, 'Kuwait Zakat House'),
    ('khaled@wazen.app', 480.000::numeric, 369, 'Kuwait Zakat House')
), new_transactions AS (
  INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, currency, note)
  SELECT u.id, 'expense', 'Zakat', a.recipient, a.amount, CURRENT_DATE - a.days_ago, 'KWD', 'Demo Zakat payment history'
  FROM adult_seed a
  JOIN auth.users u ON lower(u.email) = a.email
  WHERE NOT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.user_id = u.id AND t.note = 'Demo Zakat payment history'
  )
  RETURNING id, user_id, amount, occurred_on
)
INSERT INTO public.zakat_payments (
  user_id, calculation_id, amount_kwd, currency, payment_date,
  payment_type, recipient, status, notes, transaction_id
)
SELECT nt.user_id,
       (SELECT z.id FROM public.zakat_calculations z WHERE z.user_id = nt.user_id ORDER BY z.calculation_date DESC LIMIT 1),
       nt.amount, 'KWD', nt.occurred_on, 'zakat', 'Kuwait Zakat House', 'paid',
       'Demo annual Zakat payment', nt.id
FROM new_transactions nt
WHERE NOT EXISTS (
  SELECT 1 FROM public.zakat_payments p
  WHERE p.user_id = nt.user_id AND p.notes = 'Demo annual Zakat payment'
);