create table public.skill_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_bn text not null,
  icon text not null default '✨',
  system_prompt text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.skill_packs to anon, authenticated;
grant insert, update, delete on public.skill_packs to authenticated;
grant all on public.skill_packs to service_role;
alter table public.skill_packs enable row level security;
create policy "read active packs" on public.skill_packs for select using (is_active or public.has_role(auth.uid(),'admin'));
create policy "admin manage packs" on public.skill_packs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.project_analysis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique not null references public.projects(id) on delete cascade,
  file_map_json jsonb not null default '[]',
  framework text not null default '',
  entry_file text not null default '',
  file_count integer not null default 0,
  analyzed_at timestamptz not null default now()
);
grant select on public.project_analysis to authenticated;
grant all on public.project_analysis to service_role;
alter table public.project_analysis enable row level security;
create policy "owner reads analysis" on public.project_analysis for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

alter table public.projects add column skill_pack_id uuid references public.skill_packs(id) on delete set null;

insert into public.skill_packs (slug, name_bn, icon, sort_order, system_prompt) values
('shop','দোকান','🛒',1,'SKILL PACK: E-COMMERCE SHOP. Build a product grid with cards (image, name, price in Bangladeshi Taka formatted like ৳১,২৫০ or ৳1,250, "কার্টে যোগ করুন" button). Include a working cart drawer in vanilla JS (add/remove, quantity, subtotal in ৳, localStorage). Include category filter, featured/discount badges, a simple checkout form (name, phone, address, payment: ক্যাশ অন ডেলিভারি / বিকাশ / নগদ), delivery info, trust badges and WhatsApp order button.'),
('restaurant','রেস্টুরেন্ট','🍔',2,'SKILL PACK: RESTAURANT. Include an appetizing hero, menu organized in sections (নাস্তা, মেইন কোর্স, ডেজার্ট, পানীয়) with prices in ৳, a food photo gallery grid, opening hours, a table reservation form (name, phone, date, time, guests), a location section with an embedded Google Maps iframe (maps.google.com/maps?q=...&output=embed), delivery/order buttons and customer reviews.'),
('portfolio','পোর্টফোলিও','💼',3,'SKILL PACK: PORTFOLIO. Personal hero with name, role and photo, about section, project showcase grid with hover details and links, animated skills bars with percentages, experience/education timeline, testimonials, a contact form and a prominent "CV ডাউনলোড" button (link to cv.pdf with download attribute), plus social links.'),
('blog','ব্লগ','📝',4,'SKILL PACK: BLOG. Featured post hero, article card grid (cover, category tag, title, excerpt, date, read time), category sidebar/filter, a sample full article layout with good typography for Bangla reading (line-height 1.8), author box, newsletter subscribe form and search UI.'),
('agency','এজেন্সি','🏢',5,'SKILL PACK: AGENCY. Bold hero with value proposition and CTA, services grid with icons, process steps, case studies/portfolio, client logos strip, stats counters, team section, pricing packages in ৳, testimonials, FAQ and a lead/contact form.'),
('coaching','কোচিং','🎓',6,'SKILL PACK: COACHING CENTER. Hero with admission CTA, courses/batches cards (class, subject, schedule, monthly fee in ৳), teacher profiles, results/success stats (GPA-5 count etc.), admission form (student name, class, guardian phone), class routine table, notice board, testimonials from students/guardians and location/contact.');