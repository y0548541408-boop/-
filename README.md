# מערכת ניהול לקוחות לכלכלת המשפחה

Next.js + Supabase (Postgres, Auth, Storage) + Prisma.

## מה כבר בנוי

- **Auth**: כניסה עם קוד חד־פעמי למייל (Supabase Auth, OTP). `src/app/login`
- **DB**: סכמת Prisma מלאה לפי ה-PRD (`prisma/schema.prisma`) — משפחות, בני זוג, תקציב, הוצאות, קיזוזים, משימות, וואטסאפ, לידים, חשבוניות
- **הגנת נתיבים**: `src/proxy.ts` (Next 16 proxy convention, מחליף middleware) מפנה משתמש לא מחובר ל-`/login`
- דשבורד placeholder שמוכיח שההזדהות מקושרת נכון למשפחה שלה במסד הנתונים

## הרצה ראשונה (חובה לפני שממשיכים)

1. **צרו פרויקט Supabase חדש** (חינמי): https://supabase.com/dashboard
2. ב-Project Settings → API, העתיקו:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (שמור בסוד, לא נחשף לדפדפן)
3. ב-Project Settings → Database, העתיקו:
   - `Connection pooling` (port 6543) → `DATABASE_URL`
   - `Direct connection` (port 5432) → `DIRECT_URL`
4. העתיקו `.env.example` ל-`.env.local` ומלאו את הערכים.
5. Authentication → Providers → Email: ודאו ש"Email OTP" פעיל (ולא רק Magic Link). ב-Email Templates → Magic Link, ודאו שהתבנית כוללת `{{ .Token }}` כדי שהלקוח יקבל קוד בן 6 ספרות ולא רק קישור.
6. הריצו:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

7. פתחו http://localhost:3000 — תופנו אוטומטית ל-`/login`.

## הערה על גרסת Prisma

מותקנת גרסה קלאסית מוצמדת (`7.10.0`) ולא ה-RC העדכני (8.0.0), כי הגרסה החדשה עוברת לפלטפורמת Prisma המנוהלת ולא מתאימה לעבודה עם Supabase כמסד נתונים חיצוני. `PrismaClient` מחובר דרך `@prisma/adapter-pg` (ראו `src/lib/prisma.ts`).

## מה עוד לא נבנה (השלבים הבאים)

- דשבורד תקציב אמיתי (קטגוריות, הוצאות, מנגנון קיזוז)
- כספת מסמכים + בדיקת הגנת סיסמה
- זרימת קליטת לקוח (שאלון + טוקן ייעודי)
- אינטגרציית WhatsApp (Meta Cloud API) + פענוח הודעות חופשיות
- Cron למעקב נטישה (48 שעות) ותזכורות משימות
- Back-Office ליועץ (ניהול לקוחות, תבניות משימות, דפי נחיתה)
- אינטגרציית יופי לחשבוניות
