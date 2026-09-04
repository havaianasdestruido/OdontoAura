# Autenticação API

## Registrar Usuário

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "paciente@email.com",
  "password": "senha123",
  "name": "João Silva",
  "phone": "+5511999990000",
  "role": "PATIENT"
}
```

## Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "paciente@email.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "PATIENT" },
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Usar Token

Incluir o header `Authorization: Bearer <token>` em requisições autenticadas.
