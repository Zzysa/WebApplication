# Microservice-Shop – README

A full-stack demo store built with a microservice architecture:

- React frontend
- API-Gateway (Express)
- Account-Service (Node + Prisma + PostgreSQL)
- Product-Service (Node + Mongoose + MongoDB)

Both **Docker Compose** and **Kubernetes** manifests are provided.

---

## 1 – Quick Start

### 1.1 Docker Compose (recommended for local development)

```bash
git clone https://github.com/Zzysa/WebApplication
cd my-microservices-project

# make and fill .env files (all varibles you can find in env.example files) 
touch services/account-service/.env
touch services/product-service/.env

# start dev stack
cd deployments/docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

### 1.2 Docker Compose – production image test

```bash
docker-compose -f deployments/docker-compose/docker-compose.yml up --build
```

### 1.3 Kubernetes (minikube / kind / real cluster)

```bash
kubectl apply -f deployments/k8s
# for minikube
minikube addons enable ingress
echo "127.0.0.1 microshop.local" | sudo tee -a /etc/hosts
```

---

## 2 – Exposed Ports

| Component                | Docker-Compose DEV | Docker-Compose PROD | Kubernetes (Ingress) |
| ------------------------ | ------------------ | ------------------- | --------------------- |
| Frontend React           | http://localhost:19003 | http://localhost:18080 | http://microshop.local |
| API-Gateway              | http://localhost:19000 | http://localhost:18000 | http://microshop.local/api |
| Account-Service          | http://localhost:19001 | internal            | ClusterIP |
| Product-Service          | http://localhost:19002 | internal            | ClusterIP |
| Mongo Express            | http://localhost:19081 | http://localhost:18081 | N/A |
| PostgreSQL               | localhost:19432       | volume only         | ClusterIP |
| MongoDB                  | localhost:19017       | volume only         | ClusterIP |

---

## 3 – Authentication and Roles

- Firebase Authentication (email/password)
- `account-service` syncs each Firebase user into PostgreSQL.
- Default roles:  
  - `admin` – full access  
  - `client` – regular customer

### 3.1 Existing test accounts

| Email            | Role  |
| ---------------- | ----- |
| `test@test.com`  | admin |
| `client@test.com`| client |

### 3.2 Promote your own user to admin

```bash
# open psql inside the postgres container
docker exec -it $(docker ps -qf "name=postgres") psql -U user -d shop_db

UPDATE "User" SET role = 'admin' WHERE email = 'your-mail@example.com';
```

---

## 4 – Day-to-day Usage

### Customers

- Register / log in on the frontend.
- Browse products, filter, search, add to cart.
- Use coupon codes during checkout (see Marketing team list).
- Place an order; a mock payment is processed.

### Administrators

- Log in with an admin account.
- Admin Panel ➜  
  - Create / edit / delete products  
  - Create categories  
  - View all users  
- Manage orders ➜ change status (pending → processing → …).

---

## 5 – Important Commands

### Docker Compose

```bash
# follow logs
docker-compose -f deployments/docker-compose/docker-compose.dev.yml logs -f

# rebuild one service
docker-compose -f deployments/docker-compose/docker-compose.dev.yml up --build product-service

# stop and remove volumes
docker-compose -f deployments/docker-compose/docker-compose.dev.yml down -v
```

### Kubernetes

```bash
kubectl get pods -n microshop
kubectl logs -f deployment/api-gateway -n microshop
kubectl exec -it deployment/product-service -n microshop -- /bin/sh
kubectl delete namespace microshop   # full cleanup
```

---

## 6 – API Reference (gateway routes)

Public (no auth):

- `GET /api/products`
- `GET /api/categories`
- `GET /api/coupons`
- `POST /api/coupons/apply`

Authenticated:

- `POST /api/auth/sync`
- `GET /api/users/me`
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/payments/process`

Admin only:

- `GET /api/users`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/categories`
- `GET /api/admin/orders`
- `PATCH /api/orders/:id/status`

---

## 7 – Troubleshooting

| Symptom                              | Fix |
| ------------------------------------ | --- |
| Frontend shows **Network Error**     | Ensure `REACT_APP_API_URL` points to `http://localhost:19000` and API-Gateway is running. |
| DB connection errors                 | Wait a few seconds, then check `docker-compose logs db mongo`. |
| Wrong ports already in use           | `sudo lsof -i :19000` ➜ kill the process or change ports in compose. |
| No products returned                 | Seed MongoDB: `docker exec -it product-service npm run seed`. |

---

## 8 – Features Checklist

- Docker Compose & Kubernetes deployment
- Firebase auth + custom user sync
- Role-based access control
- CRUD for products and categories
- Order and payment workflow (mock)
- Coupon / discount engine
- React frontend with filters & admin panel
- Security: Helmet, CORS, rate-limit
- HPA for Product-Service (K8s)
- Persistent volumes for databases
