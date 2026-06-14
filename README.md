# DPS LMS

A Learning Management System for CBSE schools built with Next.js 14, Supabase, and Tailwind CSS.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd dps-lms
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in your Supabase dashboard under **Project Settings → API**.

### 3. Run the database migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste the contents of `supabase/migrations/001_initial.sql`
4. Click **Run**

### 4. Create an admin user

In Supabase dashboard go to **Authentication → Users → Add user** and create an email/password user. That is the only login that will work — there is no signup page.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Admin login |
| `/dashboard` | Overview counts |
| `/setup/classes` | Add classes, upload student CSVs |
| `/setup/curriculum` | Add units and learning goals per class |
| `/questions` | Upload questions CSV, browse/filter |
| `/responses` | Upload clicker response CSVs, batch history |
| `/reports` | Student × learning goal score matrix |
| `/remedy` | Generate personalised remedy PDF per student/goal |

## CSV formats

### Students (`/setup/classes`)
```
student_id,roll_number,section,name
5-A-1001,1001,A,Arjun Sharma
```

### Questions (`/questions`)
```
question_uid,question_text,option_1,option_2,option_3,option_4,correct_answer,level,hint,image_url,is_remedy,curriculum_id
Q001,What is photosynthesis?,A process,B process,C process,D process,A process,Theory,Think about plants,, true,<uuid>
```

### Responses (`/responses`)
```
question_uid,student_id,is_correct,time_taken_secs,response_option
Q001,5-A-1001,true,12,A
```
