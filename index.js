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
    async createVaccinationPassport(stub, args, thisClass) {
        console.info(' --- Started createVaccinationPassport --- ')
        let vaccinationCard = {}

        vaccinationCard.id = args[0]
        // Check if the vaccination card already exists
        let vaccinationCardState = await stub.getState(vaccinationCard.id) 
        if (vaccinationCardState.toString()) {
            throw new Error(' --- Card already exists ---')
        }
        vaccinationCard.firstName = args[1]
        vaccinationCard.lastName = args[2]
        vaccinationCard.dob = args[3]
        vaccinationCard.s3URL = args[4]
        vaccinationCard.patientNumber = args[5]
        vaccinationCard.country = args[6]
        vaccinationCard.validated = ValidationStatus.notValidated

        // Save to state
        await stub.putState(vaccinationCard.id, Buffer.from(JSON.stringify(vaccinationCard)))
        // Save an index for faster retrieval
        let indexName = 'country~id'
        let countryIdIndexKey = await stub.createCompositeKey(indexName, [vaccinationCard.country, vaccinationCard.id])
        await stub.putState(countryIdIndexKey, Buffer.from('\u0000'))
        console.info(' --- end createVaccinationPassport ---')
    }

}

shim.start(new Chaincode())