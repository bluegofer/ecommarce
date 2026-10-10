# Training 07 — HR, Attendance & Payroll

**Audience:** HR Manager (HR_MANAGER)
**Prerequisites:** `01-login-and-dashboard.md`
**Estimated time:** 20 min
**Sidebar location:** HR · Employees · Attendance · Payroll

---

## ১. Chain overview
Employee → Attendance (daily) → Monthly summary → Payroll run → Payslip → Payment → Ledger
**Auto-posting:** Payroll finalized → Salaries Expense Dr / Cash-Bank-MFS Cr

---

## ২. Employee add

1. Sidebar → **HR → Employees** → **Add employee**
2. Form:
   - **Employee code:** `EMP-0001`
   - **Full name EN/BN**
   - **Phone, email**
   - **Joining date**
   - **Department** (e.g., Management, Sales, HR)
   - **Designation** (e.g., Manager, Executive, Cashier)
   - **Employment type:** Full-time / Part-time / Contract
   - **Status:** ACTIVE
3. **Salary structure** (একই form-এ):
   - **Base salary** (৳ in poisha)
   - **House allowance**
   - **Transport allowance**
   - **Medical allowance**
   - **Other allowance**
   - **Provident fund** (deduction)
   - **Tax deduction**
   - **Overtime rate** (per hour, poisha)
4. Save

**Optional:** employee-কে staff user-এ link করুন (Role assignment) — তাহলে সে admin panel access পাবে।

---

## ৩. Attendance grid (দৈনিক)

**Method 1 — Manual entry (bulk):**

1. Sidebar → **HR → Attendance**
2. Month + Department select
3. Grid: rows = employees, columns = dates
4. প্রতিটা cell-এ status:
   - `P` = Present
   - `A` = Absent
   - `L` = Late
   - `Leave` = Leave
   - `OT` = Overtime minutes
5. **Save month** → সব records update

**Method 2 — Individual entry:**

1. Employee → Attendance tab
2. Date select → mark status

**Method 3 — Device intake (future):**
Biometric / RFID device থাকলে API endpoint-এ events পাঠাবে — auto-update।

---

## ৪. Leave request

Employee leave চাইলে:

1. Sidebar → **HR → Attendance → Leaves**
2. **Approve** / **Reject:**
   - Request details দেখুন (dates, type, reason)
   - Approve করলে attendance-এ auto adjust
   - Reject করলে note

---

## ৫. Shift management

1. HR → **Shifts**
2. Default shifts: Morning (9-6), Evening (2-11)
3. **Assign shift** to employee → attendance-এ কাজে লাগবে
4. Custom shift add করতে পারেন

---

## ৬. Monthly attendance summary

Month শেষে auto generate:

1. HR → **Attendance → Summary**
2. দেখবেন per-employee:
   - **Present days**
   - **Absent**
   - **Late count**
   - **Leave days** (paid/unpaid)
   - **Overtime hours**
3. এই summary payroll-এ feed হবে

---

## ৭. Payroll run

**মাসিক payroll:**

1. Sidebar → **HR → Payroll**
2. **New payroll run:**
   - **Month:** 2026-09 (September 2026)
   - **Department:** All / specific
3. **Generate** → সিস্টেম:
   - Attendance summary টানে
   - Base salary থেকে present-day proration compute
   - Overtime add
   - Leave deduction subtract
   - Provident fund + tax subtract
   - **Net payable** calculate
4. **Review payslips:**
   - প্রতিটা employee-এর breakdown দেখুন
   - কোনো adjustment লাগলে → **Edit payslip**
5. **Finalize** ক্লিক → draft lock → accounting-এ posting ready
6. **Record payment:**
   - Method: CASH / BANK / MFS
   - Date
   - Confirm → journal entry posted

**Idempotency:** একই month-এ আবার generate করলে replace হবে, double-post হবে না।

---

## ৮. Payslip distribution

1. Payroll → finalized run → Payslip list
2. **Download all** (PDF zip) অথবা individual
3. Employee-কে email / print

**Employee self-service:** Employee admin access থাকলে নিজের payslip দেখতে পারবে।

---

## ৯. Reports

- **Payroll cost:** month-wise total
- **Attendance trends:** late/absent pattern
- **Overtime cost**
- **Employee performance:** orders handled, tickets resolved

**Access:** HR → Reports

---

## ১০. Common errors

| Error | কারণ | Fix |
|---|---|---|
| "Payroll already finalized" | এই month-এ finalize হয়েছে | Re-run করতে reopen (manager approval) |
| "Employee has no salary structure" | setup missing | Employee → Salary tab |
| "Attendance missing for X days" | entry নেই | Grid-এ mark করুন |
| "Net salary negative" | deduction > earning | Payslip edit |

---

## ১১. Best practices

- **Attendance daily mark** — মাসের শেষে rush কমে
- **Leave approve করার আগে** manager-কে জানান
- **Payroll run month-end-এ** — 1-3 দিনের মধ্যে
- **Payslip save** — employee-এর account-এ PDF
- **Sensitive data** — payslip কোথাও share করবেন না

---

## ১২. Next guide

→ `08-accounting-and-reports.md`
