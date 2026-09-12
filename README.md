# Wazen Onboarding Hub

We are building Wazen, a course project for a personal finance and financial education web app.

IMPORTANT:

Do not add unrelated features yet.

Do not build Investments, Zakat, AI, Quizzes, Challenges, Analytics, or other modules yet.

For this step, ONLY build the authentication, database foundation, user profiles, and life-stage system.

TECH STACK:

- Lovable

- Supabase

- Supabase Auth

- PostgreSQL

- Real persistent database data

- No fake/static authentication

==================================================

1. AUTHENTICATION

==================================================

Implement real Supabase Authentication.

Users must be able to:

- Sign Up

- Sign In

- Sign Out

- Forgot Password

- Reset Password

- Maintain secure authenticated sessions

Sign-up fields:

- Full Name

- Email

- Password

- Date of Birth

- Gender

- Life Stage

- Preferred Language

- Base Currency

Validate all fields properly.

Do not store passwords manually in the profiles table.

Use Supabase Auth for authentication.

After successful registration:

- Create the authenticated Supabase user

- Create the corresponding profile record

- Redirect the user to the appropriate onboarding/welcome experience.

==================================================

2. PROFILES DATABASE

==================================================

Create a profiles table linked securely to auth.users.

Profile fields should include:

- id

- full_name

- date_of_birth

- gender

- life_stage

- language

- base_currency

- account_type

- avatar_url (optional)

- created_at

- updated_at

The profile ID must reference the authenticated user's ID.

Date of birth must be stored as the source of truth for age.

IMPORTANT:

Do NOT store a manually entered age.

Age must always be calculated automatically from date_of_birth and the current date.

The calculated age should update automatically as time passes.

Gender options:

- Female

- Male

Once the user selects their gender, it should not be editable later.

Date of birth should also not be editable after account creation.

==================================================

3. LIFE STAGES

==================================================

Wazen has five main life stages:

- Child

- Teenager

- University Student

- Employee

- Self-employed

The experience and available features will later depend on the user's life stage.

Age should be used to determine the appropriate life-stage experience for children and teenagers.

Children and teenagers cannot create completely independent accounts.

They must be connected to a parent/guardian account through a proper family relationship.

Adults are independent accounts.

For users aged 18+:

Allow them to select:

- University Student

- Employee

- Self-employed

University students remain independent users even if their parents financially support them.

Parents must NOT automatically have access to university student accounts.

==================================================

4. FAMILY RELATIONSHIP FOUNDATION

==================================================

Create the database foundation for future family functionality.

Create a family_relationships table with appropriate fields such as:

- id

- parent_user_id

- child_user_id

- relationship_type

- permissions/status

- created_at

- updated_at

Use foreign keys to profiles.

The purpose of this table is to support parent → child/teen relationships later.

Do NOT build the full Family dashboard yet.

Only create the secure database foundation.

==================================================

5. SECURITY / RLS

==================================================

Enable Row Level Security on all user-sensitive tables.

A normal authenticated user must only be able to access their own profile.

Users must not be able to:

- edit another user's profile

- read another user's private profile

- change another user's gender

- change another user's date of birth

- manipulate another user's life stage

- access another user's data by changing an ID in the URL or request

Do not rely only on frontend restrictions.

Enforce authorization through Supabase RLS/database policies.

Prepare the architecture so future parent/child permissions can also be enforced server-side.

==================================================

6. ONBOARDING

==================================================

Create a clean onboarding flow after registration.

Step 1:

Basic Information

- Full Name

- Date of Birth

- Gender

Step 2:

Life Stage

- Determine age automatically from DOB

- If Child/Teenager, use the appropriate age-based experience

- If 18+, allow:

  - University Student

  - Employee

  - Self-employed

Step 3:

Preferences

- Language

- Base Currency

Then show a personalized welcome screen.

Example:

"Welcome to Wazen, Mariam."

"Let's build healthier financial habits together."

The wording should adapt to the user's life stage.

Then provide:

"Go to Dashboard"

Do not build the actual financial dashboard yet.

Use a temporary placeholder page after onboarding.

==================================================

7. DEMO ACCOUNTS

==================================================

Create these as REAL Supabase database accounts, not static demo screens.

All demo accounts use:

Password:

12345678

Create exactly these 12 accounts:

