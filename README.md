# Villas Cangrejo

Web application for a hotel reservation system in Melaque, Jalisco, developed as a university project.

The project started as a hotel website and evolved into a full web application with a public site, customer accounts, an administrator panel, reservations, reviews and accounting features.

## Features

- Online reservation requests
- Customer registration and login
- Customer reservation history
- Administrator panel
- Reservation status management
- Occupancy calendar
- Guest review system with administrator moderation
- Average guest rating
- Password recovery by email
- Spanish and English public interface
- Monthly income and accounting information
- PDF receipt generation
- Excel data export
- Responsive interface

## Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express

### Database

- MongoDB
- Mongoose

### Libraries and Tools

- bcryptjs
- dotenv
- CORS
- Helmet
- express-rate-limit
- Nodemailer
- jsPDF

## Project Structure

```text
hotel-costa-alegre/
├── public/          # HTML, CSS, JavaScript and public assets
├── server/          # Node.js / Express backend
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── utils/
├── package.json
└── README.md
```

## API

The Express backend provides REST endpoints for:

- Authentication
- Reservations
- Customers
- Accounting
- Guest reviews

## Security

The backend implements several security measures:

- HTTP security headers with Helmet
- Rate limiting
- Request payload limits
- Password hashing with bcryptjs
- Environment variables for sensitive configuration
- Role-based access for customers and administrators

## Running Locally

### Requirements

- Node.js 18 or newer
- MongoDB

Install the dependencies:

```bash
npm install
```

Configure the required environment variables and start the server:

```bash
npm start
```

The application uses port `3000` by default.

## About the Project

This project is part of my work as a Teleinformatics Engineering student and has helped me practice frontend development, backend development, REST APIs, databases and web application security concepts.
