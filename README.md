# customs-portal
# Import Export Customs Documentation Portal

A full-stack web application for managing import/export customs documentation for freight forwarders and logistics companies.

## 📌 Project Overview

This portal helps freight forwarders prepare, manage, and track customs documents for import/export shipments.

The system allows users to:
- Manage shipments
- Generate customs documents
- Track document status
- Manage clients
- Store compliance certificates
- Receive expiry alerts

---

## 🚀 Features

### Authentication
- User Registration
- User Login
- JWT Authentication
- Role-Based Access

### Client Management
- Add Clients
- Update Client Details
- Delete Clients
- View Client Information

### Shipment Management
- Create Shipments
- Track Shipment Status
- Manage Import/Export Data

### Customs Documents
- Bill of Lading
- Packing List
- Commercial Invoice
- Certificate of Origin

### Compliance Management
- Upload Certificates
- Track Expiry Dates
- Expiry Alerts

### Dashboard
- Shipment Statistics
- Pending Documents
- Expired Certificates
- Recent Activities

---

## 🛠️ Tech Stack

### Frontend
- React.js
- React Router DOM
- React Hook Form
- Tailwind CSS
- Axios
- jsPDF
- date-fns

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL (Supabase)

### Other Tools
- GitHub
- VS Code
- Thunder Client

---

## 📂 Project Structure

```bash
client/
│
├── src/
├── public/
└── package.json

server/
│
├── controllers/
├── routes/
├── config/
├── middleware/
└── server.js