1. Mariam

Life Stage: Mother / Parent

2. Yousef

Life Stage: Father / Parent

3. Layan

Age: 8

Life Stage: Child

Gender: Female

4. Abdulrahman

Age: 11

Life Stage: Child

Gender: Male

5. Reem

Age: 14

Life Stage: Teenager

Gender: Female

6. Fahad

Age: 16

Life Stage: Teenager

Gender: Male

7. Dana

Gender: Female

Life Stage: University Student

8. Yaqoub

Gender: Male

Life Stage: University Student

9. Hessa

Gender: Female

Life Stage: Employee

10. Saad

Gender: Male

Life Stage: Employee

11. Deema

Gender: Female

Life Stage: Self-employed

12. Khaled

Gender: Male

Life Stage: Self-employed

Use real authentication accounts and real profile records.

Do not display fake credentials in the UI beyond the dedicated demo-account selector.

==================================================

8. DEMO ACCOUNT SELECTOR

==================================================

On the Sign In page, add a small section:

"✨ Explore Wazen"

Show the available demo accounts.

When a user selects a demo account:

- Automatically fill the correct email

- Automatically fill password: 12345678

- The user then clicks Sign In

Do not automatically sign in without the user clicking Sign In.

==================================================

9. FAMILY RELATIONSHIPS FOR DEMO DATA

==================================================

Create these relationships:

Parents:

- Mariam

- Yousef

Children:

- Layan

- Abdulrahman

Teenagers:

- Reem

- Fahad

Both Mariam and Yousef should be connected as parents/guardians to:

- Layan

- Abdulrahman

- Reem

- Fahad

Yousef is the parent who will later provide allowances.

Mariam will later have monitoring access.

Do NOT give either parent access to:

- Dana

- Yaqoub

- Hessa

- Saad

- Deema

- Khaled

University students and adult users are independent.

==================================================

10. DESIGN FOUNDATION

==================================================

Keep Wazen's existing visual identity.

Design direction:

Luxury Minimal / Premium Financial App.

Use:

- Warm ivory / warm off-white background

- Dark charcoal text

- Soft shadows

- Elegant typography

- Thin modern icons

- Rounded corners everywhere

- No sharp corners

- No pure white background

- No pure black text

- Clean spacing

- Restrained animations

- Premium but friendly appearance

Light mode is the default.

Make the layout responsive for:

- Mobile

- Tablet

- Laptop

- Desktop

Do not redesign unrelated existing pages unnecessarily.

==================================================

11. PROFILE PAGE

==================================================

Create the basic Profile page.

Show:

- Profile photo/avatar

- Full Name

- Date of Birth

- Calculated Age

- Gender

- Life Stage

- Language

- Base Currency

- Account Type

Rules:

- Date of Birth is read-only

- Gender is read-only

- Age is calculated automatically

- Other appropriate profile settings can be editable

Changes must persist to Supabase.

==================================================

12. SETTINGS FOUNDATION

==================================================

Create the basic Settings structure.

Sections:

Account

- Name

- Email

- Date of Birth

- Gender

- Life Stage

Preferences

- Language

- Base Currency

- Light/Dark Mode

Security

- Change Password

- Sign Out

Persist settings in the database where appropriate.

Do not build advanced notification or financial preferences yet.

==================================================

13. IMPORTANT IMPLEMENTATION RULES

==================================================

Use real Supabase data.

Do not hardcode user state.

Do not create fake authentication.

Do not create fake database responses.

Do not expose Supabase service-role keys in the frontend.

Use environment variables/secrets correctly.

Keep the architecture clean and scalable because later Wazen modules will depend on these users and profiles.

Make sure the application still works if the user refreshes the page.

Authenticated users should remain authenticated through secure Supabase sessions.

Before finishing:

- Test Sign Up

- Test Sign In

- Test Sign Out

- Test Forgot Password flow

- Test profile creation

- Test profile editing

- Test DOB → automatic age calculation

- Test gender/DOB protection

- Test RLS

- Test demo accounts

- Test parent/child relationships

- Test mobile responsiveness

Do not implement the next Wazen modules yet.

At the end, give a concise summary of what was implemented and any setup steps I still need to complete in Supabase.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wazenkw.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/783c8e2b-0272-40b2-9952-b06bf8328649).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
