const _ = require('lodash');
const peliasConfig = require('pelias-config');

/**
 * builds a tree of the dot-separated field paths to omit, eg.
 * ['popularity', 'parent.county_a'] becomes { popularity: true, parent: { county_a: true } }
 * so that omitDoc only has to walk (and clone) the parts of a document that are affected.
 */
function buildOmitTree(fields) {
  const tree = {};
  fields.forEach((field) => {
    const parts = field.split('.');
    const leaf = parts.pop();
    const node = parts.reduce((node, part) => (node[part] = node[part] || {}), tree);
    node[leaf] = node[leaf] || true;
  });
  return tree;
}

/**
 * returns a copy of `doc` with the fields described by `tree` removed.
 *
 * only objects on the path to an omitted field are cloned, so objects shared
 * with the source document (eg. `parent` from pelias-model) that are not
 * affected are left untouched, and the source document itself is never mutated.
 */
function omitTree(doc, tree) {
  if (doc === null || typeof doc !== 'object') {
    return doc;
  }

  const out = Array.isArray(doc) ? doc.slice() : Object.assign({}, doc);

  Object.keys(tree).forEach((key) => {
    if (!(key in out)) { return; }

    const node = tree[key];
    if (node === true) {
      delete out[key];
    } else {
      out[key] = omitTree(out[key], node);
    }
  });

  return out;
}

/**
 * returns a function which removes fields listed in `schema.excludedFields`
 * from a document, since they are absent from the Elasticsearch mapping.
 */
function excludeFields(fields) {
  if (!fields) {
    fields = _.get(peliasConfig.generate(), 'schema.excludedFields', []);
  }

  if (_.isEmpty(fields)) {
    return _.identity;
  }

  const tree = buildOmitTree(fields);
  return (doc) => omitTree(doc, tree);
}

module.exports = excludeFields;
