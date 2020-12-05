const { queue, until } = require('async');
const {Client} = require('pg')
const moment = require('moment')

const client = new Client({
  user: 'rsnwfrpe',
  host: 'lallah.db.elephantsql.com',
  database: 'rsnwfrpe',
  password: 'M06gGFc9abtiSuJxlayq9jKe7mtB22h2',
  port: 5432,
})

client.connect();

const customer = {
  checkQueue: (queue_id, customer_id = undefined) => {
    queue_id = queue_id.toLowerCase();
    let sql1 = {
      text : `SELECT queue_status FROM queue_list WHERE queue_id = $1`,
      values : [queue_id]
    }
    let sql2;

    if(customer_id) sql2 = `(select count(*) FROM ${queue_id} WHERE customer_status = 0) UNION all (SELECT count(*) FROM ${queue_id} WHERE id < (select id from ${queue_id} where customer_id = ${customer_id} and customer_status = 0) AND customer_status = 0) UNION all (select customer_status from ${queue_id} where customer_id = ${customer_id});`
    else sql2 =  `SELECT count(*) from ${queue_id} WHERE customer_status = 0;`;

    return new Promise((resolve, reject) => {
      let resultSet;
      let queueStatus;
      client 
        .query("begin")
        .then(() => {return client.query(sql1)})
        .then(res => {
          if(res.rowCount <= 0) {
            let err = new Error(`Queue ID ${queue_id} not found`);
            err.statusCode = 404;
            err.code = "UNKNOWN_QUEUE";
            throw err;
          } 
          
         res.rows[0].queue_status == "DEACTIVATE" ? queueStatus = "INACTIVE" : queueStatus = "ACTIVE";

        })
        .then(() => {return client.query(sql2)})
        .then(res => {
          console.log(res.rows);
          if(res.rowCount <= 2){ 
            resultSet = {
              total : res.rows[0].count,
              ahead : -1,
              status : queueStatus
            }
          } 

          else {
            resultSet = {
              total : res.rows[0].count,
              ahead : res.rows[1].count,
              status : queueStatus
            }
          }
          return client.query("commit")
        })
        .then(res => {
          res["resultSet"] = resultSet;
          resolve(res);
        })
        .catch(err => {
          client.query("rollback");
          reject(err);
        })
    })
  },

  joinQueue: (customer_id, queue_id) => {
    queue_id = queue_id.toLowerCase();
    let sql1 = {
      text: "SELECT queue_status FROM queue_list WHERE queue_id = $1",
      values: [queue_id]
    }
    let sql2 = {
      text: `SELECT customer_id FROM ${queue_id} WHERE customer_id = $1 AND customer_status = 0`,
      values: [customer_id]
    }

    let sql3 = {
      text: `INSERT INTO ${queue_id}(customer_id) VALUES($1)`,
      values: [customer_id]
    }

    return new Promise((resolve, reject) => {
      client
        .query("begin")
        .then(() => {return client.query(sql1)})
        .then(res => {
          if(res.rowCount <= 0) {
            let err = new Error(`Queue ID ${queue_id} not found`);
            err.statusCode = 404;
            err.code = "UNKNOWN_QUEUE";
            throw err;
          } 
          
          if(res.rows[0].queue_status == "DEACTIVATE"){
            let err = new Error(`Queue ${queue_id} is inactive`);
            err.statusCode = 422;
            err.code = "INACTIVE_QUEUE";
            throw err;
          }
        })
        .then(() => {return client.query(sql2)})
        .then((res) => {
          if(res.rowCount > 0) {
            let err = new Error(`Customer ${customer_id} is already in queue ${queue_id}`);
            err.statusCode = 422;
            err.code = "INACTIVE_QUEUE";
            throw err;
          }  
        })
        .then(() => {return client.query(sql3)})
        .then(() => {return client.query("commit");})
        .then((res) => {
          console.log("Completed")
          resolve(res);
        })
        .catch(err => {
          client.query("rollback");
          reject(err);
        })
    })
  }
}

