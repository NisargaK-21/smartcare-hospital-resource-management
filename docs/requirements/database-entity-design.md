# SmartCare – Database Entity Design

**Project:** SmartCare  Intelligent Hospital Operations & Resource Management System  
**Database:** PostgreSQL (Supabase)  
**Document Type:** Initial Database Design Proposal  

---

## 1. Purpose

This document identifies the proposed database entities required for the SmartCare Hospital Operations and Resource Management System.

The objective is to establish a structured relational database that manages patient information, hospital infrastructure, staff details and hospital resources.

This document serves as the initial foundation for:

- Entity identification
- Attribute identification
- Primary and foreign key identification
- Relationship modelling
- ER diagram development
- Database normalization
- SQL schema implementation

The final database design will be reviewed and approved jointly by both team members before implementation.

---

## 2. Entity Classification

The proposed entities are divided into two functional groups based on team responsibilities.

### Person 1 – Hospital & Patient Management

| Entity | Purpose |
|---|---|
| Patient | Maintains patient information |
| Department | Maintains hospital departments |
| Ward | Maintains general and ICU wards |
| Room | Maintains rooms within wards |
| Bed | Maintains hospital bed inventory and status |
| Staff | Maintains doctor and hospital employee information |
| Role | Defines application access roles |
| User_Account | Connects authenticated users with staff records and roles |

### Person 2 – Hospital Resource Operations

| Entity | Purpose |
|---|---|
| Admission | Maintains patient admission records |
| Bed_Reservation | Maintains bed reservation information |
| Transfer | Maintains patient transfer history |
| Discharge | Maintains patient discharge records |
| ICU_Resource | Maintains ICU equipment information |
| Resource_Allocation | Maintains equipment allocation records |
| Maintenance | Tracks bed and equipment maintenance |

**Note:** These are functional ownership allocations. All entities belong to one shared PostgreSQL database.

---

## 3. Detailed Entity Identification

### 3.1 Patient

**Purpose:** Stores personal and contact information of registered patients.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| patient_id | Unique patient identifier | Primary Key |
| medical_record_number | Unique medical record number | UNIQUE, NOT NULL |
| first_name | Patient's first name | NOT NULL |
| last_name | Patient's last name | NOT NULL |
| date_of_birth | Patient's date of birth | NOT NULL |
| gender | Patient's gender | CHECK |
| phone | Contact number | |
| email | Email address | |
| address | Residential address | |
| created_at | Registration timestamp | DEFAULT CURRENT_TIMESTAMP |
| updated_at | Last modification timestamp | |

**Responsibilities:**
- Patient registration.
- Patient profile management.
- Patient information retrieval.
- Patient search.
- Patient admission history through related admission records.

### 3.2 Department

**Purpose:** Stores information about the different departments operating within the hospital.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| department_id | Unique department identifier | Primary Key |
| department_name | Department name | UNIQUE, NOT NULL |
| department_code | Department identification code | UNIQUE, NOT NULL |
| description | Department description | |
| is_active | Department operational status | DEFAULT TRUE |
| created_at | Record creation timestamp | DEFAULT CURRENT_TIMESTAMP |

**Examples:**
- Cardiology
- Neurology
- Orthopedics
- Pediatrics
- General Medicine

### 3.3 Ward

**Purpose:** Maintains information about hospital wards belonging to departments.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| ward_id | Unique ward identifier | Primary Key |
| department_id | Associated department | Foreign Key |
| ward_name | Ward name | NOT NULL |
| ward_type | Type of ward | CHECK |
| floor_number | Floor where ward is located | |
| description | Ward description | |
| is_active | Ward operational status | DEFAULT TRUE |

**Proposed ward types:**
- GENERAL
- ICU
- EMERGENCY
- PRIVATE

### 3.4 Room

**Purpose:** Maintains individual rooms within hospital wards.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| room_id | Unique room identifier | Primary Key |
| ward_id | Associated ward | Foreign Key |
| room_number | Room identification number | NOT NULL |
| room_type | Type of room | |
| capacity | Maximum bed capacity | CHECK |
| is_active | Room operational status | DEFAULT TRUE |

**Important rule:** A room number should be unique within its respective ward.

### 3.5 Bed

**Purpose:** Maintains the hospital's centralized bed inventory and current operational status.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| bed_id | Unique bed identifier | Primary Key |
| room_id | Associated room | Foreign Key |
| bed_number | Bed identification number | NOT NULL |
| bed_type | Category of bed | CHECK |
| bed_status | Current operational status | CHECK |
| is_active | Whether bed is part of active inventory | DEFAULT TRUE |
| created_at | Record creation timestamp | DEFAULT CURRENT_TIMESTAMP |
| updated_at | Last modification timestamp | |

**Proposed bed types:**
- GENERAL
- ICU
- EMERGENCY
- PRIVATE

**Proposed bed statuses:**
- AVAILABLE
- RESERVED
- OCCUPIED
- CLEANING
- OUT_OF_SERVICE

**Important rule:** A bed should not be allocated to multiple active admissions simultaneously.

Bed status changes must be coordinated with admission, transfer, discharge and maintenance workflows.

### 3.6 Staff

