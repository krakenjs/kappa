#!/bin/bash

echo -n "Username: "
read username

echo -n "Password: "
read -s password

echo

hostname=http://10.9.110.82:5984
if [ "$1" != "" ]; then
    hostname=$1
fi


#curl -X POST -u "$username:$password" -H "Content-Type: application/json" -d "{\"replication_id\": \"1d6712b8099dc0b665ca177730b89721+continuous+create_target\", \"cancel\": true }" $hostname/_replicate

# registry on 10.9.110.82
curl -X POST -u "$username:$password" -H "Content-Type: application/json" -d "{\"replication_id\": \"ca0f3fa2af1c14d2d8764fe644b609b5+continuous+create_target\", \"cancel\": true }" $hostname/_replicate


# registry on  stage2p2407
# {"ok":true,"_local_id":"04869f98822d296994e922498dce44f2+continuous+create_target"}