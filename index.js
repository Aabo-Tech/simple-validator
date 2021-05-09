/**
 * Aabo Technologies 2021
 * Maintained by Fernando Martin Garcia Del Angel
 * Built on: May 9th, 2021
 */

'use strict'
const shim = require('fabric-shim')
const util = require('util')

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
}

shim.start(new Chaincode())