**Purpose:** Maintains information about hospital employees, including doctors, nurses and administrative personnel.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| staff_id | Unique staff identifier | Primary Key |
| department_id | Associated department | Foreign Key |
| staff_code | Unique employee identification code | UNIQUE, NOT NULL |
| first_name | Staff first name | NOT NULL |
| last_name | Staff last name | NOT NULL |
| designation | Professional designation | NOT NULL |
| email | Official email address | |
| phone | Contact number | |
| date_of_joining | Joining date | |
| is_active | Employment status | DEFAULT TRUE |
| created_at | Record creation timestamp | DEFAULT CURRENT_TIMESTAMP |

**Examples:**
- Doctor
- Nurse
- Receptionist
- Ward Administrator
- Hospital Administrator

### 3.7 Role

**Purpose:** Defines the different access roles available within the SmartCare application.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| role_id | Unique role identifier | Primary Key |
| role_name | Name of the role | UNIQUE, NOT NULL |
| description | Role description | |
| created_at | Record creation timestamp | DEFAULT CURRENT_TIMESTAMP |

**Proposed roles:**
- ADMIN
- RECEPTIONIST
- WARD_STAFF
- CLINICAL_STAFF
- MANAGEMENT

### 3.8 User_Account

**Purpose:** Maintains the relationship between authenticated application users, staff records and their assigned roles.

| Attribute | Description | Proposed Constraint |
|---|---|---|
| user_id | Unique application account identifier | Primary Key |
| staff_id | Associated staff record | Foreign Key, UNIQUE |
| role_id | Assigned application role | Foreign Key |
| auth_user_id | Supabase Auth user identifier | UNIQUE |
| is_active | Account status | DEFAULT TRUE |
| created_at | Account creation timestamp | DEFAULT CURRENT_TIMESTAMP |
| updated_at | Last modification timestamp | |

**Important considerations:**

- Authentication will be handled through Supabase Auth.
- Passwords will not be stored in the User_Account table.
- The auth_user_id will reference the corresponding Supabase Auth user.
- Role-based authorization will be enforced by the backend.

---

## 4. Proposed Entity Relationships

The following relationships are proposed for the initial database design.

| Parent Entity | Child Entity | Relationship |
|---|---|---|
| Department | Ward | One-to-Many |
| Ward | Room | One-to-Many |
| Room | Bed | One-to-Many |
| Department | Staff | One-to-Many |
| Patient | Admission | One-to-Many |
| Bed | Admission | One-to-Many over time |
| Staff | User_Account | One-to-One (proposed) |
| Role | User_Account | One-to-Many |
| Admission | Discharge | One-to-Zero-or-One |
| Admission | Transfer | One-to-Many |

**Relationship explanations:**

1. A department can contain multiple wards.
2. A ward can contain multiple rooms.
3. A room can contain multiple beds.
4. A department can have multiple staff members.
5. A patient can have multiple admission records over time.
6. A bed can be associated with multiple historical admission records, but must not have conflicting active allocations.
7. A staff member can have one application account under the initial design.
8. A role can be assigned to multiple application accounts.
9. An admission can have zero or one discharge record.
10. An admission can have multiple transfer records.

These relationships will be validated during joint ER diagram development.

---

## 5. Initial Database Integrity Rules

The following rules are proposed to maintain database consistency.

### Entity Integrity
- Every table must have a primary key.
- Primary key values must be unique and non-null.

### Referential Integrity
- A ward must reference an existing department.
- A room must reference an existing ward.
- A bed must reference an existing room.
- An admission must reference an existing patient.
- User accounts must reference valid staff and role records.

### Domain Integrity
- Bed status must belong to the permitted status values.
- Ward type must belong to the permitted ward categories.
- Bed capacity and room capacity must be valid positive values.
- Required attributes must not contain NULL values.

### Business Integrity
- A bed cannot have multiple active allocations.
- A patient cannot have conflicting active admissions under the normal operating rules.
- A room cannot contain duplicate bed numbers.
- A department cannot contain duplicate department codes.
- A patient must retain their historical admission records after discharge.
- A bed must complete the cleaning process before becoming available after discharge.

---

## 6. Database Design Considerations

### Normalization

The proposed schema will be evaluated against:

- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)

The objective is to reduce unnecessary duplication, maintain data consistency and establish clear relationships.

### Constraints

The implementation will use:

- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK
- DEFAULT

### Advanced DBMS Concepts

The project will demonstrate:

- SQL JOIN operations.
- Aggregate queries.
- Database views.
- Stored procedures.
- Triggers.
- Transactions.
- Indexing.
- Concurrency control.

---

## 7. Team Responsibilities

| Work Area | Responsible Person |
|---|---|
| Patient Management | Person 1 |
| Department Management | Person 1 |
| Ward & Room Management | Person 1 |
| Bed Inventory Management | Person 1 |
| Staff & Role Management | Person 1 |
| Hospital Dashboard | Person 1 |
| Admission & Bed Allocation | Person 2 |
| Bed Reservation | Person 2 |
| Patient Transfers | Person 2 |
| Discharge Management | Person 2 |
| ICU Resource Management | Person 2 |
| Maintenance Management | Person 2 |
| Complete ER Diagram | Both |
| Normalization | Both |
| Database Constraints | Both |
| SQL Schema Review | Both |
| Integration Testing | Both |

---


**Project:** SmartCare – Intelligent Hospital Operations & Resource Management System

**Document Status:** Initial Draft – Awaiting Joint Review

**Database Platform:** PostgreSQL (Supabase)