const express = require('express'); // DO NOT DELETE
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const app = express(); // DO NOT DELETE

//imports
const {company, customer, reset} = require("./database.js");
const {schema} = require("./schema.js");

//middleware
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cors());

/**
 * ========================== RESET API =========================
*/
app.post("/reset", (req,res,next) => {
    reset
        .resetSchema()
        .then(() => {res.status(200).end();})
        .catch((err) => {next(err);})
})

/**
 * ========================== COMPANY =========================
*/

app.get("/company/arrival_rate", (req, res, next) => {
    let queue_id = req.query.queue_id;
    let from = req.query.from;
    let duration = req.query.duration;
    let datePattern = new RegExp(/^(\d{4})-0?(\d+)-0?(\d+)[T ]0?(\d+):0?(\d+):0?(\d+)$/);
    let isDateValid = datePattern.test(from);

    let parameters = {
        "queue_id" : queue_id,
        "duration" : parseInt(duration)
    }

    let validateRS = schema.getArrivalSchema(parameters); 
    let err;
    
    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    } 

    if(isDateValid == false) {
        let errorMessage = "Starting timestamp must be in ISO9601 format"
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    } 

    company
        .getArrival(queue_id, from, duration)
        .then((result) => {
            console.log(result.length);
            res.status(200).send(result);
        })
        .catch((err) => {next(err)})
})

app.get("/company/queue", (req, res, next) => {
    let companyid = req.query.company_id;
    let validateRS = schema.getCompanySchema({ company_id : parseInt(companyid)});
    let err;

    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_COMPANY_ID";
        next(err);
        return;
    }
    
    company
        .getQueue(companyid)
        .then((result) => {
            console.log("Success!")
            console.log(result)
            res.json(result);
        })
        .catch(err => {console.log(err); next(err);})
})

app.post("/company/queue", (req, res, next) => {
    let queue_id = req.body.queue_id;
    let company_id = req.body.company_id;
    let validateRS = schema.checkQueueSchema(req.body);
    let err;
       
    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    }
    
    company
        .createQueue(queue_id, company_id)
        .then(() => {
            console.log("Success!")
            res.status(201).end();
        })
        .catch((err) => {next(err);})
})

app.put("/company/queue", (req, res, next) => {
    let status = req.body.status;
    let queue_id = req.query.queue_id;
    let err;
    let parameters = {
        "queue_id": queue_id, 
        "status": status
    }

    let validateRS = schema.updateQueueSchema(parameters);

    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    }
    
    company
        .updateQueue(status, queue_id)
        .then(() => {
            console.log("Success!");
            res.status(200).end();
        })
        .catch((err) => {next(err);})
})

app.put("/company/server", (req, res, next) => {
    let queue_id = req.body.queue_id;
    queue_id = queue_id.toLowerCase();
    let validateRS = schema.serverAvailableSchema(req.body);
    let err;
    
    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    }
    company
        .serverAvailable(queue_id)
        .then((result) => {
           res.status(200).json({
               "customer_id": result.customerID
           })
        })
        .catch((err) => {next(err);})
})


/**
 * ========================== CUSTOMER =========================
*/
app.get("/customer/queue", (req, res, next) => {
    let queue_id = req.query.queue_id;
    let customer_id;
    let err;
    let parameters;

    if(req.query.customer_id) {
        customer_id = parseInt(req.query.customer_id);

        parameters = {
            "customer_id" : customer_id,
            "queue_id" : queue_id
        }
    } else {
        parameters = {
            "queue_id" : queue_id
        }
    }
    
    let validateRS = schema.customerCheckQueueSchema(parameters);

    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
    }

    customer
        .checkQueue(queue_id, customer_id)
        .then(result => {
            res.status(200);
            res.json(result.resultSet);
        })
        .catch(err => {console.log(err); next(err);});
});

app.post("/customer/queue", (req, res, next) => {
    let customer_id = req.body.customer_id;
    let queue_id = req.body.queue_id;
    let err;

    let validateRS = schema.joinQueueSchema(req.body);

    if(validateRS.length > 0) {
        let errorMessage = validateRS.map(values => "Invalid " + values).toString();
        err = new Error(errorMessage);
        err.statusCode = 400;
        err.code = "INVALID_JSON_BODY";
        next(err);
        return;
    }

    customer
        .joinQueue(customer_id, queue_id)
        .then(() => res.sendStatus(200).end())
        .catch(err => {console.log(err); next(err);});
});

/**
 * ========================== UTILS =========================
*/

//incorrect route handler
app.get('*', function(req, res, next) {
    let err = new Error('Not found');
    err.statusCode = 404;
    err.code = "UNEXPECTED_ERROR";
    next(err);
});


//custom error handler
app.use(function(err, req, res, next){
    if (!err.statusCode) {
        err.statusCode = 500; 
        err.message = "Unable to establish connection with database"
        err.code = "UNEXPECTED_ERROR"
    }

    res.status(err.statusCode).json({
        "error": err.message,
        "code": err.code
    });
})
    

function tearDown() {
    // DO NOT DELETE
    return db.closeDatabaseConnections();
}

module.exports = { app, tearDown }; // DO NOT DELETE
