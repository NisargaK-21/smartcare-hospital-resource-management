# SmartCare Intelligent Hospital Operations & Resource Management System

**A Database-Driven Hospital Management and Intelligent Resource Allocation Platform**

## Overview

SmartCare is a centralized hospital operations and resource management system designed to simplify the management of patients, hospital beds, ICU resources, admissions, reservations, transfers and discharges.

Traditional hospital management systems primarily focus on maintaining patient records and appointment information. However, hospitals also face operational challenges such as limited bed availability, increasing emergency admissions, ICU capacity constraints and inefficient resource allocation.

SmartCare addresses these challenges by combining patient management with intelligent, database-driven hospital resource management.

The system maintains the complete lifecycle of hospital resources, from reservation and allocation to occupancy, transfer, discharge, cleaning and maintenance.

Its primary objective is to improve resource visibility, maintain data consistency and help hospital staff make informed operational decisions.

---

## Problem Statement

Hospitals manage multiple operations simultaneously, including patient registration, appointments, admissions, bed allocation, patient transfers, ICU resource utilization and discharge procedures.

In conventional systems, these operations are often maintained separately, making it difficult for hospital staff to obtain an accurate view of current resource availability and coordinate hospital operations efficiently.

SmartCare proposes an integrated database-driven solution that combines patient and hospital management with dynamic bed and ICU resource management.

The system uses relational database concepts, constraints, triggers, stored procedures and transactions to maintain accurate records, prevent duplicate resource allocation and ensure consistency across hospital operations.

By providing centralized resource tracking, occupancy monitoring and resource recommendations, SmartCare aims to improve hospital operational efficiency.

---

## Key Objectives

- Maintain centralized patient and hospital records.
- Manage departments, wards, rooms and hospital beds.
- Track real-time bed availability and occupancy.
- Support patient admissions and emergency bed allocation.
- Manage bed reservations and patient transfers.
- Monitor ICU resources such as ventilators and medical equipment.
- Track bed cleaning and maintenance activities.
- Prevent duplicate bed and resource allocation.
- Generate hospital occupancy and resource utilization reports.
- Demonstrate practical DBMS concepts through real-world workflows.

---

## Core Features & Modules

### 1. Patient Management
- Patient registration and profile management.
- Patient information and admission history.
- Search and retrieve patient records.

### 2. Doctor & Staff Management
- Maintain doctor and staff information.
- Manage staff roles and departments.
- Role-based access to system functionality.

### 3. Department & Ward Management
- Create and manage hospital departments.
- Maintain general wards and ICU wards.
- Organize rooms and beds within wards.

### 4. Smart Bed Management
- Maintain a centralized bed inventory.
- Categorize beds based on type.
- Track bed availability and occupancy.
- Manage bed cleaning and maintenance status.

### 5. Admission & Bed Allocation
- Register new admissions.
- Identify the required bed category.
- Search for suitable available beds.
- Allocate beds while preventing duplicate assignments.

### 6. Bed Reservation
- Reserve beds for upcoming admissions.
- Track reservation dates and status.
- Prevent overlapping reservations.

### 7. Patient Transfer Management
- Transfer patients between wards and beds.
- Validate destination bed availability.
- Maintain complete patient transfer history.

### 8. ICU Resource Management
- Track ICU equipment and resources.
- Manage ventilators, monitors and other critical equipment.
- Monitor resource availability and utilization.
- Associate resources with patient admissions.

### 9. Discharge & Bed Release
- Record patient discharge details.
- Close active admissions.
- Move released beds into cleaning status.
- Make beds available after cleaning.

### 10. Maintenance Management
- Track beds and equipment under maintenance.
- Record maintenance reasons and duration.
- Prevent unavailable resources from being allocated.

### 11. Hospital Operations Dashboard
- Total, available and occupied beds.
- General ward and ICU occupancy.
- Current admissions and discharges.
- Available ICU resources.
- Pending transfers and reservations.
- Maintenance alerts and resource utilization.

### 12. Resource Recommendation & Alerts
- Identify suitable beds based on admission requirements.
- Match required resources with current availability.
- Highlight low ICU capacity and resource shortages.
- Display operational alerts for hospital staff.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database Platform | Supabase |
| Authentication | Supabase Auth |
| API Communication | Axios |
| Version Control | Git & GitHub |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

---

## System Architecture

SmartCare follows a modular architecture that separates the user interface, backend business logic and database operations.

```text
                 USERS
                   |
                   v
          NEXT.JS FRONTEND
                   |
                   v
             EXPRESS API
                   |
                   v
          BUSINESS LOGIC
                   |
                   v
          POSTGRESQL DATABASE
              (SUPABASE)
                   |
          +--------+--------+
          |        |        |
          v        v        v
        TABLES   VIEWS   PROCEDURES
          |        |        |
          +--------+--------+
                   |
                   v
          HOSPITAL REPORTS
          & RESOURCE INSIGHTS
```

---

## Database Design

The system uses a relational database with interconnected entities to maintain consistency and minimize data redundancy.

### Proposed Database Tables

| Table | Description |
|---|---|
| Patient | Stores patient information |
| Department | Hospital departments |
| Ward | General and ICU wards |
| Room | Rooms within hospital wards |
| Bed | Bed inventory and status |
| ICU_Resource | ICU equipment and resources |
| Admission | Patient admission records |
| Bed_Reservation | Bed reservation details |
| Transfer | Patient transfer history |
| Discharge | Patient discharge records |
| Resource_Allocation | Resource assignments |
| Maintenance | Bed and equipment maintenance |
| Staff | Hospital staff information |
| User_Account | User authentication details |
| Role | System access roles |

