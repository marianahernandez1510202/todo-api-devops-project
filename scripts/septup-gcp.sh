#!/bin/bash

# Google Cloud Setup Script para Todo API

# Variables (CAMBIAR ESTOS VALORES)
PROJECT_ID="prueba-2476e"
REGION="us-central1"
INSTANCE_NAME="todo-postgres"
DATABASE_NAME="todoapp"
DB_USER="postgres"
DB_PASSWORD="12345"
SERVICE_NAME="todo-api"

echo "🚀 Setting up Google Cloud for Todo API..."

# 1. Set project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# 2. Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com

# 3. Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create $INSTANCE_NAME \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=02

# 4. Set root password
echo "🔐 Setting database password..."
gcloud sql users set-password $DB_USER \
    --instance=$INSTANCE_NAME \
    --password=$DB_PASSWORD

# 5. Create database
echo "📊 Creating database..."
gcloud sql databases create $DATABASE_NAME \
    --instance=$INSTANCE_NAME

# 6. Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)")
echo "🔗 Connection name: $CONNECTION_NAME"

# 7. Create service account for Cloud Run
echo "👤 Creating service account..."
gcloud iam service-accounts create cloud-run-sql \
    --display-name="Cloud Run SQL Client"

# 8. Grant permissions
echo "🔑 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:cloud-run-sql@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# 9. Build and deploy
echo "🏗️ Building Docker image..."
docker build -f Dockerfile.cloudrun -t gcr.io/$PROJECT_ID/$SERVICE_NAME .

echo "📤 Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# 10. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --service-account cloud-run-sql@$PROJECT_ID.iam.gserviceaccount.com \
    --add-cloudsql-instances $CONNECTION_NAME \
    --set-env-vars NODE_ENV=production \
    --set-env-vars DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME" \
    --set-env-vars JWT_SECRET="$JWT_SECRET" \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10

echo "✅ Setup complete!"
echo "🔗 Your API is available at: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')"
echo ""
echo "Next steps:"
echo "1. Run the migration script: psql -h /cloudsql/$CONNECTION_NAME -U $DB_USER -d $DATABASE_NAME -f scripts/migrate.sql"
echo "2. Test your API: curl [YOUR_CLOUD_RUN_URL]/health"
echo "3. Set up GitHub Actions for automatic deployment"