# QuizMaster Pro

QuizMaster Pro is a comprehensive quiz management application built with Angular for the frontend and Express/SQLite for the backend. The application allows administrators to create, manage, and assign quizzes, while users can take quizzes and view their results.

## Project Structure

This project uses a clean separated architecture with:

1. **Frontend**: Angular 20.x application in the root directory
2. **Backend**: Express.js API server in the `backend/` directory

## Architecture

- **Frontend**: Angular 20.x with Angular Material and PrimeNG
- **Backend**: Node.js with Express.js
- **Database**: SQLite using better-sqlite3
- **API Documentation**: Swagger UI

## Quick Start

### Run the frontend and backend (separated architecture)

```bash
# Install dependencies for both
npm install
npm run install:backend

# Run both servers together
npm run start:dev
```

This will start:

- The backend API server on http://localhost:4000
- The Angular development server on http://localhost:4200
- Swagger API documentation on http://localhost:4000/api-docs

### Run frontend or backend separately

```bash
# Run only the frontend
npm start

# Run only the backend
npm run start:api
```

### Automatic Migration from Unified Mode

If you're migrating from the unified mode to separated architecture, you can use the provided migration script:

```bash
# Windows
.\migrate-to-separated.bat

# Manual steps for any platform
npm install
npm run install:backend
npm run migrate
npm run cleanup
```

This will:

1. Install dependencies for both frontend and backend
2. Migrate the database from root to backend folder
3. Clean up unnecessary backend files from the frontend

# Frontend: http://localhost:4200

# Backend: http://localhost:4000/api-docs

````

## Features

- User authentication and role-based access control
- Quiz creation and management
- Multiple question types (multiple choice, true/false, etc.)
- Quiz assignments and access management
- Quiz attempts tracking and scoring
- Statistics and reporting

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.7.

## Development server

To start a local development server, run:

```bash
ng serve
````

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