### Main Relationships

- Department → Ward → Room → Bed
- Patient → Admission → Bed
- Admission → Transfer → Bed
- Admission → Discharge
- Ward → ICU Resource → Resource Allocation
- Patient → Bed Reservation → Bed
- Staff → User Account → Role

---

## Bed Lifecycle Management

One of the central features of SmartCare is its resource lifecycle management.

```text
       AVAILABLE
            |
            v
         RESERVED
            |
            v
         OCCUPIED
            |
            v
         CLEANING
            |
            v
        AVAILABLE
```

A bed can also enter an **OUT OF SERVICE** state when maintenance is required.

The application will enforce valid status transitions to prevent incorrect allocations.

---

## Important Database Workflows

### Admission Workflow

1. Register or select a patient.
2. Identify the required bed type.
3. Search for available beds.
4. Validate bed availability.
5. Create the admission record.
6. Allocate the bed.
7. Update the bed status to OCCUPIED.
8. Allocate ICU resources if required.

### Patient Transfer Workflow

1. Select an active admission.
2. Identify the destination ward and bed.
3. Validate destination availability.
4. Create a transfer history record.
5. Release the previous bed.
6. Allocate the destination bed.
7. Update both bed statuses.

### Discharge Workflow

1. Select the active admission.
2. Record discharge information.
3. Close the admission.
4. Release the occupied bed.
5. Change the bed status to CLEANING.
6. Make the bed AVAILABLE after cleaning.

These workflows will use database transactions to ensure that related operations either complete successfully together or are rolled back.

---

## DBMS Concepts Implemented

SmartCare is designed to demonstrate practical database management concepts.

- **Primary Keys:** Unique identification of database records.
- **Foreign Keys:** Maintaining relationships between entities.
- **Normalization:** Organizing data up to Third Normal Form (3NF).
- **Constraints:** CHECK, UNIQUE and NOT NULL constraints.
- **Joins:** Retrieving related patient, admission and resource information.
- **Views:** Current bed availability and ICU occupancy.
- **Triggers:** Automatic and controlled bed-status updates.
- **Stored Procedures:** Admission, allocation, transfer and discharge operations.
- **Transactions:** COMMIT and ROLLBACK for consistent operations.
- **Indexes:** Improving the performance of frequently executed queries.

---

## Security & Access Management

The application will support role-based access control.

Proposed roles:

- **Administrator:** Manages hospital configuration, staff, wards and resources.
- **Reception Staff:** Registers patients and manages admissions.
- **Ward Staff:** Manages bed allocation and patient transfers.
- **Clinical Staff:** Provides authorized admission and resource requirements.
- **Management:** Views operational reports and resource utilization.

Authentication and authorization will be implemented to restrict access to sensitive operations.

---

## Project Structure

```text
smartcare-hospital-resource-management/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   └── package.json
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       └── server.js
│
├── databases/
│   ├── schema.sql
│   ├── seed.sql
│   ├── views.sql
│   ├── triggers.sql
│   ├── procedures.sql
│   └── migrations/
│
├── docs/
│   ├── ER-Diagram/
│   ├── requirements/
│   ├── reports/
│   └── screenshots/
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js and npm
- Git
- GitHub account
- Supabase account
- VS Code (recommended)

### 1. Clone the repository

```bash
git clone https://github.com/NisargaK-21/smartcare-hospital-resource-management.git

cd smartcare-hospital-resource-management
```

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 3. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file containing the required backend configuration.

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use appropriate server-side credentials for privileged database operations. Never expose secret keys in frontend code or commit credentials to GitHub.

### 4. Database Setup

- Create a PostgreSQL project using Supabase.
- Configure the database connection.
- Execute the SQL scripts from the `databases/` directory.
- Insert sample hospital records.
- Verify relationships, constraints and database operations.

---

## Testing & Validation

The system will be tested against real-world operational scenarios.

- Attempt to allocate an already occupied bed.
- Attempt to transfer a patient to an occupied bed.
- Test duplicate patient and staff identifiers.
- Test invalid bed-status transitions.
- Test overlapping reservations.
- Attempt to discharge an already discharged patient.
- Force transaction failures and verify rollback.
- Verify role-based access restrictions.
- Validate ICU resource availability.

All development and testing will use fictional hospital and patient data.

---

## Future Enhancements

- Multi-hospital resource management.
- Predictive bed occupancy analytics.
- Hospital demand forecasting.
- Ambulance and emergency admission integration.
- Real-time resource availability notifications.
- Map-based hospital capacity visualization.
- Advanced operational analytics.

---

## Project Scope

SmartCare is an academic DBMS project focused on hospital operations and resource management.

The initial implementation models a single hospital with multiple departments, wards, rooms, beds and ICU resources.

Detailed clinical diagnosis, prescriptions, billing and advanced medical decision-making are outside the initial project scope.

The system is intended for academic demonstration and is not a production clinical system.

---

## Core Idea

**From managing patient records to intelligently managing the resources required to care for them.**

SmartCare aims to demonstrate how a well-designed relational database can support real-world hospital operations through structured data, controlled workflows and reliable resource management.

---

**Project:** SmartCare – Intelligent Hospital Operations & Resource Management System  
**Category:** Database Management Systems (DBMS)  
