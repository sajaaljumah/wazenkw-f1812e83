-- Clean re-seed of demo assets
delete from public.assets
where user_id in (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email in ('dana@wazen.app','yaqoub@wazen.app','hessa@wazen.app','saad@wazen.app','deema@wazen.app','khaled@wazen.app')
);

insert into public.assets (user_id, kind, name, symbol, currency, purchase_date, quantity, unit_cost, current_unit_value, purity, property_type, monthly_rent, notes)
select u.id, v.kind::public.asset_kind, v.name, v.symbol, 'KWD', v.purchase_date::date, v.quantity, v.unit_cost, v.unit_cost, v.purity, v.property_type, v.monthly_rent, v.notes
from (values
  ('dana@wazen.app','gold','Gold bars','GOLD','2024-11-12',20,16.500,'21k',null,0,'Bought gradually from monthly savings'),
  ('yaqoub@wazen.app','stock','National Bank of Kuwait','NBK','2024-10-20',300,0.980,null,null,0,'Long-term dividend holding'),
  ('yaqoub@wazen.app','stock','Zain','ZAIN','2025-03-05',500,0.560,null,null,0,null),
  ('hessa@wazen.app','stock','Kuwait Finance House','KFH','2024-10-05',1200,0.740,null,null,0,'Monthly salary investing plan'),
  ('hessa@wazen.app','gold','Gold coins','GOLD','2025-02-18',50,19.200,'24k',null,0,null),
  ('saad@wazen.app','real_estate','Salmiya apartment',null,'2024-12-01',1,78000.000,null,'Residential apartment',450.000,'Rented to a long-term tenant'),
  ('saad@wazen.app','silver','Silver bullion','SILVER','2025-06-10',500,0.230,'999',null,0,null),
  ('deema@wazen.app','stock','Agility','AGLTY','2025-01-15',2500,0.640,null,null,0,'Reinvested business profit'),
  ('deema@wazen.app','real_estate','Hawally retail shop',null,'2024-10-15',1,120000.000,null,'Commercial shop',700.000,'Leased to a small business'),
  ('khaled@wazen.app','gold','Gold bullion','GOLD','2024-10-28',100,18.900,'24k',null,0,'Inflation hedge'),
  ('khaled@wazen.app','real_estate','Wafra land plot',null,'2025-04-20',1,95000.000,null,'Land',0,'Held for future development'),
  ('khaled@wazen.app','stock','Mabanee','MABANEE','2025-08-01',800,0.720,null,null,0,null)
) as v(email, kind, name, symbol, purchase_date, quantity, unit_cost, purity, property_type, monthly_rent, notes)
join auth.users u on u.email = v.email;

-- Quarterly value history from purchase date to today, with per-kind drift and gentle variation.
insert into public.asset_valuations (asset_id, valued_on, unit_value)
select a.id,
       d::date,
       greatest(round((a.unit_cost * (1
         + (case a.kind when 'gold' then 0.14 when 'silver' then 0.05 when 'stock' then 0.09 else 0.055 end)
           * (d::date - a.purchase_date) / 365.0
         + 0.035 * sin((a.purchase_date - date '2024-01-01') + (d::date - a.purchase_date) / 45.0)
       ))::numeric, 3), 0.001)
from public.assets a
cross join generate_series(a.purchase_date::timestamp, current_date::timestamp, interval '3 months') d
where a.user_id in (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email in ('dana@wazen.app','yaqoub@wazen.app','hessa@wazen.app','saad@wazen.app','deema@wazen.app','khaled@wazen.app')
)
on conflict (asset_id, valued_on) do nothing;

-- Today's valuation closes out the history.
insert into public.asset_valuations (asset_id, valued_on, unit_value)
select a.id, current_date,
       greatest(round((a.unit_cost * (1
         + (case a.kind when 'gold' then 0.14 when 'silver' then 0.05 when 'stock' then 0.09 else 0.055 end)
           * (current_date - a.purchase_date) / 365.0
         + 0.02 * sin((a.purchase_date - date '2024-01-01') + (current_date - a.purchase_date) / 45.0)
       ))::numeric, 3), 0.001)
from public.assets a
on conflict (asset_id, valued_on) do nothing;

update public.assets a
set current_unit_value = v.unit_value
from (
  select distinct on (asset_id) asset_id, unit_value
  from public.asset_valuations
  order by asset_id, valued_on desc
) v
where v.asset_id = a.id;

-- Parent-paid expenses recorded by the demo parents for their linked children/teens.
delete from public.transactions where paid_by_parent = true;

insert into public.transactions (user_id, kind, category, merchant, amount, currency, occurred_on, note, beneficiary_user_id, paid_by_parent, deducted_from_child, payment_method)
select fr.parent_user_id,
       'expense',
       v.category,
       v.merchant,
       v.amount,
       'KWD',
       (current_date - v.days_ago)::date,
       'Paid by parent',
       fr.child_user_id,
       true,
       false,
       v.payment_method
from public.family_relationships fr
join auth.users pu on pu.id = fr.parent_user_id
join auth.users cu on cu.id = fr.child_user_id
join (values
  ('yousef@wazen.app','abdulrahman@wazen.app','Education','Al-Bayan School',420.000,190,'Bank transfer'),
  ('yousef@wazen.app','abdulrahman@wazen.app','Clothing','Debenhams',38.500,74,'Debit card'),
  ('yousef@wazen.app','layan@wazen.app','Activities','Sadu Art Studio',55.000,120,'Debit card'),
  ('yousef@wazen.app','layan@wazen.app','Education','Al-Bayan School',420.000,188,'Bank transfer'),
  ('yousef@wazen.app','fahad@wazen.app','Electronics','Xcite',129.000,58,'Credit card'),
  ('yousef@wazen.app','fahad@wazen.app','Transport','Fuel & school run',24.750,21,'Cash'),
  ('yousef@wazen.app','reem@wazen.app','Education','Tutoring — mathematics',90.000,45,'Bank transfer'),
  ('mariam@wazen.app','reem@wazen.app','Health','Royale Hayat Clinic',65.000,96,'Debit card'),
  ('mariam@wazen.app','layan@wazen.app','Clothing','H&M',42.250,33,'Debit card'),
  ('mariam@wazen.app','abdulrahman@wazen.app','Activities','Swimming lessons',60.000,12,'Debit card'),
  ('mariam@wazen.app','fahad@wazen.app','Books','Que Books',18.900,7,'Cash'),
  ('mariam@wazen.app','reem@wazen.app','Phone','Zain top-up',12.000,3,'Debit card')
) as v(parent_email, child_email, category, merchant, amount, days_ago, payment_method)
  on v.parent_email = pu.email and v.child_email = cu.email
where fr.status = 'active';
