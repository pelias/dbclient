const pelias_logger = require( 'pelias-logger' );

var max_retries = 5;

function wrapper( client, parent_logger ){

  const logger = parent_logger ? parent_logger : pelias_logger.get('dbclient');

  function transaction( batch, cb ){

    // reached max retries
    if( batch.retries >= max_retries ){
      return cb( 'reached max retries' );
    }

    // reserve some memory for the bulk index body, and remember which
    // slot each payload entry belongs to, since on a retry this list is
    // a subset of batch._slots and the two are no longer index-aligned
    var payload = [];
    var slotIndexes = [];

    // map task object to bulk index format
    batch._slots.forEach( function( task, index ){
      // filter only tasks that havn't been saved already
      if( task.status > 201 ){
        payload.push( task.cmd, task.data );
        slotIndexes.push( index );
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
        logger.error( 'esclient error', err );
        batch.status = 500;
      }

      // response does not contain items
      if( !resp || !resp.items ){
        logger.error( 'invalid resp from es bulk index operation' );
        batch.status = 500;
      }

      // update batch items with response status
      else {

        resp.items.forEach( function( item, i ){

          var action = item.hasOwnProperty('create') ? item.create : item.index;

          // map the response item back to its original slot, since on a
          // retry slotIndexes[i] may not equal i
          var slotIndex = slotIndexes[i];
          var task = batch._slots[slotIndex];
          task.status = parseInt( action.status, 10 ) || 888;

          if( task.status > 201 ){
            logger.error( '[' + action.status + ']', action.error );
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
        logger.info( 'retrying batch', '[' + batch.status + ']' );
        return transaction( batch, cb );
      }

      // done done
      return cb( undefined );

    });

    // reclaim memory
    payload = undefined;
  }

  return transaction;

}

module.exports = wrapper;
