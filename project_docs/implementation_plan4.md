# Comprehensive CI/CD Pipeline Setup

This plan details the process of completely overhauling and setting up a robust, production-ready CI/CD pipeline for the FineDine application using **GitHub Actions**.

## Open Questions

> [!IMPORTANT]  
> **Deployment Destination**: The pipeline will automatically build and containerize your application. Do you have a specific destination you want this pipeline to deploy the final code to (e.g., AWS EC2, DigitalOcean Droplet, Heroku, or pushing Docker images to Docker Hub/GitHub Container Registry)? Let me know and I will adjust the Continuous Deployment (CD) step!

## Proposed Changes

We will replace the existing, rudimentary `ci.yml` file with a complete frontend and backend pipeline.

### `.github/workflows/ci-cd.yml`
#### [NEW] .github/workflows/ci-cd.yml
#### [DELETE] .github/workflows/ci.yml

The new GitHub Actions workflow will feature concurrent jobs:

1. **Frontend CI (React/Vite)**
   - Checkout the repository.
   - Set up Node.js.
   - Install dependencies (`npm install`).
   - Run the production build (`npm run build`) to ensure there are no syntax or React build errors.

2. **Backend CI (FastAPI Microservices)**
   - Checkout the repository.
   - Set up Python 3.12.
   - Install dependencies (`pip install -r requirements.txt`).
   - Run the test suite (`pytest`) against the microservices logic.

3. **Docker Build & Push (CD Preparation)**
   - Depends on the successful completion of the Frontend and Backend CI jobs.
   - Sets up Docker Buildx.
   - Builds the production Docker image (`finedine-app:latest`).
   - *If a registry is specified (see Open Questions), this step will authenticate and push the image to the remote registry.*

### `frontend/package.json`
#### [MODIFY] package.json
- Update the project `name` from `fooddash-frontend` to `finedine-frontend` to ensure consistency across the application.

## Verification Plan

### Automated Tests
- The pipeline itself acts as the automated test. We will trigger the pipeline by pushing the new workflow file to the GitHub `main` branch.
- We will monitor the GitHub Actions runner output directly to ensure the Frontend Build, Python Pytest, and Docker Build steps all report a green `Success` status.
