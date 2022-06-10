/* eslint-disable quote-props */
/* eslint-disable quotes */
/* eslint-disable linebreak-style */
/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const { Contract, Context } = require('fabric-contract-api');
const PatientRecord = require('./patientrecord.js');
const PatientRecordList = require('./patientrecordlist.js');


class PatientRecordContext extends Context {

    constructor() {
        super();
        this.patientRecordList = new PatientRecordList(this);
    }

}

/**
 * Define patient record smart contract by extending Fabric Contract class
 *
 */
class PatientRecordContract extends Contract {

    constructor() {
        super('edu.asu.patientrecordcontract');
    }

    /**
     * Define a custom context for commercial paper
    */
    createContext() {
        return new PatientRecordContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async init(ctx) {
        console.log('Instantiated the patient record smart contract.');
    }

    async unknownTransaction(ctx){
        throw new Error('Function name missing')
    }

     async afterTransaction(ctx){
        console.log('---------------------INSIDE afterTransaction-----------------------')
        let func_and_params = ctx.stub.getFunctionAndParameters()
        console.log('---------------------func_and_params-----------------------')
        console.log(func_and_params)
        console.log(func_and_params['fcn'] === 'createPatientRecord' && func_and_params['params'][4]==='AB-')
        if (func_and_params['fcn'] === 'createPatientRecord' && func_and_params['params'][4]==='AB-') {
            ctx.stub.setEvent('rare-blood-type', JSON.stringify({'username': func_and_params.params[0]}))
            console.log('Chaincode event is being created!')
        }

    }
    /**
     * patient record
     * @param {Context} ctx the transaction context
     * @param {String} username username
     * @param {String} name name
     * @param {String} dob date of birth
     * @param {String} gender  gender
     * @param {String} blood_type blood type
     */
    async createPatientRecord(ctx,username,name,dob,gender,blood_type){
        let precord = PatientRecord.createInstance(username,name,dob,gender,blood_type);
        await ctx.patientRecordList.addPRecord(precord);
        return precord.toBuffer();
    }

    async getPatientByKey(ctx, username, name){
        let precordKey = PatientRecord.makeKey([username,name]);
        //TASK-1: Use a method from patientRecordList to read a record by key
        let precord = await ctx.patientRecordList.getPRecord(precordKey);
        return JSON.stringify(precord)
    }


    /**
     * Update lastCheckupDate to an existing record
     * @param {Context} ctx the transaction context
     * @param {String} username username
     * @param {String} name name
     * @param {String} lastCheckupDate date string 
     */
    async updateCheckupDate(ctx,username,name,lastCheckupDate){
        let precordKey = PatientRecord.makeKey([username,name]);
        let precord = await ctx.patientRecordList.getPRecord(precordKey);
        precord.setlastCheckupDate(lastCheckupDate);
        await ctx.patientRecordList.updatePRecord(precord);
        return precord.toBuffer();
    }



    /**
     * Evaluate a queryString
     * This is the helper function for making queries using a query string
     *
     * @param {Context} ctx the transaction context
     * @param {String} queryString the query string to be evaluated
    */    
   async queryWithQueryString(ctx, queryString) {

    console.log("query String");
    console.log(JSON.stringify(queryString));

    let resultsIterator = await ctx.stub.getQueryResult(queryString);

    let allResults = [];

    while (true) {
        let res = await resultsIterator.next();

        if (res.value && res.value.value.toString()) {
            let jsonRes = {};

            console.log(res.value.value.toString('utf8'));

            jsonRes.Key = res.value.key;

            try {
                jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
                console.log(err);
                jsonRes.Record = res.value.value.toString('utf8');
            }

            allResults.push(jsonRes);
        }
        if (res.done) {
            console.log('end of data');
            await resultsIterator.close();
            console.info(allResults);
            console.log(JSON.stringify(allResults));
            return JSON.stringify(allResults);
        }
    }

}

    /**
     * Query by Gender
     *
     * @param {Context} ctx the transaction context
     * @param {String} gender gender to be queried
    */
    async queryByGender(ctx, gender) {
    const queryString = {
        selector : {gender : gender},
        use_index: "genderIndex"
    }
    const selectorString = JSON.stringify(queryString);
    return this.queryWithQueryString(ctx,selectorString);
}

    /**
     * Query by Blood_Type
     *
     * @param {Context} ctx the transaction context
     * @param {String} blood_type blood_type to queried
    */
    // Graded Function
    async queryByBlood_Type(ctx, blood_type) {
    const queryString = {
        selector : {blood_type : blood_type},
        use_index: "blood_typeIndex"
    }
    const selectorString = JSON.stringify(queryString);
    return this.queryWithQueryString(ctx,selectorString);

}

    /**
     * Query by Blood_Type Dual Query
     *
     * @param {Context} ctx the transaction context
     * @param {String} blood_type blood_type to queried
    */
    async queryByBlood_Type_Dual(ctx, blood_type1, blood_type2) {
    const queryString = {
        selector : {blood_type : {$in:[blood_type1,blood_type2]}},
        use_index: "blood_typeIndex"
    }
    const selectorString = JSON.stringify(queryString);
    return this.queryWithQueryString(ctx,selectorString);

}

}


module.exports = PatientRecordContract;
