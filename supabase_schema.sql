-- ============================================================================
-- ZiyoNazorat AI - Supabase PostgreSQL Sxemasi
-- AI Asoslari va Prompt Engineering Platformasi
-- ============================================================================
-- Ushbu skriptni Supabase boshqaruv panelidagi "SQL Editor" bo'limida ishga tushiring (Run).
-- Bu barcha kerakli jadvallarni, xavfsizlik qoidalarini va boshlang'ich ma'lumotlarni yaratadi.

-- 1. GURUHLAR JADVALI (groups)
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  schedule TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FOYDALANUVCHILAR VA GURUH A'ZOLARI (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- 'teacher', 'assistant', 'student'
  title TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  group_name TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  joined_at TEXT DEFAULT '',
  subjects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROMPT VAZIFALARI (assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  subject_badge_class TEXT DEFAULT 'badge-role',
  target_group TEXT DEFAULT 'Barcha guruhlar',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline TEXT DEFAULT '',
  deadline_display TEXT DEFAULT '',
  max_score INT DEFAULT 100,
  difficulty TEXT DEFAULT 'Boshlang''ich',
  criteria TEXT DEFAULT '',
  sample_solution TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOPSHIRILGAN PROMPTLAR VA AI TEKSHIRUVLARI (submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_avatar TEXT DEFAULT '',
  student_group TEXT DEFAULT '',
  submitted_at TEXT DEFAULT '',
  answer_text TEXT NOT NULL,
  attached_file TEXT DEFAULT NULL,
  external_link TEXT DEFAULT NULL,
  status TEXT DEFAULT 'graded',
  ai_report JSONB DEFAULT '{}'::jsonb,
  teacher_note TEXT DEFAULT '',
  teacher_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tezkor qidiruv indekslari
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- XAVFSIZLIK VA RLS (Row Level Security) SOZLAMALARI
-- ============================================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Saytdan Anon (Public) kalit orqali erkin o'qish va yozish ruxsati
DROP POLICY IF EXISTS "Public access for groups" ON public.groups;
CREATE POLICY "Public access for groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for users" ON public.users;
CREATE POLICY "Public access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for assignments" ON public.assignments;
CREATE POLICY "Public access for assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for submissions" ON public.submissions;
CREATE POLICY "Public access for submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REAL-TIME TINGLASH (Jonli o'zgarishlarni darhol qabul qilish)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Agar publication allaqachon mavjud bo'lsa xatolik bermaydi
END $$;

-- ============================================================================
-- BOSHLANG'ICH (DEMO / STANDART) MA'LUMOTLAR
-- ============================================================================
INSERT INTO public.groups (id, name, description, schedule, created_at)
VALUES 
  ('grp-1', '1-Guruh: AI Asoslari', 'Sun''iy intellekt va Prompt muhandisligi boshlang''ich kursi', 'Dush-Chor-Juma (18:00)', NOW()),
  ('grp-2', '2-Guruh: Amaliy Promptlar', 'Amaliy promptlar va murakkab zanjirli ko''rsatmalar kursi', 'Sesh-Pay-Shan (19:00)', NOW()),
  ('grp-3', '3-Guruh: Biznesda AI', 'Biznes va kompaniyalar uchun sun''iy intellekt vositalari', 'Shanba-Yakshanba (10:00)', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, role, title, email, phone, group_name, avatar, joined_at, subjects)
VALUES 
  ('u-teacher-main', 'Ustoz (Admin)', 'teacher', 'AI Asoslari va Prompt Engineering Ustozi', 'ustoz@ziyonazorat.uz', '+998 90 123 45 67', 'Barcha guruhlar', 'UA', '2026-10-28', '["AI Asoslari", "Prompt Engineering"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assignments (id, subject, subject_badge_class, target_group, title, description, deadline, deadline_display, max_score, difficulty, criteria, sample_solution)
VALUES 
  ('hw-pr-101', 'Rol va Kontekst', 'badge-role', 'Barcha guruhlar', 'AI ga aniq rol va kontekst berish (Persona Prompting)', 
   'Sun''iy intellektga oddiy buyruq emas, balki professional darajada ko''rsatma (prompt) yozing.
Topshiriq sharti:
1. AI ga aniq rol bering (Masalan: "Sen 10 yillik tajribaga ega marketing mutaxassisisan...").
2. Vazifaning maqsadini va kontekstini batafsil tushuntiring.
3. AI kimga mo''ljallab yozishi kerakligini (maqsadli auditoriyani) ko''rsating.', 
   '2026-11-05', '5-Noyabr, 2026 (23:59)', 100, 'Boshlang''ich', 
   'Rolning aniqligi (30%), Kontekst va maqsadning to''liqligi (40%), Auditoriya belgilanishi (30%)', 
   'Rol: Sen 10 yillik tajribaga ega raqamli marketing mutaxassisisan.
Kontekst: Toshkent shahrida yangi ochilgan "CoffeeHub" nomli shinam qahvaxona uchun 1 oylik reklama rejasi kerak.
Auditoriya: 18-35 yoshdagi talabalar va frilanserlar.
Vazifa: Instagram va Telegram uchun 5 ta eng samarali reklama g''oyasini qisqa tavsif bilan taklif qil.'),

  ('hw-pr-102', 'Misollar bilan o''rgatish', 'badge-fewshot', 'Barcha guruhlar', 'Few-Shot usuli: Misollar orqali AI ni o''rgatuvchi prompt tuzish', 
   'Sun''iy intellekt siz xohlagan qolipda javob berishi uchun unga avval 2-3 ta to''g''ri namuna (misol) ko''rsatish zarur.
Topshiriq sharti:
1. AI ga mijozlar sharhlarini (fikrlarini) tahlil qilishni buyuring.
2. Unga kamida 2 ta to''g''ri ishlangan misol bering.
3. AI uchinchi yangi sharhni aynan shu qolipda tahlil qilishi uchun to''liq promptni yozing.', 
   '2026-11-07', '7-Noyabr, 2026 (20:00)', 100, 'O''rta', 
   'Misollar sifati va aniqligi (40%), Prompt strukturasi (35%), Chiqish qolipiga moslik (25%)', 
   'Quyidagi misollarga qarab, yangi mijoz sharhini tahlil qil:
Misol 1: "Telefon sifati zo''r, narxi ham qulay." -> Ijobiy (Baho: 5/5)
Misol 2: "Rangi rasmda boshqacha edi, yoqmadi." -> Salbiy (Baho: 2/5)
Endi yangi sharhni xuddi shu formatda tahlil qil: "Mahsulot yaxshi yetib keldi, faqat qutisi ozroq ezilgan."')
ON CONFLICT (id) DO NOTHING;

