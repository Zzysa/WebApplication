#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=microshop

echo "► Check access to the kubectl..."
if ! command -v kubectl &>/dev/null; then
  echo "ERROR: kubectl isn't fount PATH" >&2
  exit 1
fi

echo "► Create namespace ${NAMESPACE} (if needed)..."
kubectl get ns "${NAMESPACE}" &>/dev/null \
  || kubectl apply -f deployments/k8s/namespace.yaml

echo "► Create Images..."
docker build -t account-service:latest \
  -f services/account-service/Dockerfile services/account-service
docker build -t product-service:latest \
  -f services/product-service/Dockerfile services/product-service
docker build -t api-gateway:latest \
  -f services/api-gateway/Dockerfile services/api-gateway
docker build -t frontend-react:latest \
  -f services/frontend-react/Dockerfile services/frontend-react

echo "► Deploy secrets and data bases..."
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/secret.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/postgres.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/mongo.yaml

echo "► Deploy mircoservices..."
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/account-service.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/product-service.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/api-gateway.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/frontend-react.yaml

echo "► Config HPA и Ingress..."
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/hpa.yaml
kubectl apply -n "${NAMESPACE}" \
  -f deployments/k8s/ingress.yaml

echo "✅ Deploy complitied. Wait, until Pods will be Ready:"
kubectl get pods -n "${NAMESPACE}" --watch