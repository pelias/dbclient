const pelias_logger = require( 'pelias-logger' );
const config = require('./config');

// exponential backoff with jitter, so a batch of retries doesn't all
// hammer elasticsearch again at the exact same moment
function backoff( retries, base_delay, max_delay ){
  var delay = Math.min( max_delay, base_delay * Math.pow( 2, retries ) );
  return Math.round( delay * ( 0.5 + Math.random() * 0.5 ) );
}

function wrapper( client, parent_logger ){

  const logger = parent_logger ? parent_logger : pelias_logger.get('dbclient');
  const max_retries = config.get('retry.max', 5);
  const base_delay = config.get('retry.baseDelay', 1000);
  const max_delay = config.get('retry.maxDelay', 30000);

  function transaction( batch, cb ){

    // reached max retries
    if( batch.retries >= max_retries ){
      var stillFailing = batch._slots.filter( function( task ){ return task.status > 201; } );
      var ids = stillFailing.map( function( task ){ return task.cmd.index._id; } );
      logger.error( 'reached max retries, dropping batch', '[' + batch.status + ']', ids );
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
        });

        // batch status is the highest status across ALL slots, recomputed
        // fresh each round - a slot that succeeds on retry must be able to
        // bring the batch status back down, otherwise a batch that has
        // fully succeeded keeps retrying forever because of a status seen
        // in an earlier round
        batch.status = batch._slots.reduce( function( max, task ){
          return task.status > max ? task.status : max;
        }, 0 );
      }

      // retry batch
      if( batch.status > 201 ){
        var delay = backoff( batch.retries, base_delay, max_delay );
        batch.retries++;
        logger.info( 'retrying batch', '[' + batch.status + ']', 'in ' + delay + 'ms' );
        return setTimeout( function(){ transaction( batch, cb ); }, delay );
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
