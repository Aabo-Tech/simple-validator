/**
 * Aabo Technologies 2021
 * Maintained by Fernando Martin Garcia Del Angel
 * Built on: May 9th, 2021
 */

'use strict'
const shim = require('fabric-shim')
const util = require('util')

const VaccinationStatus  = {
    notVaccinated = "NOTVACCINATED",
    firstDose = "FIRSTDOSE",
    fullyVaccinated = "FULLYVACCINATED",
    reinforcement = "REINFORCEMENT"
}

const ValidationStatus =  {
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
        console.info('Transaction ID:',stub.getTxId())
        console.info(util.format('Args: %j', stub.getArgs()))
        // Get the expected method and execute it
        let ret = stub.getFunctionAndParameters()
        let methodToExecute = this[ret.fcn]
        if (!methodToExecute) { throw new Error('Received unknown method with name:',methodToExecute)}
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
        passport.validated = ValidationStatus.notValidated

        // Save to state
        await stub.putState(passport.id, Buffer.from(JSON.stringify(passport)))
        // Save an index for faster retrieval
        let indexName = 'country~id'
        let countryIdIndexKey = await stub.createCompositeKey(indexName, [passport.country, passport.id])
        await stub.putState(countryIdIndexKey, Buffer.from('\u0000'))
        console.info(' --- end createVaccinationPassport ---')
    }

    /**
     * 
     * @param {*} stub 
     * @param {*} args 
     * @param {*} thisClass 
     */
    async readPassport(stub, args, thisClass) {
        // Input Validation
        if(args.length != 1) {
            throw new Error('Incorrect number of arguments, expecting ID')
        }
        // Get and Validate ID
        let ID = args[0]
        if (!ID) { throw new Error('ID must not be empty')}
        // Query the ledger
        let passportAsBytes = await stub.getState(ID)
        if(!passportAsBytes.toString()) {
            throw new Error('Passport does not exist')
        }
        return passportAsBytes
    }

}

shim.start(new Chaincode())