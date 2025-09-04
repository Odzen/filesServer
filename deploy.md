# GCP Cloud Run Deployment

## Quick Deploy Commands

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/html-to-pdf
gcloud run deploy html-to-pdf-service --image gcr.io/YOUR_PROJECT_ID/html-to-pdf --platform managed --region us-central1 --allow-unauthenticated --port 8080 --memory 1Gi

# Or use Cloud Build (automated)
gcloud builds submit --config cloudbuild.yaml
```

## Local Testing

```bash
# Build Docker image
docker build -t html-to-pdf .

# Run locally
docker run -p 8080:8080 html-to-pdf

# Test endpoint
curl http://localhost:8080/
```

## Environment Variables

Cloud Run will automatically set:
- `PORT` (usually 8080)
- `NODE_ENV=production`
