# DPS LMS — User Guide

**Delhi Public School × Equanimity Learning**  
Learning Management System — Admin & Teacher Guide

---

## Contents

1. [Overview](#1-overview)
2. [Logging In](#2-logging-in)
3. [Admin Guide — One-Time Setup](#3-admin-guide--one-time-setup)
   - 3.1 [Dashboard](#31-dashboard)
   - 3.2 [Setting Up Classes](#32-setting-up-classes)
   - 3.3 [Uploading & Managing Students](#33-uploading--managing-students)
   - 3.4 [Setting Up Curriculum](#34-setting-up-curriculum)
   - 3.5 [Managing Questions](#35-managing-questions)
4. [Teacher Guide — Day-to-Day Use](#4-teacher-guide--day-to-day-use)
   - 4.1 [Uploading Student Responses](#41-uploading-student-responses)
   - 4.2 [Viewing Reports & Analytics](#42-viewing-reports--analytics)
   - 4.3 [Generating Remedy PDFs](#43-generating-remedy-pdfs)
   - 4.4 [Sharing Remedial Exercises with Students](#44-sharing-remedial-exercises-with-students)
5. [CSV Format Reference](#5-csv-format-reference)

---

## 1. Overview

The DPS LMS is a web-based platform used by **Delhi Public School** in partnership with **Equanimity Learning** to:

- Manage class rosters and curriculum for each grade & subject
- Upload student responses from classroom clicker sessions
- Analyse student performance by learning goal and difficulty level (Theory / Understanding / Application)
- Automatically generate personalised **Remedy PDFs** for students who need additional practice

There are two types of users:

| Role | Responsibilities |
|------|-----------------|
| **Admin** | One-time setup — classes, students, curriculum, questions |
| **Teacher** | Day-to-day — upload responses, read reports, generate & share remedy sheets |

---

## 2. Logging In

Open your browser and navigate to the LMS URL provided by your administrator.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  [DPS Crest]      │      [EQ Tree]       │   │
│   │                                          │   │
│   │      Delhi Public School                 │   │
│   │      × Equanimity Learning               │   │
│   ├──────────────────────────────────────────┤   │
│   │  Admin Portal                            │   │
│   │  Sign in to access the LMS dashboard     │   │
│   │                                          │   │
│   │  Email address                           │   │
│   │  ┌────────────────────────────────────┐  │   │
│   │  │  you@school.edu                    │  │   │
│   │  └────────────────────────────────────┘  │   │
│   │                                          │   │
│   │  Password                                │   │
│   │  ┌────────────────────────────────────┐  │   │
│   │  │  ••••••••••                        │  │   │
│   │  └────────────────────────────────────┘  │   │
│   │                                          │   │
│   │  ┌────────────────────────────────────┐  │   │
│   │  │           Sign in                  │  │   │
│   │  └────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────┘   │
│              Service Before Self                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

Enter your **email address** and **password**, then click **Sign in**. You will be taken to the Dashboard.

> **Note:** If you see a red error message, double-check your credentials. Contact your system administrator if you are locked out.

---

## 3. Admin Guide — One-Time Setup

The admin performs these steps **once** at the start of each academic year (or whenever a new grade/subject is added). After setup, teachers can use the system without needing admin access.

### Navigation Sidebar

After logging in you will see a sidebar on the left on every page:

```
┌────────────────────────┐
│  [DPS]    [EQ]         │
├────────────────────────┤
│  Dashboard             │
│                        │
│  ▸ Setup               │
│    Classes & Students  │
│    Curriculum          │
│                        │
│  Questions             │
│  Responses             │
│  Reports               │
│  Remedy                │
├────────────────────────┤
│  admin@dps.edu         │
│  Sign out              │
└────────────────────────┘
```

Click any item in the sidebar to navigate. The active page is highlighted in blue.

---

### 3.1 Dashboard

The Dashboard is the first page you see after logging in. It gives a quick count of everything in the system.

```
┌──────────────────────────────────────────────────────┐
│  Dashboard                                           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ Classes  │  │ Students │  │Questions │  │Resp. │ │
│  │    4     │  │   128    │  │   210    │  │ 3840 │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────┘ │
└──────────────────────────────────────────────────────┘
```

No action is required here — it updates automatically as data is added.

---

### 3.2 Setting Up Classes

Go to **Classes & Students** in the sidebar.

A **class** in this system represents one section of a grade and subject, e.g. Grade 7, Section A, Science, 2024–25.

#### Adding a Class

Fill in the form at the top of the page:

```
┌──────────────────────────────────────────────────────┐
│  Add Class                                           │
│                                                      │
│  Grade          Section                              │
│  ┌───────────┐  ┌───────────┐                        │
│  │  7        │  │  A        │                        │
│  └───────────┘  └───────────┘                        │
│                                                      │
│  Subject        Academic Year                        │
│  ┌───────────┐  ┌───────────┐                        │
│  │  Science  │  │  2024-25  │                        │
│  └───────────┘  └───────────┘                        │
│                                                      │
│  [ Add Class ]                                       │
└──────────────────────────────────────────────────────┘
```

The system auto-generates a **Class UID** in the format `{grade}-{section}-{subject}-{year}`, for example: `7-A-Science-2024-25`.

#### Viewing All Classes

Below the form, a table lists all classes:

```
┌────────────────────────────────────────────────────────┐
│  All Classes                                           │
│                                                        │
│  Class UID               Grade  Section  Subject  Year │
│  7-A-Science-2024-25     7      A        Science  2024 │
│  7-B-Science-2024-25     7      B        Science  2024 │
│  7-A-Maths-2024-25       7      A        Maths    2024 │
└────────────────────────────────────────────────────────┘
```

> **Tip:** Create one class per section. Sections A, B, C of the same grade and subject share the same curriculum — you only need to upload the curriculum once.

---

### 3.3 Uploading & Managing Students

Students are linked to a specific class (section). You can bulk upload them via CSV or edit them individually.

#### Uploading a Student Roster

In the **Upload Students (CSV)** section:

1. Select the class from the dropdown
2. Click **Download sample** to get a template CSV
3. Fill in the CSV with your student data
4. Choose the file and click **Upload Students**

```
┌──────────────────────────────────────────────────────┐
│  Upload Students (CSV)              Download sample  │
│  Columns: student_id, roll_number, section, name     │
│                                                      │
│  Class                                               │
│  ┌────────────────────────────────┐                  │
│  │  7-A-Science-2024-25     ▼    │                  │
│  └────────────────────────────────┘                  │
│                                                      │
│  CSV File                                            │
│  [ Choose file ]  No file chosen                     │
│                                                      │
│  [ Upload Students ]                                 │
└──────────────────────────────────────────────────────┘
```

**Sample CSV format:**

```csv
student_id,roll_number,section,name
STU001,1,A,Priya Sharma
STU002,2,A,Rahul Mehta
STU003,3,A,Ananya Iyer
```

> **Note:** If you re-upload the same `student_id`, it updates the existing record rather than creating a duplicate.

#### Browsing & Editing Individual Students

Use the **Browse & Edit Students** section at the bottom. Select a class to see its roster:

```
┌─────────────────────────────────────────────────────────────┐
│  Browse & Edit Students   [ 7-A-Science-2024-25 ▼ ]        │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  32 students         │  │  STU001                     │ │
│  │                      │  │                             │ │
│  │▶ Priya Sharma        │  │  Name                       │ │
│  │  STU001 · Roll 1 · A │  │  ┌─────────────────────┐   │ │
│  │                      │  │  │ Priya Sharma         │   │ │
│  │  Rahul Mehta         │  │  └─────────────────────┘   │ │
│  │  STU002 · Roll 2 · A │  │                             │ │
│  │                      │  │  Roll Number   Section       │ │
│  │  Ananya Iyer         │  │  ┌──────────┐ ┌──────────┐  │ │
│  │  STU003 · Roll 3 · A │  │  │ 1        │ │ A        │  │ │
│  │                      │  │  └──────────┘ └──────────┘  │ │
│  │  ...                 │  │                             │ │
│  │                      │  │  [ Save changes ]  Saved.   │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Click a student's name on the left to open their details on the right. Edit any field, then click **Save changes**.

---

### 3.4 Setting Up Curriculum

Go to **Curriculum** in the sidebar. The curriculum is **shared across all sections** of the same grade and subject — upload it once and it applies to every section automatically.

#### What Is a Learning Goal?

A learning goal represents one teaching session, linked to a unit (chapter). For example:

- **Unit:** Chapter 1 Session 1: The Web of Science
- **Learning Goal:** Students will identify the steps of the scientific method

Each learning goal can have one or more **misconceptions** — specific wrong beliefs that students commonly hold and that your questions are designed to catch.

#### Bulk Upload via CSV (Recommended)

Click **Download sample** to get the template, fill it in, then upload:

```
┌──────────────────────────────────────────────────────────┐
│  Bulk Upload (CSV)                       Download sample │
│  Columns: grade, subject, unit, learning_goal,           │
│           misconception_code, misconception_description   │
│                                                          │
│  [ Choose file ]  No file chosen   [ Upload ]            │
└──────────────────────────────────────────────────────────┘
```

**Sample CSV format:**

```csv
grade,subject,unit,learning_goal,misconception_code,misconception_description
7,Science,Chapter 1 Session 1: The Web of Science,Students will identify the steps of the scientific method,G7C1.1,Students think experiments always require lab equipment
7,Science,Chapter 1 Session 1: The Web of Science,Students will identify the steps of the scientific method,G7C1.2,Students confuse hypothesis with conclusion
7,Science,Chapter 1 Session 2: Tools of Science,Students will distinguish between qualitative and quantitative data,,
```

> **Tip:** Leave `misconception_code` and `misconception_description` blank for rows that are learning goals without a specific misconception. You can always add misconceptions manually later.

#### Viewing & Editing Curriculum

Below the upload section, a two-panel view lets you manage entries:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────┐  ┌────────────────────────┐ │
│  │  Learning Goals   [All ▼]   │  │  Chapter 1 Session 1   │ │
│  │                              │  │  Students will identi… │ │
│  │  Grade 7 · Science           │  │                   Edit │ │
│  │  Chapter 1 Session 1: …      │  ├────────────────────────┤ │
│  │▶ Students will identify…  ✕  │  │  Code   Description    │ │
│  │                              │  │  ┌────┐ ┌───────────┐  │ │
│  │  Grade 7 · Science           │  │  │    │ │           │  │ │
│  │  Chapter 1 Session 2: …      │  │  └────┘ └───────────┘  │ │
│  │  Students will distingui… ✕  │  │  [ Add Misconception ] │ │
│  │                              │  │                        │ │
│  │  ...                         │  │  G7C1.1  Students      │ │
│  │                              │  │          think exper…  │ │
│  └──────────────────────────────┘  │                        │ │
│                                    │  G7C1.2  Students      │ │
│                                    │          confuse hypo… │ │
│                                    └────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

- **Left panel:** Click any learning goal to select it. Use the dropdown to filter by grade & subject. Click **✕** to delete.
- **Right panel:** Shows misconceptions for the selected goal. Click **Edit** to update the unit or learning goal text. Add new misconceptions with the code + description form.

---

### 3.5 Managing Questions

Go to **Questions** in the sidebar. Questions are MCQs linked to a specific learning goal. Each wrong option should be tagged with a misconception code so the system can identify what a student misunderstands.

#### Uploading Questions via CSV

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Questions (CSV)                    Download sample  │
│  Columns: question_uid, grade, subject, unit, learning_goal,│
│  question_text, option_1, option_1_tag, option_2,           │
│  option_2_tag, option_3, option_3_tag, option_4,            │
│  option_4_tag, correct_answer, level, hint, is_remedy        │
│                                                             │
│  [ Choose file ]  No file chosen   [ Upload ]               │
└─────────────────────────────────────────────────────────────┘
```

**Key column notes:**

| Column | Description | Example |
|--------|-------------|---------|
| `question_uid` | Unique ID for the question | `G7Ch1S1Q1` |
| `level` | Difficulty: Theory, Understanding, or Application | `Theory` |
| `option_1_tag` | Misconception code for this wrong option | `G7C1.1` |
| `correct_answer` | Letter of the correct option | `A` |
| `is_remedy` | `true` if this question is for remedy practice | `false` |
| `hint` | Optional hint shown in remedy PDFs | `Think about what scientists observe first` |

#### Viewing & Editing Questions

The questions page has a split layout — use the left panel to find a question, the right panel to edit it:

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  [ All classes ▼ ]   │  │  G7Ch1S1Q1                  Delete │ │
│  │  [ All units   ▼ ]   │  │  Curriculum: Chapter 1 S1 — Steps… │ │
│  │  [ All goals   ▼ ]   │  ├─────────────────────────────────────┤ │
│  │  [ All levels  ▼ ]   │  │  Level  [ Theory ▼ ]               │ │
│  ├──────────────────────┤  │  ☐ Remedy question                  │ │
│  │  68 questions        │  │  Correct Answer  [ A ▼ ]            │ │
│  │                      │  │                                     │ │
│  │  G7Ch1S1Q1           │  │  Question Text                      │ │
│  │▶ What is the first…  │  │  ┌─────────────────────────────┐   │ │
│  │  Theory              │  │  │ What is the first step of   │   │ │
│  │                      │  │  │ the scientific method?      │   │ │
│  │  G7Ch1S1Q2           │  │  └─────────────────────────────┘   │ │
│  │  Which of the follo… │  │                                     │ │
│  │  Understanding       │  │  Options               Tag          │ │
│  │                      │  │  [A]✓ Make an observation  G7C1.1  │ │
│  │  G7Ch1S2Q1           │  │  [B]  Form a hypothesis    G7C1.2  │ │
│  │  A student notices…  │  │  [C]  Conduct an experiment         │ │
│  │  Application         │  │  [D]  Draw a conclusion             │ │
│  │                      │  │                                     │ │
│  └──────────────────────┘  │  [ Save changes ]                   │ │
│                            └─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

> **Important:** Tag wrong options with misconception codes. This is what allows the system to detect which specific concept a student is confused about and generate targeted remedy questions.

**Three question levels:**

- **Theory** — Can the student recall the fact? (e.g., "What is photosynthesis?")
- **Understanding** — Can the student explain or apply it simply? (e.g., "Why do leaves appear green?")
- **Application** — Can the student use the concept in a novel situation?

---

## 4. Teacher Guide — Day-to-Day Use

After an admin has set up classes, curriculum, and questions, teachers use the following workflow for each session:

```
Upload Responses → View Reports → Generate Remedy → Share with Students
```

---

### 4.1 Uploading Student Responses

After a clicker session in class, export the responses to a CSV file from your clicker software and upload it here.

Go to **Responses** in the sidebar:

```
┌──────────────────────────────────────────────────────────┐
│  Upload Clicker CSV                                      │
│                                                          │
│  Class                                                   │
│  ┌────────────────────────────────┐                      │
│  │  7-A-Science-2024-25     ▼    │                      │
│  └────────────────────────────────┘                      │
│                                                          │
│  CSV File                                                │
│  [ Choose file ]  Class_7A_Ch1S1_responses.csv           │
│                                                          │
│  [ Upload ]                                              │
│                                                          │
│  ✓ Uploaded 32 responses.                                │
└──────────────────────────────────────────────────────────┘
```

**CSV format expected:**

```csv
question_uid,student_id,is_correct,time_taken_secs,response_option
G7Ch1S1Q1,STU001,true,12,A
G7Ch1S1Q1,STU002,false,18,C
G7Ch1S1Q1,STU003,true,9,A
G7Ch1S1Q2,STU001,false,25,B
```

| Column | Description |
|--------|-------------|
| `question_uid` | Must match a question already in the system |
| `student_id` | Must match a student already in the system |
| `is_correct` | `true` or `false` |
| `time_taken_secs` | How many seconds the student took (optional) |
| `response_option` | The letter the student chose: A, B, C, or D |

#### Upload History

Below the form, every upload is logged:

```
┌───────────────────────────────────────────────────────────────────┐
│  Class                   File             Rows  Uploaded     Action│
│  7-A-Science-2024-25     Ch1S1_resp.csv   32    14 Jun 09:12  [✕] │
│  7-B-Science-2024-25     Ch1S1_resp.csv   30    14 Jun 09:15  [✕] │
└───────────────────────────────────────────────────────────────────┘
```

Click **✕** to delete an upload batch (this also removes all associated responses).

---

### 4.2 Viewing Reports & Analytics

Go to **Reports** in the sidebar. First select a class to see how all students performed.

#### Class Matrix View

The matrix shows every student's score for each learning goal, broken down by difficulty level (T = Theory, U = Understanding, A = Application):

```
┌──────────────────────────────────────────────────────────────────┐
│  Reports   [ 7-A-Science-2024-25 ▼ ]                            │
│                                                                  │
│             Ch1 S1      Ch1 S2      Ch2 S1      Ch2 S2          │
│             T   U   A   T   U   A   T   U   A   T   U   A       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Priya S.  80% 60% 40% 100% 80% 60% 70% —  —   90% 80% 70%│  │
│  │ Rahul M.  60% 40% 20%  80% 40% 20% —   —  —   70% 60% 40%│  │
│  │ Ananya I. 100%100%80% 100%100%100% 80% 80% 60% 90%100%80%│  │
│  │ ...                                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ■ Green = Pass (≥60%)    ■ Red = Fail (<60%)    □ — = No data  │
└──────────────────────────────────────────────────────────────────┘
```

**How to read it:**
- Each column group represents one learning goal (session)
- T/U/A are the three question difficulty levels
- Green cells = student passed (≥ 60% correct)
- Red cells = student failed (< 60% correct)
- "—" = no responses recorded yet for that combination

#### Student Detail View

Click any student's name to drill into their individual performance:

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to class view                                           │
│  Rahul Mehta  (STU002)                                          │
│                                                                  │
│  Unit                         Learning Goal        T    U    A  │
│  ──────────────────────────── ──────────────────── ──── ──── ────│
│  Ch1 S1: The Web of Science   Identify sci. method  60% 40% 20%│
│  Ch1 S2: Tools of Science     Qualitative vs quant  80% 40%  — │
│  Ch2 S1: Living World         Cell structure        —   —    — │
└──────────────────────────────────────────────────────────────────┘
```

This view makes it easy to spot which specific sessions and levels a student is struggling with.

---

### 4.3 Generating Remedy PDFs

Go to **Remedy** in the sidebar. This page lets you generate a personalised practice worksheet for any student on any learning goal.

#### Step-by-Step

**Step 1:** Select the class, then the student.

**Step 2:** Select the unit, then the learning goal.

As soon as you select a learning goal, the system shows that student's score breakdown:

```
┌──────────────────────────────────────────────────────────┐
│  Remedy                                                  │
│                                                          │
│  Class   [ 7-A-Science-2024-25 ▼ ]                      │
│  Student [ Rahul Mehta          ▼ ]                      │
│  Unit    [ Ch1 S1: The Web of Science ▼ ]                │
│  Goal    [ Identify steps of sci. method ▼ ]             │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Level          Score     %      Status             │ │
│  │  Theory         3 / 5     60%    ✓ Pass             │ │
│  │  Understanding  2 / 5     40%    ✗ Fail             │ │
│  │  Application    1 / 5     20%    ✗ Fail             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [ Generate Remedy PDF ]                                 │
└──────────────────────────────────────────────────────────┘
```

**Step 3:** Click **Generate Remedy PDF**.

The system automatically:
1. Identifies the student's weakest difficulty level
2. Detects the most common misconception from their wrong answers
3. Selects targeted remedy questions that address that misconception
4. Generates and downloads a PDF titled `remedy-{student_id}.pdf`

#### What the PDF Contains

```
┌─────────────────────────────────────────────────────────┐
│  Remedy Worksheet                                       │
│  ─────────────────────────────────────────────────────  │
│  Student:   Rahul Mehta                                 │
│  Session:   Ch1 S1 — Identify steps of sci. method      │
│  Focus:     Understanding                               │
│  Addressing: G7C1.2 — Students confuse hypothesis with  │
│              conclusion                                 │
│  Date:      14 June 2025                               │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Q1. [Understanding]                                    │
│  A scientist observes that plants grow taller near      │
│  windows. What should she do next?                      │
│                                                         │
│    A) Write a conclusion                                │
│    B) Form a hypothesis                                 │
│    C) Design an experiment                              │
│    D) Publish her results                               │
│                                                         │
│  Hint: A hypothesis comes before any experiment.        │
│  ─────────────────────────────────────────────────────  │
│  Q2. ...                                                │
└─────────────────────────────────────────────────────────┘
```

The PDF is designed to be **printed and handed to the student** or **shared digitally** (see next section).

---

### 4.4 Sharing Remedial Exercises with Students

Once you have downloaded the PDF, you can share it with the student in any of these ways:

#### Option A — Print and Hand Out

Print the `remedy-{student_id}.pdf` file and hand it to the student in class. This works best for students who do not have personal devices.

#### Option B — Share via WhatsApp

1. Open WhatsApp on your phone or computer
2. Open the student's parent contact
3. Tap the attachment icon → select the PDF from your Downloads folder
4. Send with a short message, for example:

   > *"Dear Parent, please find attached a personalised practice sheet for [student name] based on today's science session. Kindly ensure it is completed by [date]. — DPS Science Dept."*

#### Option C — Share via School Email

1. Compose an email to the student or parent
2. Attach the PDF
3. Use the subject line: `Remedy Worksheet — [Student Name] — [Session Name]`

#### Option D — Upload to Google Classroom / School LMS

If your school uses Google Classroom or another LMS:
1. Open the relevant class in Google Classroom
2. Create a new Assignment or Material for the individual student
3. Attach the PDF

#### Generating for the Whole Class

To create remedy sheets for every student in a class after a session:

1. Go to **Reports** and look at the matrix — identify all students with red cells in the session you just covered
2. For each failing student, go to **Remedy**, select that student and the same learning goal, click **Generate Remedy PDF**
3. The PDF downloads automatically; repeat for the next student

> **Tip:** Name your downloads clearly before sharing so you don't mix them up: e.g. rename `remedy-STU002.pdf` to `remedy-RahulMehta-Ch1S1.pdf`.

---

## 5. CSV Format Reference

### Students CSV

```csv
student_id,roll_number,section,name
STU001,1,A,Priya Sharma
STU002,2,A,Rahul Mehta
```

### Curriculum CSV

```csv
grade,subject,unit,learning_goal,misconception_code,misconception_description
7,Science,Chapter 1 Session 1: The Web of Science,Students will identify the steps of the scientific method,G7C1.1,Students think experiments always require lab equipment
7,Science,Chapter 1 Session 1: The Web of Science,Students will identify the steps of the scientific method,G7C1.2,Students confuse hypothesis with conclusion
```

### Questions CSV

```csv
question_uid,grade,subject,unit,learning_goal,question_text,option_1,option_1_tag,option_2,option_2_tag,option_3,option_3_tag,option_4,option_4_tag,correct_answer,level,hint,is_remedy
G7Ch1S1Q1,7,Science,Chapter 1 Session 1: The Web of Science,Students will identify the steps of the scientific method,What is the first step?,Make an observation,G7C1.1,Form a hypothesis,G7C1.2,Conduct an experiment,,Draw a conclusion,,A,Theory,Science starts with noticing things around us,false
```

### Responses CSV

```csv
question_uid,student_id,is_correct,time_taken_secs,response_option
G7Ch1S1Q1,STU001,true,12,A
G7Ch1S1Q1,STU002,false,18,C
```

---

*Guide version 1.0 — Delhi Public School × Equanimity Learning*
