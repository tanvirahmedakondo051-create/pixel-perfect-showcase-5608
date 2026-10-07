CREATE TABLE public.curated_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'unsplash',
  source_url text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT 'Unsplash License',
  attribution_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.curated_lotties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  json_url text NOT NULL,
  title text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'lottiefiles',
  source_url text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT 'Lottie Simple License',
  attribution_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.icon_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_set text NOT NULL,
  name text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (icon_set, name)
);
CREATE TABLE public.pexels_cache (
  query text PRIMARY KEY,
  results jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.curated_photos, public.curated_lotties, public.icon_favorites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curated_photos, public.curated_lotties, public.icon_favorites TO authenticated;
GRANT ALL ON public.curated_photos, public.curated_lotties, public.icon_favorites, public.pexels_cache TO service_role;
ALTER TABLE public.curated_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_lotties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icon_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pexels_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read enabled photos" ON public.curated_photos FOR SELECT USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin photos" ON public.curated_photos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read enabled lotties" ON public.curated_lotties FOR SELECT USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin lotties" ON public.curated_lotties FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read enabled icons" ON public.icon_favorites FOR SELECT USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin icons" ON public.icon_favorites FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.curated_photos (category, url, alt, tags) VALUES
('hero-business','https://images.unsplash.com/photo-1497366216548-37526070297c','Bright modern open-plan office','{business,corporate,office,saas}'),
('hero-business','https://images.unsplash.com/photo-1556761175-5973dc0f32e7','Business team discussing at a table','{business,meeting,agency,corporate}'),
('hero-business','https://images.unsplash.com/photo-1521737604893-d14cc237f11d','Team collaborating around laptops','{business,startup,agency,team}'),
('hero-technology','https://images.unsplash.com/photo-1518770660439-4636190af475','Close-up of a circuit board','{technology,saas,hardware,tech}'),
('hero-technology','https://images.unsplash.com/photo-1451187580459-43490279c0fa','Earth at night with network lights','{technology,global,saas,data}'),
('hero-technology','https://images.unsplash.com/photo-1550751827-4bd374c3f58b','Abstract cybersecurity visual','{technology,security,saas,tech}'),
('hero-technology','https://images.unsplash.com/photo-1498050108023-c5249f4df085','Laptop with code on a desk','{technology,developer,coding,saas}'),
('hero-creative','https://images.unsplash.com/photo-1513364776144-60967b0f800f','Paint brushes and colorful palette','{creative,art,portfolio,design}'),
('hero-creative','https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b','Colorful abstract painting','{creative,art,portfolio}'),
('hero-nature','https://images.unsplash.com/photo-1506905925346-21bda4d32df4','Mountain peaks above clouds','{nature,travel,landscape}'),
('hero-nature','https://images.unsplash.com/photo-1441974231531-c6227db76b6e','Sunlight through a green forest','{nature,eco,wellness}'),
('hero-nature','https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05','Misty green hills','{nature,travel,landscape}'),
('hero-abstract','https://images.unsplash.com/photo-1557672172-298e090bd0f1','Soft colorful gradient shapes','{abstract,gradient,background}'),
('hero-abstract','https://images.unsplash.com/photo-1579546929518-9e396f3cc809','Smooth multicolor gradient','{abstract,gradient,background}'),
('team','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d','Portrait of a smiling man','{team,portrait,testimonial}'),
('team','https://images.unsplash.com/photo-1494790108377-be9c29b29330','Portrait of a smiling woman','{team,portrait,testimonial}'),
('team','https://images.unsplash.com/photo-1500648767791-00dcc994a43e','Portrait of a man outdoors','{team,portrait,testimonial}'),
('team','https://images.unsplash.com/photo-1438761681033-6461ffad8d80','Portrait of a woman','{team,portrait,testimonial}'),
('food','https://images.unsplash.com/photo-1504674900247-0877df9cc836','Plated gourmet dish','{food,restaurant,menu}'),
('food','https://images.unsplash.com/photo-1414235077428-338989a2e8c0','Elegant restaurant dining table','{food,restaurant,dining}'),
('food','https://images.unsplash.com/photo-1546069901-ba9599a7e63c','Fresh healthy salad bowl','{food,healthy,restaurant,menu}'),
('food','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4','Warm restaurant interior','{food,restaurant,cafe}'),
('product','https://images.unsplash.com/photo-1523275335684-37898b6baf30','Minimal wristwatch product shot','{product,shop,ecommerce,watch}'),
('product','https://images.unsplash.com/photo-1505740420928-5e560c06d30e','Headphones on a plain background','{product,shop,ecommerce,electronics}'),
('product','https://images.unsplash.com/photo-1542291026-7eec264c27ff','Red sneaker product shot','{product,shop,ecommerce,fashion}'),
('office','https://images.unsplash.com/photo-1524758631624-e2822e304c36','Stylish workspace with plants','{office,workspace,interior}'),
('office','https://images.unsplash.com/photo-1497215728101-856f4ea42174','Clean modern office desks','{office,workspace,corporate}'),
('lifestyle','https://images.unsplash.com/photo-1529156069898-49953e39b3ac','Friends laughing together','{lifestyle,community,people}'),
('lifestyle','https://images.unsplash.com/photo-1517836357463-d25dfeac3438','Person training at the gym','{lifestyle,fitness,gym,health}'),
('lifestyle','https://images.unsplash.com/photo-1511988617509-a57c8a288659','Friends enjoying a sunset','{lifestyle,travel,people}');
UPDATE public.curated_photos SET source_url = 'https://unsplash.com/photos/' || substring(url from 'photo-[0-9a-f-]+');

INSERT INTO public.curated_lotties (category, json_url, title, tags) VALUES
('hero','https://assets2.lottiefiles.com/packages/lf20_jcikwtux.json','People signing up','{hero,signup,people,community}'),
('hero','https://assets9.lottiefiles.com/packages/lf20_khzniaya.json','Film clapperboard','{hero,creative,video,media}'),
('loading_success','https://assets4.lottiefiles.com/packages/lf20_x62chJ.json','Paper plane','{loading,send,contact,message}'),
('loading_success','https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json','Payment successful','{success,payment,shop,checkout}'),
('loading_success','https://assets7.lottiefiles.com/packages/lf20_ktwnwv5m.json','Success check','{success,done,form}'),
('business_technology','https://assets10.lottiefiles.com/packages/lf20_s2lryxtd.json','Loading dots','{loading,tech,saas}'),
('fun_celebration','https://assets6.lottiefiles.com/packages/lf20_u4yrau.json','Confetti cannons','{celebration,party,event,success}'),
('fun_celebration','https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json','Gift box','{gift,offer,shop,celebration}');

INSERT INTO public.icon_favorites (icon_set, name, tags) VALUES
('lucide','search','{search}'),('lucide','settings','{settings}'),('lucide','shield-check','{security,trust}'),('lucide','users','{team,users,community}'),
('lucide','zap','{fast,speed,power}'),('lucide','rocket','{launch,startup,growth}'),('lucide','mail','{email,contact}'),('lucide','phone','{phone,contact,call}'),
('lucide','map-pin','{location,address,map}'),('lucide','clock','{time,hours}'),('lucide','star','{rating,review}'),('lucide','heart','{love,favorite}'),
('lucide','shopping-cart','{cart,shop}'),('lucide','truck','{delivery,shipping}'),('lucide','credit-card','{payment,checkout}'),('lucide','check-circle','{check,success,feature}'),
('mdi','home-outline','{home}'),('mdi','whatsapp','{whatsapp,chat,social}'),('mdi','facebook','{facebook,social}'),('mdi','instagram','{instagram,social}'),
('mdi','silverware-fork-knife','{restaurant,food,menu}'),('mdi','school-outline','{coaching,education}'),('mdi','book-open-page-variant-outline','{blog,reading,course}'),
('ph','sparkle','{magic,ai,premium}'),('ph','paint-brush','{design,creative,art}'),('ph','camera','{photo,portfolio}'),('ph','chat-circle-dots','{chat,support}'),
('ph','gift','{gift,offer}'),('ph','leaf','{eco,nature,organic}'),('ph','briefcase','{business,work,agency}'),
('tabler','chart-line','{analytics,growth,stats}'),('tabler','code','{developer,code}'),('tabler','device-mobile','{mobile,app}'),('tabler','world','{global,web}'),
('tabler','award','{award,quality}'),('tabler','headset','{support,help}'),
('carbon','cloud','{cloud,hosting}'),('carbon','data-base','{database,data}'),('carbon','security','{security}'),('carbon','calendar','{calendar,booking,reservation}');