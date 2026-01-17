# Little Angels Academy - School Management System (PWA)

**Motto:** Quality Education, Service and Discipline  
**Email:** littleangelskiganjo@gmail.com  
**Tel:** 0720 985 433  
**Address:** P.O. Box 7093, Thika, Kenya  

---

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Installation](#installation)  
- [Usage](#usage)  
- [Deployment](#deployment)  
- [Database](#database)  
- [PWA Features](#pwa-features)  
- [Screenshots](#screenshots)  
- [Contributing](#contributing)  
- [License](#license)  

---

## Overview

Little Angels Academy School Management System is a **modern, scalable Progressive Web App (PWA)** for Kenyan primary schools.  
It simplifies **learner registration, fee management, term updates, promotions, and printing official receipts**.  

The system is designed for **Play Group, Pre-Primary 1 & 2, and Grade 1 to 9**, with full support for **offline functionality, bulk operations, and cloud hosting**.

---

## Features

- **Learner Management**
  - Individual registration with auto-generated admission numbers
  - Bulk registration via Excel upload
  - Update learner details
- **Class & Term Management**
  - Add and edit classes
  - Set active term
  - Update fees per class
- **Fee Management**
  - Record fee payments
  - Auto-calculate balance
  - View payment history per learner
- **Receipts**
  - Generate cumulated term receipts
  - Epson LX-300+II compatible dot-matrix printing
- **Promotion & Graduation**
  - Promote learners to next class
  - Graduate Grade 9 learners
- **PWA Features**
  - Installable on mobile & desktop
  - Offline-ready
  - Fast caching for instant load

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (ES6+)
- **Backend / Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel (Frontend & PWA)
- **Libraries:** XLSX.js (Excel parsing), Supabase JS SDK
- **Printer Compatibility:** Epson LX-300+II

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/little-angels-sms.git
cd little-angels-sms
````

2. Install dependencies (if using Node for development):

```bash
npm install
```

3. Update Supabase credentials in `js/supabase.js`:

```javascript
export const supabase = createClient('<SUPABASE_URL>', '<SUPABASE_KEY>');
```

4. Open `index.html` in your browser (or use `npm run dev` if using a dev server).

---

## Usage

* Navigate the dashboard to access features:

  * **Learners:** Add / view / bulk upload
  * **Fees:** Set term, class fees, and view payment history
  * **Payments:** Record payments and view balances
  * **Receipts:** Generate printable receipts
  * **Promotion:** Promote or graduate learners

---

## Deployment

* **Frontend / PWA:** Deploy on [Vercel](https://vercel.com/)
* **Backend / Database:** Host on [Supabase](https://supabase.com/)

**Steps for Vercel:**

1. Connect your GitHub repository.
2. Set environment variables for Supabase URL & Key.
3. Deploy and visit your live URL.

---

## Database Structure

* **learners:** id, first_name, last_name, admission_no, gender, date_of_birth, class_id, active, graduated
* **classes:** id, name, level
* **terms:** id, year, term, active
* **fees:** id, class_id, term_id, amount
* **payments:** id, learner_id, term_id, payment_date, reference_no, amount

---

## PWA Features

* Installable to home screen
* Offline-ready (service worker caches assets)
* Fast load times with cached content
* Works on Android, iOS, Windows desktops

---

## Screenshots

![Dashboard Screenshot](./assets/screenshot-dashboard.png)
![Fee Payment Screenshot](./assets/screenshot-payments.png)
![Receipt Screenshot](./assets/screenshot-receipt.png)

---

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

---

## License

This project is **MIT Licensed**. See [LICENSE](LICENSE) for details.

