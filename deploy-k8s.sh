#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=microshop

echo "► Проверка доступа к kubectl..."
if ! command -v kubectl &>/dev/null; then
  echo "ОШИБКА: kubectl не найден в PATH" >&2
  exit 1
fi

echo "► Создание namespace ${NAMESPACE}..."
kubectl apply -f deployments/k8s/namespace.yaml

echo "► Сборка Docker образов..."
docker build -t account-service:latest -f services/account-service/Dockerfile services/account-service
docker build -t product-service:latest -f services/product-service/Dockerfile services/product-service  
docker build -t api-gateway:latest -f services/api-gateway/Dockerfile services/api-gateway
docker build -t frontend-react:latest -f services/frontend-react/Dockerfile services/frontend-react

echo "► Развертывание секретов и конфигураций..."
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/secret.yaml -f deployments/k8s/configmap.yaml

echo "► Очистка существующих ресурсов..."
kubectl delete job product-seed-job -n "${NAMESPACE}" --ignore-not-found=true
kubectl delete deployment postgres mongo account-service product-service api-gateway frontend-react -n "${NAMESPACE}" --ignore-not-found=true
kubectl delete pvc postgres-pvc mongo-pvc -n "${NAMESPACE}" --ignore-not-found=true

echo "► Ожидание завершения очистки..."
sleep 10

echo "► Развертывание баз данных..."
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/postgres.yaml -f deployments/k8s/mongo.yaml

echo "► Ожидание готовности баз данных..."
kubectl wait --for=condition=ready pod -l app=postgres -n "${NAMESPACE}" --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongo -n "${NAMESPACE}" --timeout=300s

echo "► Развертывание сервисов приложения..."
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/account-service.yaml
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/product-service.yaml  
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/api-gateway.yaml
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/frontend-react.yaml

echo "► Ожидание готовности сервисов..."
kubectl wait --for=condition=ready pod -l app=account-service -n "${NAMESPACE}" --timeout=180s
kubectl wait --for=condition=ready pod -l app=product-service -n "${NAMESPACE}" --timeout=180s
kubectl wait --for=condition=ready pod -l app=api-gateway -n "${NAMESPACE}" --timeout=180s
kubectl wait --for=condition=ready pod -l app=frontend-react -n "${NAMESPACE}" --timeout=180s

echo "► Запуск задачи наполнения базы данных (seeding)..."
kubectl apply -f deployments/k8s/seed-job.yaml

echo "► Ожидание завершения задачи наполнения..."
kubectl wait --for=condition=complete job/product-seed-job -n "${NAMESPACE}" --timeout=120s

echo "► Логи задачи наполнения:"
kubectl logs -n "${NAMESPACE}" job/product-seed-job

echo "► Развертывание HPA..."
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/hpa.yaml

echo "► Развертывание Ingress..."
kubectl apply -n "${NAMESPACE}" -f deployments/k8s/ingress.yaml

echo "✅ Развертывание завершено!"
echo ""
echo "► Статус подов:"
kubectl get pods -n "${NAMESPACE}" -o wide
echo ""
echo "► Статус PVC:"
kubectl get pvc -n "${NAMESPACE}"
echo ""
echo "► Статус сервисов:"
kubectl get svc -n "${NAMESPACE}"
echo ""
echo "► Для доступа к приложению добавьте в /etc/hosts:"
echo "127.0.0.1 microshop.local"