📦 Mohil Enterprise – Production, Attendance & Payroll Automation System

A full-stack management system built for manufacturing businesses to automate employee attendance, production tracking, and payroll calculations.
The system integrates employees, workers, operations, production, and attendance modules into a unified workflow, reducing manual work and ensuring accurate salary computation.

🚀 Features

🔹 Employee Management

Add, update, and manage employee details

Store address, ID proof, bank details, and salary

Activate/Deactivate employees

Real-time search and filtering

Automatic salary calculation based on attendance

🔹 Attendance Management

Daily attendance marking (Present / Absent / Leave)

Calendar-based or table-based attendance UI

Automatically saves attendance with Supabase upsert

Prevents duplicate date entries using unique constraints

Auto-fixes invalid dates before submitting

Attendance directly affects salary generation

🔹 Employee Salary Module

Auto-generate monthly salary for all employees

Salary calculated using:

Present days

Leave days (Paid)

Absent days (Unpaid)

Total days of the selected month

Updates previous salary if attendance changes (only if not paid)

Advance salary detection and net salary adjustment

Prevents modification of paid salary entries

Full history of monthly salaries

🔹 Worker & Production Management

Register workers with rate per piece/operation

Assign workers to production operations

Track completed pieces

Auto-calculate worker salary based on production

Supervisor can manage tasks and track performance

🔹 Operation Module

Add operations and define per-piece amount

Manage operation lists

Link operations with production tasks

Fetch total operations count and track execution

🔹 User Roles

Admin: Full access (Employees, Attendance, Salary, Production, Operations)

Supervisor: Attendance entry + worker management

Workers: Limited access (if enabled)

🔹 Technology & Architecture

React + TypeScript frontend

Supabase (PostgreSQL + Auth + Storage) backend

Shadcn UI + TailwindCSS for UI

React Query for data fetching and caching

Fully responsive (Mobile + Desktop)

🧠 Core System Logic:

✔ Attendance → Salary Flow

Admin/Supervisor marks daily attendance

Attendance stored with unique constraint (person_type, person_id, date)

Auto-generate salary uses:

present days

leave days (paid)

absent days (unpaid)

Salary = dailySalary × (present + leave)

If previous salary exists:

If unpaid → update salary

If paid → block update

Salary created once per employee per month
