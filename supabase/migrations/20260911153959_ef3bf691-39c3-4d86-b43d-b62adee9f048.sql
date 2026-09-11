WITH parents AS (
  SELECT id, full_name FROM public.profiles WHERE life_stage = 'parent'
), ins AS (
  INSERT INTO public.assets (user_id, kind, name, symbol, currency, purchase_date, quantity, unit_cost, current_unit_value, purity, property_type, monthly_rent, notes, holding_purpose)
  SELECT p.id, v.kind, v.name, v.symbol, 'KWD', v.purchase_date::date, v.quantity, v.unit_cost, v.current_unit_value, v.purity, v.property_type, v.monthly_rent, v.notes, v.holding_purpose
  FROM parents p
  JOIN (VALUES
    ('Mariam', 'gold'::public.asset_kind, 'Gold bangles', NULL, '2025-02-14', 62, 21.40, 25.90, '21K', NULL, 0, 'Kept as long-term savings', 'investment'),
    ('Mariam', 'stock'::public.asset_kind, 'Boubyan Bank shares', 'BOUBYAN', '2024-11-05', 4200, 0.612, 0.708, NULL, NULL, 0, 'Long-term holding', 'investment'),
    ('Mariam', 'silver'::public.asset_kind, 'Silver coins', NULL, '2025-06-20', 400, 0.285, 0.312, '999', NULL, 0, 'Small silver position', 'investment'),
    ('Yousef', 'real_estate'::public.asset_kind, 'Salmiya rental apartment', NULL, '2023-05-10', 1, 185000, 214000, NULL, 'apartment', 620, 'Rented year-round', 'rental'),
    ('Yousef', 'stock'::public.asset_kind, 'NBK shares', 'NBK', '2024-03-18', 2600, 0.905, 1.042, NULL, NULL, 0, 'Dividend holding', 'investment'),
    ('Yousef', 'gold'::public.asset_kind, 'Gold bars', NULL, '2025-01-22', 40, 24.10, 25.90, '24K', NULL, 0, 'Stored gold', 'investment')
  ) AS v(owner, kind, name, symbol, purchase_date, quantity, unit_cost, current_unit_value, purity, property_type, monthly_rent, notes, holding_purpose)
    ON v.owner = p.full_name
  RETURNING id, purchase_date, unit_cost, current_unit_value
)
INSERT INTO public.asset_valuations (asset_id, valued_on, unit_value)
SELECT i.id,
       (date_trunc('month', CURRENT_DATE) - (g.n || ' months')::interval)::date,
       ROUND((i.current_unit_value - (i.current_unit_value - i.unit_cost) * (g.n / 9.0))::numeric, 4)
FROM ins i
CROSS JOIN generate_series(0, 8) AS g(n)
WHERE (date_trunc('month', CURRENT_DATE) - (g.n || ' months')::interval)::date >= i.purchase_date;