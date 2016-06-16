
var winston = require( 'pelias-logger' ).get( 'dbclient' );
var _ = require('lodash');

var max_retries = 5;

function wrapper( client ){
  function transaction( batch, cb ){

    var payload = [];

    if (batch.merge) { // merge mode. Read in first existing docs with the same ids
      // set up mget call params
      batch._slots.forEach( function( task ){
        payload.push( task.cmd.index );
      });
      var mgetParam = {
        body: {
          docs: payload
        }
      };
      if (batch.mergeFields) { // optional
        mgetParam._source = batch.mergeFields;
      }
      client.mget(mgetParam, function(error, response) {
        // major error
        if( error ){
          winston.error( 'esclient error', error );
        }
        if( response && response.docs ) {
          response.docs.forEach( function( doc, i ){
            if (doc.found) {
              var task = batch._slots[i];
              // merge. New data overrules old doc
              task.data = _.merge({}, doc._source, task.data);

              // a bit clumsy way to avoid dependency to pelias document
              var from = batch.mergeAssignFrom;
              if (from) {
                var to = batch.mergeAssignTo;
                for (var j=0; j<from.length; j++) {
                  task.data[to[j]] = task.data[from[j]];
                }
              }
            }
          });
        }
        // proceed to indexing
        batch.merge = false;
        return transaction( batch, cb );
      });
    } else {

      // reached max retries
      if( batch.retries >= max_retries ){
        return cb( 'reached max retries' );
      }

      // map task object to bulk index format
      batch._slots.forEach( function( task ){
        // filter only tasks that havn't been saved already
        if( task.status > 201 ){
          payload.push( task.cmd, task.data );
        }
      });

      // invalid bulk body length
      // @optimistic this should never happen
      if( !payload.length ){
        var errMsg = 'invalid bulk payload length. Payload received: ' +
            JSON.stringify( payload, null, 2 );
        return cb( errMsg );
      }

      // perform bulk operation
      client.bulk( { body: payload }, function( err, resp ){

        // major error
        if( err ){
          winston.error( 'esclient error', err );
          batch.status = 500;
        }

        // response does not contain items
        if( !resp || !resp.items ){
          winston.error( 'invalid resp from es bulk index operation' );
          batch.status = 500;
        }

        // update batch items with response status
        else {

          // console.log( resp.items.length, batch._slots.length, payload.length );

          resp.items.forEach( function( item, i ){

            var action = item.hasOwnProperty('create') ? item.create : item.index;

            var task = batch._slots[i];
            batch._slots[i].status = parseInt( action.status, 10 ) || 888;
            // console.log( 'set task status', task.status, JSON.stringify( action, null, 2 ) );

            if( task.status > 201 ){
              winston.error( '[' + action.status + ']', action.error );
            }
            // else {
            //   delete task.cmd; // reclaim memory
            //   delete task.data; // reclaim memory
            // }

            // set batch status to highest response code
            if( batch.status === 999 || task.status > batch.status ){
              batch.status = task.status;
            }
          });
        }

        // retry batch
        if( batch.status > 201 ){
          batch.retries++;
          winston.info( 'retrying batch', '[' + batch.status + ']' );
          return transaction( batch, cb );
        }

        // done done
        return cb( undefined );

      });

      // reclaim memory
      payload = undefined;
    }
  }
  return transaction;

}

module.exports = wrapper;
