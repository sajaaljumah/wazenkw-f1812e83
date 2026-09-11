UPDATE public.assets SET holding_purpose = CASE
  WHEN kind = 'stock' AND name IN ('Agility','Mabanee') THEN 'trade'
  WHEN kind = 'stock' THEN 'long_term'
  WHEN kind = 'gold' AND name ILIKE '%coin%' THEN 'long_term'
  WHEN kind = 'gold' THEN 'long_term'
  WHEN kind = 'silver' THEN 'long_term'
  WHEN kind = 'real_estate' AND property_type ILIKE '%land%' THEN 'for_sale'
  WHEN kind = 'real_estate' AND property_type ILIKE '%apartment%' THEN 'rental_income'
  WHEN kind = 'real_estate' THEN 'rental_income'
  ELSE holding_purpose END
WHERE holding_purpose IS NULL;

UPDATE public.metal_rates SET price_per_gram = 23.200 WHERE metal = 'gold_24k' AND source = 'manual';
UPDATE public.metal_rates SET price_per_gram = 0.248 WHERE metal = 'silver' AND source = 'manual';

INSERT INTO public.zakat_profiles (user_id, zakat_start_date, zakat_due_date, nisab_method, hawl_status, status)
SELECT p.id,
       CURRENT_DATE - 400,
       (CURRENT_DATE - 400) + 354,
       'gold',
       'completed',
       'due'
FROM public.profiles p
WHERE p.life_stage IN ('parent','employee','university_student','self_employed')
ON CONFLICT (user_id) DO NOTHING;