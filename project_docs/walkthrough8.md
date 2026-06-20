# FineDine CI/CD Pipeline Overview

I have successfully replaced the old pipeline with a comprehensive, production-ready CI/CD Pipeline powered by GitHub Actions.

## What is it doing?

Whenever a developer pushes code to the `main` branch or opens a Pull Request against `main`, GitHub Actions automatically spins up a virtual runner to execute three distinct, critical jobs:

### 1. Frontend Build Verification (React/Vite)
- Automatically sets up a pristine `Node.js 18` environment.
- Safely installs all dependencies (`npm install`).
- Triggers a full production build (`npm run build`). This strictly checks the React UI code for any silent compilation errors, syntax faults, or invalid imports before it ever touches a server.

### 2. Backend Automated Testing (FastAPI)
- Bootstraps an isolated `Python 3.12` environment.
- Installs the entire Python dependency tree (`requirements.txt`).
- Fires up your Pytest suite, executing all the backend unit tests for Authentication, Orders, Restaurants, and the Chatbot. If any backend microservice logic gets broken by a bad code push, this step instantly fails and prevents deployment.

### 3. Docker Containerization & Deployment
- Once the Frontend and Backend steps pass cleanly, this job authenticates with the **GitHub Container Registry (GHCR)**.
- It leverages Docker Buildx to compile the complex monorepo Docker image containing all 7 microservices.
- Finally, it automatically tags the image with the current Git commit SHA and pushes the ready-to-run container directly to the registry (`ghcr.io/RALHI/Fine-Dine`).

## Check it out!
You can view the pipeline running live right now by going to your GitHub repository and clicking on the **"Actions"** tab! 

> [!TIP]
> The Docker image will securely be stored in your GitHub profile's **Packages** tab and can be deployed directly from there to any cloud provider!
