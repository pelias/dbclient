#!/bin/bash

curl -XDELETE 'localhost:9200/test?pretty=1';
curl -XPUT 'localhost:9200/test?pretty=1';


curl -XPUT 'localhost:9200/test/node/_mapping?pretty=1' -d '{
  "node" : {
    "properties" : {
      "geo" : {
        "type": "geo_point",
        "lat_lon": true,
        "geohash": true,
        "geohash_prefix": true,
        "geohash_precision": 20,
        "fielddata" : {
          "format" : "compressed",
          "precision" : "3m"
        }       
      }
    }
  }
}';