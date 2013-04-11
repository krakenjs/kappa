#!/bin/bash

echo -n "Username: "
read username

echo -n "Password: "
read -s password

echo

hostname=http://stage2p2407.qa.paypal.com:5984
if [ "$1" != "" ]; then
    hostname=$1
fi

#curl -X POST -u "$username:$password" -H "Content-Type: application/json" -d @public_users.json $hostname/_replicate
curl -X POST -u "$username:$password" -H "Content-Type: application/json" -d @registry.json $hostname/_replicate

echo "Remember: save the ID in a safe place should you want to cancel this replication."
