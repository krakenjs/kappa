#!/bin/bash

echo -n "Username: "
read username

echo -n "Password: "
read -s password

echo

hostname=stage2p2407.qa.paypal.com:5984
if [ "$1" != "" ]; then
    hostname=$1
fi

curl -X PUT "http://$username:$password@$hostname/_config/vhosts/npm.paypal.com" -d '"/registry/_design/app/_rewrite"'