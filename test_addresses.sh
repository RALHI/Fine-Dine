#!/bin/bash
TOKEN1=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"alice@fooddash.com","password":"Pass1234!"}' | jq -r .access_token)
TOKEN2=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"bob@fooddash.com","password":"Pass1234!"}' | jq -r .access_token)

echo "Alice's Token: $TOKEN1"
echo "Bob's Token: $TOKEN2"

curl -s -X GET http://localhost:8000/api/users/addresses -H "Authorization: Bearer $TOKEN1" > out1.json
curl -s -X GET http://localhost:8000/api/users/addresses -H "Authorization: Bearer $TOKEN2" > out2.json

echo "Alice's addresses:"
cat out1.json
echo ""
echo "Bob's addresses:"
cat out2.json
