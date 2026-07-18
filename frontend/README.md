# Google Maps Business Extractor Frontend

This React + Vite application is the Phase 10 admin dashboard for the Google Maps Business Extractor.

## Install

From the `frontend` folder:

```bash
npm install
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## API Configuration

The dashboard uses the environment variable `VITE_API_BASE_URL` in development.

Example:

```bash
VITE_API_BASE_URL=http://localhost:8000/api npm run dev
```

In production, the frontend is served from the backend and uses the relative API path `/api` by default.

For production, the frontend is served from the backend and uses the relative API path `/api` by default.

## Production build

To build the frontend for production and serve it from the backend, run:

```bash
npm run build
```

Then start the backend from the repository root using:

```powershell
.\scripts\run_prod.ps1
```

or:

```cmd
scripts\run_prod.cmd
```
