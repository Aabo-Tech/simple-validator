/**
 * Aabo Technologies 2021
 * Maintained by Fernando Martin Garcia Del Angel
 * Built on: May 9th, 2021
 */

'use strict'
const shim = require('fabric-shim')
const util = require('util')

const VaccinationStatus = {
    notVaccinated = "NOTVACCINATED",
    firstDose = "FIRSTDOSE",
    fullyVaccinated = "FULLYVACCINATED",
    reinforcement = "REINFORCEMENT"
}

const ValidationStatus = {
    notValidated = "NOTVALIDATED",
    inValidation = "INVALIDATION",
    invalid = "INVALID",
    valid = "VALID"
}

let Chaincode = class {
    /**
     * Chaincode Init
     * @param {Object} stub Instantiation object
     * @returns {Boolean} Execution status
     */
    async Init(stub) {
        let ret = stub.getFunctionAndParameters()
        console.info(ret)
        console.info(' ======= Instantiated Health Passport with SUCCESS =======')
        console.info(' ======= Aabo Technologies 2021 ====== ')
        return shim.success()
    }

    /**
     * Invocation mehtod
     * @param {Object} stub Instantiation object
     * @returns {Boolean} Execution Status
     */
    async Invoke(stub) {
        console.info('Transaction ID:', stub.getTxId())
        console.info(util.format('Args: %j', stub.getArgs()))
        // Get the expected method and execute it
        let ret = stub.getFunctionAndParameters()
        let methodToExecute = this[ret.fcn]
        if (!methodToExecute) { throw new Error('Received unknown method with name:', methodToExecute) }
        try {
            let payload = await methodToExecute(stub, ret.params, this)
            return shim.success(payload)
        } catch (error) {
            console.error(error)
            return shim.error(err)
        }
    }

    /**
     * Creates a vaccination card on the ledger
     * @param {Objecg} stub chaincode stub
     * @param {Object} args initial arguments
     * @param {Class} thisClass verbatim
     */
    async createPassport(stub, args, thisClass) {
        console.info(' --- Started createPassport --- ')
        let passport = {}

        passport.id = args[0]
        // Check if the vaccination card already exists
        let vaccinationCardState = await stub.getState(passport.id)
        if (vaccinationCardState.toString()) {
            throw new Error(' --- Card already exists ---')
        }
        passport.firstName = args[1]
        passport.lastName = args[2]
        passport.dob = args[3]
        passport.s3URL = args[4]
        passport.patientNumber = args[5]
        passport.country = args[6]
        passport.dynamoHash = args[7]
        passport.validated = ValidationStatus.notValidated
        passport.vaxStatus = VaccinationStatus.notVaccinated

        // Save to state
        await stub.putState(passport.id, Buffer.from(JSON.stringify(passport)))
        // Save an index for faster retrieval
        let indexName = 'country~id'
        let countryIdIndexKey = await stub.createCompositeKey(indexName, [passport.country, passport.id])
        await stub.putState(countryIdIndexKey, Buffer.from('\u0000'))
        console.info(' --- Ended createVaccinationPassport ---')
    }

    /**
     * Reads Passport state
     * @param {*} stub chaincode stub
     * @param {*} args arguments
     * @param {*} thisClass verbatim
     */
    async readPassport(stub, args, thisClass) {
        console.info(' --- Started readPassport --- ')
        // Input Validation
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments, expecting ID')
        }
        // Get and Validate ID
        let ID = args[0]
        if (!ID) { throw new Error('ID must not be empty') }
        // Query the ledger
        let passportAsBytes = await stub.getState(ID)
        if (!passportAsBytes.toString()) {
            throw new Error('Passport does not exist')
        }
        console.info(' --- Ended readPassport --- ')
        return passportAsBytes
    }

    /**
     * Mutates validation status
     * @param {Object} stub shim
     * @param {Object} args arguments
     * @param {Class} thisClass verbatim 
     */
    async changeValidationStatus(stub, args, thisClass) {
        console.info(' --- Started changeValidationStatus --- ')
        let ID = args[0]
        let newStatus = args[2]
        // Query for passport
        let passportAsBytes = await stub.getState(ID)
        if (!passportAsBytes || !passportAsBytes.toString()) {
            throw new Error(' Passport does not exist')
        }
        // Create passport object
        let passport = {}
        try {
            passport = JSON.parse(passportAsBytes.toString())
        } catch (error) {
            throw new Error(error)
        }
        // Change its state
        passport.validated = newStatus
        // Write it back
        let passportJSONAsBytes = Buffer.from(JSON.stringify(passport))
        await stub.putState(ID, passportJSONAsBytes)
        console.info(' --- Ended changeValidationStatus --- ')
    }

    /**
     * Changes vaccination status
     * @param {Object} stub shim
     * @param {Object} args arguments
     * @param {Class} thisClass verbatim
     */
    async changeVaxStatus(stub, args, thisClass) {
        console.info(' --- Started changeVaxStatus --- ')
        let ID = args[0]
        let newStatus = args[2]
        // Query for passport
        let passportAsBytes = await stub.getState(ID)
        if (!passportAsBytes || !passportAsBytes.toString()) {
            throw new Error(' Passport does not exist')
        }
        // Create passport object
        let passport = {}
        try {
            passport = JSON.parse(passportAsBytes.toString())
        } catch (error) {
            throw new Error(error)
        }
        // Change its state
        passport.vaxStatus = newStatus
        // Write it back
        let passportJSONAsBytes = Buffer.from(JSON.stringify(passport))
        await stub.putState(ID, passportJSONAsBytes)
        console.info(' --- Ended changeVaxStatus --- ')
    }

    async getAllResults(iterator, isHistory) {
        let allResults = []
        while (true) {
            let res = await iterator.next()
            if (res.value && res.value.value.toString()) {
                let jsonRes = {}
                console.log(res.value.value.toString('utf8'))
                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.tx_id
                    jsonRes.Timestamp = res.value.timestamp
                    jsonRes.IsDelete = res.value.is_delete.toString()
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'))
                    } catch (err) {
                        console.error(err)
                        jsonRes.Value = res.value.value.toString('utf8')
                    }
                } else {
                    jsonRes.Key = res.value.key
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'))
                    } catch (err) {
                        console.error(err)
                        jsonRes.Value = res.value.value.toString('utf8')
                    }
                }
                allResults.push(jsonRes)
            }
            if (res.done) {
                console.log('end of data')
                await iterator.close()
                return allResults
            }
        }
    }

    /**
     * Gets complete history for passport
     * @param {Object} stub Shim
     * @param {Object} args Method's Argument
     * @param {Class} thisClass verbatim
     */
    async getHistoryForPassport(stub, args, thisClass) {
        if (args.length < 1) {
            throw new Error('Incorrect number of arguments, expected one')
        }
        // Get the passport
        let ID = args[0]
        console.info(' --- Started getHistoryForPassport --- ')
        let resultsIterator = await stub.getHistoryForKey(ID)
        let method = thisClass['getAllResults']
        let results = await method(resultsIterator, true)
        return Buffer.from(JSON.stringify(results))
    }
}

shim.start(new Chaincode())