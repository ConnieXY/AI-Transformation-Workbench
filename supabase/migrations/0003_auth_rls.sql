-- =============================================================
-- Auth + RLS：数据隔离（修复 IDOR）
-- 前置：Supabase → Authentication → Sign In / Providers → 开启「Anonymous sign-ins」
-- 在 SQL Editor 运行一次。
--
-- 机制：每个浏览器匿名登录获得 JWT；API 用该 JWT 访问 DB，
--       RLS 按 owner = auth.uid() 强制"只能读写自己的数据"。
-- 业务数据走 RLS；知识库(documents/chunks)与 llm_traces 仍由服务端 service_role
-- 访问（共享语料 / 可观测面），不在此处放开。
-- 既有旧测试数据 owner 为 NULL → 对任何用户不可见（featured 为静态快照，不受影响）。
-- =============================================================

do $$
declare t text;
begin
  -- 8 张用户业务表：加 owner（新插入默认取 auth.uid()）+ owner 维度的 RLS 策略
  foreach t in array array[
    'companies','assessments','solutions','incidents',
    'incident_analyses','tasks','review_reports','workflow_events'
  ] loop
    execute format('alter table %I add column if not exists owner uuid default auth.uid();', t);
    execute format('drop policy if exists own_policy on %I;', t);
    execute format(
      'create policy own_policy on %I for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());',
      t
    );
  end loop;

  -- 这几张表原先 session_id NOT NULL；改为可空（归属改由 owner 承担）
  foreach t in array array['companies','assessments','solutions','incidents'] loop
    execute format('alter table %I alter column session_id drop not null;', t);
  end loop;
end $$;
