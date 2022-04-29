#!/bin/sh
echo " " > /root/crontask.txt
echo "Start time is: " $(date +%T) >> /root/crontask.txt
		
docker stop explorer explorerdb  >> /root/crontask.txt
docker system prune -a -f --volumes  >> /root/crontask.txt
docker network disconnect -f hyperledger-explorer_hyperledger_explorer explorer >> /root/crontask.txt
docker network disconnect -f hyperledger-explorer_hyperledger_explorer explorerdb >> /root/crontask.txt

cd /home/device-Machine1-asu/hyperledger-explorer/
/home/device-Machine1-asu/hyperledger-explorer/./start.sh   >> /root/crontask.txt

echo "End time is: " $(date +%T) >> /root/crontask.txt'
		