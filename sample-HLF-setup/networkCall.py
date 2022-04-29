import requests
import json

import requests
import json

def accessNewToken():
    print('Getting Bearer Token for User')
    url = "0.0.0.0:4000"    
    postURL = 'http://{}/users/register'.format(url)
    print(postURL)
    headers = {
        'Content-Type':'application/json',        
    }
    body = {
        "username": "admin",
        "orgName": "asu",
        "role": "client",
        "attrs": [
            {
                "name":"client1",
                "value":"yes",
                "ecert": True
            }, 
        ],
        "secret": "ff7ff4f5e61dd14603f3210a2a272c08"
    }
    response = requests.post(postURL, data=json.dumps(body), headers=headers)
    # token = response.json()['token']
    token = response.json()
    return response.json()['token']

#Chaincode Name
chainCode = "patientSC"
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer {}'.format(accessNewToken())}
url = "http://0.0.0.0:4000/channels/asuchannel/chaincodes/" + chainCode
peer = "peer0.machine1.asu.edu"

#Query by Gender
querystring = {"peer": peer, "fcn": "queryByGender", "args": "[\"M\"]"}
r = requests.request("GET", url, headers=headers, params=querystring)
print(r.json())

#Query by Blood Type
querystring = {"peer": peer, "fcn": "queryByBlood_Type", "args": "[\"B\"]"}
r = requests.request("GET", url, headers=headers, params=querystring)
print(r.json())

#Query by DualBloodType Type
rnd1 = "johnASU"
rnd2 = "john1"
querystring = {"peer": peer, "fcn": "getPatientByKey", "args": "[\"{}\",\"{}\"]".format(rnd1,rnd2)}
r = requests.request("GET", url, headers=headers, params=querystring)
print(r.json())

