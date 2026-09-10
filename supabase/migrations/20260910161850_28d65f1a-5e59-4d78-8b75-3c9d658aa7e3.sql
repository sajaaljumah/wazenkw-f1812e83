-- ============ TABLES ============
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'goal' CHECK (kind IN ('goal','emergency_fund')),
  target_amount NUMERIC(14,3) NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  currency TEXT NOT NULL DEFAULT 'KWD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  amount NUMERIC(14,3) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'KWD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense','saving','refund')),
  category TEXT NOT NULL,
  merchant TEXT,
  amount NUMERIC(14,3) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KWD',
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recurring_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense','saving')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,3) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KWD',
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, occurred_on DESC);
CREATE INDEX idx_transactions_goal ON public.transactions (goal_id);
CREATE INDEX idx_goals_user ON public.goals (user_id);
CREATE INDEX idx_recurring_user ON public.recurring_items (user_id);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_items TO authenticated;
GRANT ALL ON public.goals TO service_role;
GRANT ALL ON public.budgets TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.recurring_items TO service_role;

-- ============ RLS ============
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_monitor_child(_child UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_relationships fr
    WHERE fr.child_user_id = _child
      AND fr.parent_user_id = auth.uid()
      AND fr.status = 'active'
      AND (
        COALESCE((fr.permissions->>'can_monitor')::boolean, false)
        OR COALESCE((fr.permissions->>'can_fund')::boolean, false)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_monitor_child(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_monitor_child(UUID) TO authenticated, service_role;

CREATE POLICY "Users manage own goals" ON public.goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guardians view child goals" ON public.goals FOR SELECT TO authenticated
  USING (public.can_monitor_child(user_id));

CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guardians view child budgets" ON public.budgets FOR SELECT TO authenticated
  USING (public.can_monitor_child(user_id));

CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guardians view child transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.can_monitor_child(user_id));

CREATE POLICY "Users manage own recurring items" ON public.recurring_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guardians view child recurring items" ON public.recurring_items FOR SELECT TO authenticated
  USING (public.can_monitor_child(user_id));

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.wazen_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.wazen_touch_updated_at();
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.wazen_touch_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.wazen_touch_updated_at();
CREATE TRIGGER trg_recurring_updated BEFORE UPDATE ON public.recurring_items
  FOR EACH ROW EXECUTE FUNCTION public.wazen_touch_updated_at();

-- ============ DEMO SEED (dates relative to today) ============
-- Budgets
INSERT INTO public.budgets (user_id, period_month, amount, currency)
SELECT u.id, date_trunc('month', CURRENT_DATE)::date, v.amount, 'KWD'
FROM (VALUES
  ('mariam@wazen.app', 900),
  ('yousef@wazen.app', 1200),
  ('layan@wazen.app', 12),
  ('abdulrahman@wazen.app', 16),
  ('reem@wazen.app', 45),
  ('fahad@wazen.app', 55),
  ('dana@wazen.app', 220),
  ('yaqoub@wazen.app', 240),
  ('hessa@wazen.app', 750),
  ('saad@wazen.app', 820),
  ('deema@wazen.app', 640),
  ('khaled@wazen.app', 700)
) AS v(email, amount)
JOIN auth.users u ON lower(u.email) = v.email;

-- Goals
INSERT INTO public.goals (user_id, name, kind, target_amount, target_date, currency)
SELECT u.id, v.name, v.kind, v.target, CURRENT_DATE + (v.days || ' days')::interval, 'KWD'
FROM (VALUES
  ('mariam@wazen.app','Emergency fund','emergency_fund',3000,365),
  ('mariam@wazen.app','Family trip','goal',1500,240),
  ('yousef@wazen.app','Emergency fund','emergency_fund',4500,365),
  ('yousef@wazen.app','New car down payment','goal',3000,300),
  ('layan@wazen.app','New bicycle','goal',60,120),
  ('abdulrahman@wazen.app','Football boots','goal',35,90),
  ('reem@wazen.app','Laptop','goal',300,200),
  ('fahad@wazen.app','Gaming console','goal',220,180),
  ('dana@wazen.app','Emergency fund','emergency_fund',600,365),
  ('dana@wazen.app','Study abroad semester','goal',1200,330),
  ('yaqoub@wazen.app','Emergency fund','emergency_fund',700,365),
  ('yaqoub@wazen.app','New laptop','goal',450,150),
  ('hessa@wazen.app','Emergency fund','emergency_fund',5000,365),
  ('hessa@wazen.app','Home deposit','goal',8000,700),
  ('saad@wazen.app','Emergency fund','emergency_fund',5500,365),
  ('saad@wazen.app','Wedding fund','goal',6000,500),
  ('deema@wazen.app','Emergency fund','emergency_fund',6000,365),
  ('deema@wazen.app','Studio equipment','goal',2200,270),
  ('khaled@wazen.app','Emergency fund','emergency_fund',6500,365),
  ('khaled@wazen.app','Business expansion','goal',5000,400)
) AS v(email, name, kind, target, days)
JOIN auth.users u ON lower(u.email) = v.email;

-- Recurring items
INSERT INTO public.recurring_items (user_id, kind, name, category, amount, day_of_month, currency)
SELECT u.id, v.kind, v.name, v.category, v.amount, v.dom, 'KWD'
FROM (VALUES
  ('mariam@wazen.app','income','Monthly salary','Salary',1100,25),
  ('mariam@wazen.app','expense','School fees','Education',180,5),
  ('mariam@wazen.app','saving','Emergency fund transfer','Savings',150,26),
  ('yousef@wazen.app','income','Monthly salary','Salary',1600,25),
  ('yousef@wazen.app','expense','Rent','Housing',450,1),
  ('yousef@wazen.app','expense','Children allowances','Family',120,1),
  ('yousef@wazen.app','saving','Emergency fund transfer','Savings',250,26),
  ('layan@wazen.app','income','Weekly allowance','Allowance',5,1),
  ('abdulrahman@wazen.app','income','Weekly allowance','Allowance',7,1),
  ('reem@wazen.app','income','Monthly allowance','Allowance',40,1),
  ('reem@wazen.app','expense','Phone credit','Mobile',6,10),
  ('reem@wazen.app','saving','Savings transfer','Savings',10,2),
  ('fahad@wazen.app','income','Monthly allowance','Allowance',50,1),
  ('fahad@wazen.app','expense','Phone credit','Mobile',8,10),
  ('fahad@wazen.app','saving','Savings transfer','Savings',15,2),
  ('dana@wazen.app','income','Family support','Support',150,1),
  ('dana@wazen.app','income','Part-time work','Part-time',120,28),
  ('dana@wazen.app','expense','University transport','Transport',25,3),
  ('dana@wazen.app','saving','Savings transfer','Savings',30,2),
  ('yaqoub@wazen.app','income','Family support','Support',160,1),
  ('yaqoub@wazen.app','income','Campus job','Part-time',140,28),
  ('yaqoub@wazen.app','expense','Books and supplies','Education',20,8),
  ('yaqoub@wazen.app','saving','Savings transfer','Savings',35,2),
  ('hessa@wazen.app','income','Monthly salary','Salary',1250,25),
  ('hessa@wazen.app','expense','Rent','Housing',350,1),
  ('hessa@wazen.app','expense','Internet','Utilities',20,7),
  ('hessa@wazen.app','saving','Emergency fund transfer','Savings',200,26),
  ('saad@wazen.app','income','Monthly salary','Salary',1400,25),
  ('saad@wazen.app','expense','Car installment','Transport',180,5),
  ('saad@wazen.app','expense','Gym membership','Health',25,12),
  ('saad@wazen.app','saving','Emergency fund transfer','Savings',220,26),
  ('deema@wazen.app','income','Client retainer','Freelance',700,15),
  ('deema@wazen.app','expense','Studio rent','Housing',200,1),
  ('deema@wazen.app','expense','Design software','Software',18,9),
  ('deema@wazen.app','saving','Emergency fund transfer','Savings',180,20),
  ('khaled@wazen.app','income','Client retainer','Freelance',850,15),
  ('khaled@wazen.app','expense','Workshop rent','Housing',260,1),
  ('khaled@wazen.app','expense','Accounting service','Business',30,9),
  ('khaled@wazen.app','saving','Emergency fund transfer','Savings',200,20)
) AS v(email, kind, name, category, amount, dom)
JOIN auth.users u ON lower(u.email) = v.email;

-- Transactions: this month and last month, relative to today
INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, currency)
SELECT u.id, v.kind, v.category, v.merchant, v.amount, CURRENT_DATE - (v.ago || ' days')::interval, 'KWD'
FROM (VALUES
  ('mariam@wazen.app','income','Salary','Employer',1100,26),
  ('mariam@wazen.app','expense','Groceries','Sultan Center',86.500,3),
  ('mariam@wazen.app','expense','Education','School',180,12),
  ('mariam@wazen.app','expense','Dining','Café Bianco',12.750,1),
  ('mariam@wazen.app','refund','Groceries','Sultan Center',9.250,2),
  ('yousef@wazen.app','income','Salary','Employer',1600,26),
  ('yousef@wazen.app','expense','Housing','Landlord',450,20),
  ('yousef@wazen.app','expense','Family','Allowances',120,20),
  ('yousef@wazen.app','expense','Fuel','Q8 Station',18.400,4),
  ('yousef@wazen.app','expense','Groceries','Lulu',64.300,6),
  ('layan@wazen.app','income','Allowance','Mom',5,7),
  ('layan@wazen.app','income','Allowance','Dad',5,1),
  ('layan@wazen.app','expense','Toys','Toy Shop',3.500,5),
  ('layan@wazen.app','expense','Snacks','School canteen',1.250,2),
  ('abdulrahman@wazen.app','income','Allowance','Dad',7,1),
  ('abdulrahman@wazen.app','income','Allowance','Dad',7,8),
  ('abdulrahman@wazen.app','expense','Games','Game Store',4.750,3),
  ('abdulrahman@wazen.app','expense','Snacks','Bakery',1.500,1),
  ('reem@wazen.app','income','Allowance','Dad',40,18),
  ('reem@wazen.app','expense','Mobile','Zain',6,10),
  ('reem@wazen.app','expense','Clothes','H&M',14.900,5),
  ('reem@wazen.app','expense','Dining','Shake Shack',5.250,2),
  ('fahad@wazen.app','income','Allowance','Dad',50,18),
  ('fahad@wazen.app','expense','Mobile','Ooredoo',8,10),
  ('fahad@wazen.app','expense','Games','Steam',9.500,4),
  ('fahad@wazen.app','expense','Dining','Burger Hub',6.750,1),
  ('dana@wazen.app','income','Support','Family',150,18),
  ('dana@wazen.app','income','Part-time','Bookstore',120,2),
  ('dana@wazen.app','expense','Transport','Fuel',25,15),
  ('dana@wazen.app','expense','Coffee','Caribou',3.200,1),
  ('dana@wazen.app','expense','Education','University Store',18.500,9),
  ('yaqoub@wazen.app','income','Support','Family',160,18),
  ('yaqoub@wazen.app','income','Part-time','Campus job',140,2),
  ('yaqoub@wazen.app','expense','Education','Bookstore',20,11),
  ('yaqoub@wazen.app','expense','Dining','Subway',4.750,3),
  ('yaqoub@wazen.app','expense','Transport','Uber',6.200,1),
  ('hessa@wazen.app','income','Salary','Employer',1250,26),
  ('hessa@wazen.app','expense','Housing','Landlord',350,20),
  ('hessa@wazen.app','expense','Groceries','Carrefour',72.400,5),
  ('hessa@wazen.app','expense','Utilities','Internet',20,13),
  ('hessa@wazen.app','expense','Coffee','Starbucks',4.100,1),
  ('hessa@wazen.app','refund','Clothes','Zara',15.000,3),
  ('saad@wazen.app','income','Salary','Employer',1400,26),
  ('saad@wazen.app','expense','Transport','Car installment',180,16),
  ('saad@wazen.app','expense','Groceries','Lulu',58.900,4),
  ('saad@wazen.app','expense','Health','Gym',25,9),
  ('saad@wazen.app','expense','Dining','Mais Alghanim',22.500,2),
  ('deema@wazen.app','income','Freelance','Retainer client',700,6),
  ('deema@wazen.app','income','Freelance','Brand project',180,2),
  ('deema@wazen.app','expense','Housing','Studio rent',200,20),
  ('deema@wazen.app','expense','Software','Adobe',18,12),
  ('deema@wazen.app','expense','Groceries','Sultan Center',49.750,3),
  ('khaled@wazen.app','income','Freelance','Retainer client',850,6),
  ('khaled@wazen.app','income','Freelance','Workshop job',260,1),
  ('khaled@wazen.app','expense','Housing','Workshop rent',260,20),
  ('khaled@wazen.app','expense','Business','Accountant',30,12),
  ('khaled@wazen.app','expense','Fuel','Q8 Station',22.300,2)
) AS v(email, kind, category, merchant, amount, ago)
JOIN auth.users u ON lower(u.email) = v.email;

-- Saving transfers linked to goals
INSERT INTO public.transactions (user_id, kind, category, merchant, amount, occurred_on, currency, goal_id)
SELECT g.user_id, 'saving', 'Savings', g.name, v.amount, CURRENT_DATE - (v.ago || ' days')::interval, 'KWD', g.id
FROM (VALUES
  ('mariam@wazen.app','Emergency fund',150,25),
  ('mariam@wazen.app','Emergency fund',150,55),
  ('mariam@wazen.app','Family trip',80,20),
  ('yousef@wazen.app','Emergency fund',250,25),
  ('yousef@wazen.app','Emergency fund',250,55),
  ('yousef@wazen.app','New car down payment',200,18),
  ('layan@wazen.app','New bicycle',4,20),
  ('layan@wazen.app','New bicycle',4,6),
  ('abdulrahman@wazen.app','Football boots',5,14),
  ('reem@wazen.app','Laptop',10,17),
  ('reem@wazen.app','Laptop',10,47),
  ('fahad@wazen.app','Gaming console',15,17),
  ('fahad@wazen.app','Gaming console',15,47),
  ('dana@wazen.app','Emergency fund',30,17),
  ('dana@wazen.app','Study abroad semester',40,10),
  ('yaqoub@wazen.app','Emergency fund',35,17),
  ('yaqoub@wazen.app','New laptop',45,10),
  ('hessa@wazen.app','Emergency fund',200,25),
  ('hessa@wazen.app','Emergency fund',200,55),
  ('hessa@wazen.app','Home deposit',150,15),
  ('saad@wazen.app','Emergency fund',220,25),
  ('saad@wazen.app','Wedding fund',180,15),
  ('deema@wazen.app','Emergency fund',180,19),
  ('deema@wazen.app','Studio equipment',120,8),
  ('khaled@wazen.app','Emergency fund',200,19),
  ('khaled@wazen.app','Business expansion',300,8)
) AS v(email, goal_name, amount, ago)
JOIN auth.users u ON lower(u.email) = v.email
JOIN public.goals g ON g.user_id = u.id AND g.name = v.goal_name;