

# Backend - Book Borrowing Platform

This is the backend API for the Book Borrowing Platform. It provides the necessary endpoints for managing books, user authentication, and borrowing functionalities.

## Features

- **Authentication:**
  - Email/password authentication using Firebase.
  - JWT token-based private routes.

- **Book Management:**
  - CRUD operations for books.
  - Decrease/increase book quantity using MongoDB's `$inc` operator.

- **Borrowing System:**
  - Add books to the Borrowed Books list.
  - Return books and update their quantity.

- **Protected Routes:**
  - Validate JWT tokens for private API endpoints.

- **Error Handling:**
  - Handles authentication errors (401, 403).
  - Input validation for book operations.

## Technology Stack

- **Framework:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** Firebase Authentication, JWT
- **Environment Variables:** dotenv
- **HTTP Client:** Axios (for Firebase interactions)

