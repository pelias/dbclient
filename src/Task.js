
function Task( record ){
  this.status = 999;
  this.data = record.data;
  this.cmd = {
    index: {
      _index: record._index,
      _id: record._id
    }
  };
}

module.exports = Task;