const company = {
  getArrival: function(queue_id, fromDate, duration) {
    queue_id = queue_id.toLowerCase();
    let notOffsetUntilDate = moment(fromDate).add(duration, 'minute');
    let parser = moment.parseZone(notOffsetUntilDate);
    let untilDate = parser.format('YYYY-MM-DDTHH:mm:ss'); 
    let sql = `select queue_at, count(queue_at) from ${queue_id} where queue_at between '${fromDate}' and '${untilDate}' group by queue_at order by queue_at ASC`;

    return new Promise((resolve, reject) => {
      console.log(sql);
      client
      .query(sql)
      .then((result) => {
        let resultSet = [];
        result.rows.forEach(element => {
          let notOffsetTimestamp = element.queue_at;
          var timestamp = moment(notOffsetTimestamp).local().format('YYYY-MM-DDTHH:mm:ss');
          result = {
            timestamp: timestamp,
            count: element.count
          }
          resultSet.push(result);
        })
        resultSet = createResultArr(fromDate, resultSet, untilDate);
        resolve(resultSet);
      })
      .catch((err) => {
        console.log(err);
        if(err.code == "42P01") { 
          err = new Error(`Queue ID ${queue_id} not found`);
          err.statusCode = 404;
          err.code = "UNKNOWN_QUEUE";
        }
        return reject(err);
      })
    })
  },

  createQueue: function(queue_id, company_id) {
    queue_id = queue_id.toLowerCase();
    let sql1 = `INSERT INTO queue_list (queue_id, company_id) VALUES ($1, $2);`;
    let sql2 = 
    `CREATE TABLE ${queue_id} (
    id int4 NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1000 INCREMENT BY 1),
    customer_id int8 NOT NULL,
    customer_status int4 NOT NULL DEFAULT 0,
    queue_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
    );`

    return new Promise((resolve, reject) => {
      client
        .query("begin")
        .then(() => {return client.query(sql1, [queue_id, company_id]);})
        .then(() => {return client.query(sql2);})
        .then(() => {return client.query("commit");})
        .then((res) => {
          console.log("Completed")
          resolve(res);
        })
        .catch((err) => {
          if(err.code == "23505") { 
            err = new Error(`Queue ${queue_id} already exists`);
            err.statusCode = 422;
            err.code = "QUEUE_EXISTS";
          }

          client.query("rollback");
          reject(err);
        })
    })
  },

  updateQueue: function(status, queue_id) {
    queue_id = queue_id.toLowerCase();
    let sql = `UPDATE queue_list SET queue_status=$1 WHERE queue_id= $2;`

    return new Promise((resolve, reject) => {
      client
        .query(sql, [status, queue_id])
        .then((res) => {
          if(res.rowCount < 1){
            let err = new Error(`Queue ID ${queue_id} not found`);
            err.statusCode = 404;
            err.code = "UNKNOWN_QUEUE";
            throw err;
          }
          console.log("Completed")
          resolve(res);
        })
        .catch((err) => {reject(err);})
    })
  },

  serverAvailable: function(queue_id) {
    queue_id = queue_id.toLowerCase();
    let sql1 = `SELECT id, customer_id FROM ${queue_id} WHERE customer_status = 0 ORDER BY queue_at ASC LIMIT 1;`;
    let sql2 = `UPDATE ${queue_id} SET customer_status= 1 WHERE id= $1;`
    let resultSet = {};

    return new Promise((resolve, reject) => {
      client
        .query("begin")
        .then(() => {return client.query(sql1);})
        .then((res) => {
          if (res.rows[0] === undefined) {
            resultSet ={"id": 0, "customer_id": 0}
          }
          else {
            resultSet = res.rows[0];
          }
          return client.query(sql2, [resultSet.id])
        })
        .then(() => {
          return client.query("commit");
        })
        .then((res) => {
          res['customerID'] = resultSet.customer_id;
          console.log("Completed")
          resolve(res);
        })
        .catch((err) => {
          if(err.code == "42P01") { 
            err = new Error(`Queue ID ${queue_id} not found`);
            err.statusCode = 404;
            err.code = "UNKNOWN_QUEUE";
          }
          client.query("rollback");
          reject(err);
        })
    })
  }

}

const reset = {
  resetSchema: function() {
    let sql1 = `SELECT queue_id FROM queue_list;`
    let sql2 = "DROP TABLE "
    let sql3 = "TRUNCATE TABLE queue_list;"
    return new Promise((resolve, reject) => {
      client
        .query("begin")
        .then(() => {return client.query(sql1);})
        .then((res) => {
          sql2 += res.rows.map(element => element.queue_id).toString() + ";";
          return client.query(sql2);
        })
        .then(() => {return client.query(sql3);})
        .then(() => {return client.query("commit");})
        .then((res) => {
          console.log("Completed")
          resolve(res);
        })
        .catch((err) => {
          client.query("rollback");
          reject(err);
        })
    })
  }
}

function createResultArr(fromDate, arr, untilDate) {
  let resultArr = [];
  fromDate = new Date(fromDate);
  untilDate = new Date(untilDate);
  let epochFromDate = fromDate.getTime() / 1000; 
  let epochUntilDate = untilDate.getTime() / 1000; 
  
  for(epochFromDate; epochFromDate < epochUntilDate; epochFromDate++) {
    var count = 0;
    for (let i = 0; i < arr.length; i++) {
      let arrDate = arr[i].timestamp;
      arrDate = new Date(arrDate);
      let epochArrDate = Math.floor(arrDate.getTime() / 1000);
      
      if(epochArrDate == epochFromDate) {
        count = arr[i].count;
        break;
      }
    }
    let resultSet = {
      timestamp: epochFromDate,
      count: count
    }
    resultArr.push(resultSet);
  }
  return resultArr;
}

module.exports = {
  customer,
  company,
  reset,
};
