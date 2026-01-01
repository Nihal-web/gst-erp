-- ========================================
-- GSTR RLS POLICIES
-- Row Level Security policies for GSTR tables
-- ========================================

-- GSTR-1 Tables Policies
CREATE POLICY "Users can manage their own GSTR-1 returns" ON gstr1_returns
   FOR ALL USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can manage their own GSTR-1 B2B data" ON gstr1_b2b
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2b.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2b.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-1 B2CL data" ON gstr1_b2cl
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2cl.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2cl.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-1 EXP data" ON gstr1_exp
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_exp.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_exp.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-1 B2CS data" ON gstr1_b2cs
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2cs.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_b2cs.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-1 NIL data" ON gstr1_nil
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_nil.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_nil.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-1 CDNR data" ON gstr1_cdnr
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_cdnr.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr1_returns WHERE gstr1_returns.id = gstr1_cdnr.gstr1_return_id AND gstr1_returns.tenant_id = auth.uid())
   );

-- GSTR-3B Tables Policies
CREATE POLICY "Users can manage their own GSTR-3B returns" ON gstr3b_returns
   FOR ALL USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can manage their own GSTR-3B 3.1(a) data" ON gstr3b_3_1_a
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_a.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_a.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 3.1(b) data" ON gstr3b_3_1_b
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_b.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_b.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 3.1(c) data" ON gstr3b_3_1_c
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_c.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_c.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 3.1(d) data" ON gstr3b_3_1_d
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_d.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_d.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 3.1(e) data" ON gstr3b_3_1_e
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_e.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_1_e.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 3.2 data" ON gstr3b_3_2
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_2.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_3_2.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 4 data" ON gstr3b_4
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_4.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_4.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

CREATE POLICY "Users can manage their own GSTR-3B 6.1 data" ON gstr3b_6_1
   FOR ALL USING (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_6_1.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   ) WITH CHECK (
     EXISTS (SELECT 1 FROM gstr3b_returns WHERE gstr3b_returns.id = gstr3b_6_1.gstr3b_return_id AND gstr3b_returns.tenant_id = auth.uid())
   );

-- ========================================
-- GSTR RLS POLICIES COMPLETE ✅
-- ========================================