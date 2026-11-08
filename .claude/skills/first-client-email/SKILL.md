---
name: first-client-email
description: Draft Israel's standard FIRST email to a new mortgage client (המייל הראשון ללקוח) in his business Gmail: link to the pre-mortgage questionnaire, request to send documents in one organized email, and the attached document list and tracking file. Use when he asks for "מייל ראשון ללקוח", "המייל הראשון", "תשלח/תכין ללקוח את המייל עם השאלון", or names a client and asks to send the questionnaire email.
---

# First email to a new mortgage client

All replies to the user are in Hebrew (see CLAUDE.md).

## Steps

1. **Find the client** in the business mailbox (the connected Gmail, y0539508209@gmail.com) with `search_threads` on the name the user gave (Hebrew and English spellings). If more than one person matches, pick the most likely one (most recent correspondence, or a name the user said), and say in the reply who else matched. If none matches, ask for the email address.
2. **Create a Gmail draft** with `create_draft` (never send it): `to` = the client, subject and body below. Use the HTML version for formatting and the plain text as `body`.
   - Replace `[שם]` with the client's first name.
   - Plural (לכם, תשלחו) is the default, because couples usually take a mortgage together. If the user says the client is alone, switch to singular (לך / תשלח or תשלחי).
   - Keep `[קישור לשאלון]` as is: the link is personal and is created in the admin page (שאלונים → יצירת קישור → העתקת קישור). Never invent a link.
3. **Tell the user** (in Hebrew) the draft is ready, give its link, and remind him to: paste the questionnaire link, attach the document list, attach the tracking file.

Do not save client names or addresses in this repository.

## The email

Subject: `שאלון ומסמכים לפני לקיחת משכנתא`

```html
<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2B2A;text-align:right">
<p>שלום [שם],</p>
<p>כדי לבנות לכם משכנתא שמתאימה בדיוק לכם, אני צריך שני דברים:</p>
<p><b style="color:#1F5F5B">1. למלא את השאלון:</b> [קישור לשאלון]<br>
אפשר למלא מהטלפון, לעצור באמצע ולהמשיך אחר כך. לא בטוחים בתשובה? זה בסדר, נשלים יחד.</p>
<p><b style="color:#1F5F5B">2. לשלוח את המסמכים:</b> מצורפת רשימה של המסמכים שצריך. אשמח מאוד אם תשלחו אותם במייל אחד מסודר, כשכל מסמך נקרא בשם שמתאר מה הוא, למשל: "תלוש שכר ספטמבר – [שם]".</p>
<p>מצורף גם קובץ מעקב, שבו אפשר לסמן מה כבר נשלח ומה עוד חסר.</p>
<p>אחרי שתשלחו, אעבור על הכל ואחזור אליכם להמשך.</p>
<p>בהצלחה,<br>
<b style="color:#1F5F5B">ישראל שרמן</b><br>
משכנתאות וכלכלת המשפחה | <span dir="ltr">053-950-8209</span></p>
<p style="color:#A35530"><i>חותמים בראש שקט.</i></p>
</div>
```

Plain-text version (for `body`): the same text without HTML, one paragraph per line break, ending with "חותמים בראש שקט."
