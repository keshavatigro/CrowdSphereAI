#!/usr/bin/env bash
# Deploy CrowdSphere AI to Cloud Run (project: crowdsphereai)
# Usage in Cloud Shell:
#   export GEMINI_API_KEY="..." OPENAI_API_KEY="..."
#   ./scripts/deploy-cloud-run.sh
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-crowdsphereai}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-crowdsphere-ai}"

if [[ -z "${GEMINI_API_KEY:-}" || -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Error: set GEMINI_API_KEY and OPENAI_API_KEY before deploying."
  exit 1
fi

echo "→ Project: ${PROJECT_ID}  Region: ${REGION}  Service: ${SERVICE_NAME}"
gcloud config set project "${PROJECT_ID}"

echo "→ Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

ensure_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "${name}" --project="${PROJECT_ID}" &>/dev/null; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=- --project="${PROJECT_ID}"
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- --project="${PROJECT_ID}"
  fi
}

echo "→ Storing API keys in Secret Manager..."
ensure_secret "crowdsphere-gemini-api-key" "${GEMINI_API_KEY}"
ensure_secret "crowdsphere-openai-api-key" "${OPENAI_API_KEY}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for secret in crowdsphere-gemini-api-key crowdsphere-openai-api-key; do
  gcloud secrets add-iam-policy-binding "${secret}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "→ Building and deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-secrets "GEMINI_API_KEY=crowdsphere-gemini-api-key:latest,OPENAI_API_KEY=crowdsphere-openai-api-key:latest"

URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)')"
echo ""
echo "Deployed: ${URL}"
