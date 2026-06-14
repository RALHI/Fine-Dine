#!/bin/bash
TOKEN3=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"charlie@fooddash.com","password":"Pass1234!"}' | jq -r .access_token)

echo "Charlie's Token: $TOKEN3"

curl -s -X GET http://localhost:8000/api/users/addresses -H "Authorization: Bearer $TOKEN3" > out3.json

echo "Charlie's addresses:"
cat out3.json
