var Validator = require('jsonschema').Validator;
var v = new Validator();

const schema = {
    getCompanySchema: (body) => {
        let bodyschema = {
            "type": "object",
            "required": ["company_id"],
            "properties": {
                "company_id": {
                    "type": "integer",
                    "minimum": 1000000000,
                    "maximum": 9999999999,
                }
            }
            
        }
        var r = (v.validate(body, bodyschema));
        console.log( r.errors)
        return r.errors.map(res => res.path[0]);
    },

    checkQueueSchema: (body) => {
        let bodyschema = {
            "type": "object",
            "required": ["queue_id", "company_id"],
            "properties": {
                "queue_id": {
                    "type": "string",
                    "minLength": 10,
                    "maxLength": 10,
                },
                "company_id": {
                    "type": "integer",
                    "minimum": 1000000000,
                    "maximum": 9999999999,
                }
            }
            
        }
        var r = (v.validate(body, bodyschema));
        console.log( r.errors)
        return r.errors.map(res => res.path[0]);
    },

    updateQueueSchema: (body) => {
        let bodyschema = {
            "type": "object",
            "required": ["queue_id","status"],
            "properties": {
                "queue_id": {
                    "type": "string",
                    "minLength": 10,
                    "maxLength": 10,
                },
                "status": {
                    "type": "string",
                    "enum": ["ACTIVATE", "DEACTIVATE"]
                }
            }
        }
        var r = (v.validate(body, bodyschema));
        console.log( r.errors)
        return r.errors.map(res => res.path[0]);
    },

    serverAvailableSchema: (body) => {
        let bodyschema = {
            "type": "object",
            "required": ["queue_id"],
            "properties": {
                "queue_id": {
                    "type": "string",
                    "minLength": 10,
                    "maxLength": 10,
                },
            }
        }
        var r = (v.validate(body, bodyschema));
        console.log( r.errors)
        return r.errors.map(res => res.path[0]);
    },

    joinQueueSchema: (body) => {
        let bodyschema = {
            "type" : "object",
            "required" : ["customer_id", "queue_id"],
            "properties" : {
                "customer_id" : {
                    "type" : "integer",
                    "minimum" : 1000000000,
                    "maximum" : 9999999999,
                },
                "queue_id" : {
                    "type" : "string",
                    "minLength" : 10,
                    "maxLength" : 10,
                }
            }
        }
        var r = (v.validate(body, bodyschema));
        console.log(r.errors)
        return r.errors.map(res => res.path[0]);
    },

    customerCheckQueueSchema: (body) => {
        let bodyschema = {
            "type" : "object",
            "required" : ["queue_id"],
            "properties" : {
                "customer_id" : {
                    "type" : "integer",
                    "minimum" : 1000000000,
                    "maximum" : 9999999999,
                },
                "queue_id" : {
                    "type" : "string",
                    "minLength" : 10,
                    "maxLength" : 10,
                }
            }
        }
        var r = (v.validate(body, bodyschema));
        console.log(r.errors)
        return r.errors.map(res => res.path[0]);
    },

    getArrivalSchema: (body) => {
        let bodyschema = {
            "type" : "object",
            "required" : ["queue_id", "duration"],
            "properties" : {
                "queue_id" : {
                    "type" : "string",
                    "minLength" : 10,
                    "maxLength" : 10,
                },
                "duration" : {
                    "type" : "integer",
                    "minimum": 1,
                    "maximum": 1440,
                },
            }
        }
        var r = (v.validate(body, bodyschema));
        console.log(r.errors)
        return r.errors.map(res => res.path[0]);
    }
    
}


module.exports = {schema};