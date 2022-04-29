ARCH=`uname -m`
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARCH=$ARCH docker-compose -f "${DIR}"/docker-compose.yml down
export DOCKER_CLIENT_TIMEOUT=120
export COMPOSE_HTTP_TIMEOUT=120
ARCH=$ARCH docker-compose -f "${DIR}"/docker-compose.yml up -d
echo "[INFO] Sleeping for 10 seconds, waiting for docker images to start."
sleep 10
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer0.machine1.asu.edu peer channel create -o orderer0.orderer.org:7050 -c asuchannel -f /etc/hyperledger/configtx/artifacts/channel/asuchannel_tx.pb --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth

sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer0.machine1.asu.edu peer channel fetch 0 -o orderer0.orderer.org:7050 -c asuchannel --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth
sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer0.machine1.asu.edu peer channel join -b asuchannel_0.block -o orderer0.orderer.org:7050 --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth
sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer1.machine1.asu.edu peer channel fetch 0 -o orderer0.orderer.org:7050 -c asuchannel --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth
sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer1.machine1.asu.edu peer channel join -b asuchannel_0.block -o orderer0.orderer.org:7050 --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth
sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer2.machine1.asu.edu peer channel fetch 0 -o orderer0.orderer.org:7050 -c asuchannel --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth
sleep 2
docker exec -e "CORE_PEER_LOCALMSPID=asuMSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@asu.edu/msp" peer2.machine1.asu.edu peer channel join -b asuchannel_0.block -o orderer0.orderer.org:7050 --tls --cafile /etc/hyperledger/configtx/artifacts/channel/crypto-config/ordererOrganizations/orderer.org/tlsca/tlsca.orderer.org-cert.pem --certfile /etc/hyperledger/fabric/tls/server.crt --keyfile /etc/hyperledger/fabric/tls/server.key --clientauth