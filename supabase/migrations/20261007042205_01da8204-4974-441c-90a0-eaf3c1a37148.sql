ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_published integer NOT NULL DEFAULT 1;
UPDATE public.plans SET max_projects = -1;
UPDATE public.plans SET max_published = CASE WHEN price_bdt = 0 THEN 1 ELSE 10 END;

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('animation','icon','illustration','background')),
  type text NOT NULL CHECK (type IN ('lottie','svg','png','css')),
  url_or_code text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update assets" ON public.assets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.assets (name, category, type, url_or_code, tags) VALUES
('অরোরা গ্রেডিয়েন্ট','background','css','background: linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);','{gradient,blue}'),
('সানসেট','background','css','background: linear-gradient(135deg,#f97316 0%,#facc15 100%);','{gradient,orange}'),
('ফরেস্ট','background','css','background: linear-gradient(135deg,#065f46 0%,#34d399 100%);','{gradient,green}'),
('মিডনাইট','background','css','background: linear-gradient(180deg,#0f172a 0%,#1e1b4b 100%);','{dark,gradient}'),
('মেশ গ্রেডিয়েন্ট','background','css','background-color:#0f0a1e; background-image: radial-gradient(at 20% 20%,#4f46e5 0,transparent 50%), radial-gradient(at 80% 30%,#06b6d4 0,transparent 50%), radial-gradient(at 50% 90%,#7c3aed 0,transparent 50%);','{mesh}'),
('ডট প্যাটার্ন','background','css','background-color:#ffffff; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;','{pattern,dots,light}'),
('গ্রিড প্যাটার্ন','background','css','background-color:#0b1020; background-image: linear-gradient(#1e293b 1px,transparent 1px), linear-gradient(90deg,#1e293b 1px,transparent 1px); background-size: 32px 32px;','{pattern,grid,dark}'),
('স্ট্রাইপ','background','css','background: repeating-linear-gradient(45deg,#f1f5f9 0,#f1f5f9 10px,#e2e8f0 10px,#e2e8f0 20px);','{pattern,stripes}'),
('পাহাড় ও সূর্য','illustration','svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#e0f2fe"/><circle cx="150" cy="35" r="18" fill="#facc15"/><path d="M0 120 L60 50 L100 95 L140 60 L200 120Z" fill="#4f46e5"/><path d="M0 120 L40 85 L80 120Z" fill="#06b6d4"/></svg>','{nature,hero}'),
('শপিং ব্যাগ','illustration','svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160"><rect x="50" y="50" width="100" height="100" rx="12" fill="#4f46e5"/><path d="M75 50 V40 a25 25 0 0 1 50 0 V50" fill="none" stroke="#06b6d4" stroke-width="8"/><circle cx="80" cy="80" r="5" fill="#fff"/><circle cx="120" cy="80" r="5" fill="#fff"/></svg>','{shop,ecommerce}'),
('চ্যাট বাবল','illustration','svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><rect x="20" y="20" width="110" height="60" rx="16" fill="#4f46e5"/><path d="M40 80 L40 100 L60 80Z" fill="#4f46e5"/><rect x="80" y="60" width="100" height="55" rx="16" fill="#06b6d4"/><path d="M160 115 L160 132 L142 115Z" fill="#06b6d4"/></svg>','{chat,support}'),
('রকেট','illustration','svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M80 15 C110 40 115 80 100 115 H60 C45 80 50 40 80 15Z" fill="#e2e8f0"/><circle cx="80" cy="60" r="12" fill="#06b6d4"/><path d="M60 95 L35 125 L62 115Z M100 95 L125 125 L98 115Z" fill="#4f46e5"/><path d="M68 115 L80 148 L92 115Z" fill="#f97316"/></svg>','{startup,launch}');