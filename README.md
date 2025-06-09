# Project Setup

This project uses a microservices architecture orchestrated with Docker Compose.

## Prerequisites

-   Docker & Docker Compose
-   A Google Firebase account

## Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Zzysa/WebApplication
    cd my-microservices-project
    ```

2.  **Configure Firebase Admin (Backend):**
    -   Navigate to your project in the [Firebase Console](https://console.firebase.google.com/).
    -   Go to `Project settings` > `Service accounts`.
    -   Click **"Generate new private key"** and download the JSON file.
    -   Rename the downloaded file to `firebase-service-account.json`.
    -   Place this file inside the `services/account-service/config/` directory.

3.  **Configure Firebase Client (Frontend):**
    -   In the Firebase Console, go to `Project settings` > `General`.
    -   Under "Your apps", find your web app and copy the `firebaseConfig` object.
    -   Paste this object into the `services/frontend-react/src/firebase.js` file.

4.  **Create Environment Files:**
    -   This project uses `.env` files for configuration.
    -   For each service that has a `.env.example` file, create a corresponding `.env` file by copying the example file.
    -   For example, for `account-service`:
        ```bash
        cp services/account-service/.env.example services/account-service/.env
        ```
    -   Fill in the necessary values in the newly created `.env` files.

## Running the Application

To run the application in development mode:

```bash
docker-compose -f ./deployments/docker-compose/docker-compose.yml -f ./deployments/docker-compose/docker-compose.dev.yml up --build
```

The application will be available at `http://localhost:3000`.
