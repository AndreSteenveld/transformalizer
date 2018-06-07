'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = createTransformalizer;

var _utils = require('./utils');

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

/**
 * Transformalizer factory function.
 * @param  {Object} [baseOptions={}]
 * @return {Object} transformalizer
 */
function createTransformalizer() {
  var baseOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var registry = {};

  /**
   * Register a schema
   * @param  {Object} args
   * @param  {String} args.name - schema name/id
   * @param  {Object} args.schema - schema definition
   * @param  {Object} [args.options={}] - schema options to be merged in to transform options
   * @return {Undefined}
   */
  function register(_ref) {
    var name = _ref.name,
        schema = _ref.schema,
        schemaOptions = _ref.options;

    if (!(0, _utils.isString)(name)) {
      throw new Error('Invalid "name" Property (non string)');
    }
    registry[name] = {
      schema: (0, _utils.validateSchema)({ name: name, schema: schema }),
      options: schemaOptions
    };
    return undefined;
  }

  /**
   * Get a schema from the registry by name
   * @param  {String} options.name - schema name/id
   * @return {Object}              - schema
   */
  function getSchema(_ref2) {
    var name = _ref2.name;

    return registry[name];
  }

  /**
   * Transform raw data into a valid JSON API document
   * @param  {Object} args
   * @param  {String} args.name - the top level schema name
   * @param  {Object|Object[]} args.source - a single source object or an aray of source objects
   * @param  {Object} [options={}] - function level options
   * @return {Object} document
   */
  function transform(_ref3) {
    var name = _ref3.name,
        source = _ref3.source,
        opts = _ref3.options;

    if (!(0, _utils.isString)(name)) {
      throw new _utils.TransformError('Invalid "name" Property (non string) actual type: \'' + (typeof name === 'undefined' ? 'undefined' : _typeof(name)) + '\'', { name: name, source: source, options: opts });
    }
    var docSchema = registry[name];
    if (!docSchema) {
      throw new _utils.TransformError('Missing Schema: ' + name, { name: name, source: source, options: opts });
    }
    var options = Object.assign({}, baseOptions, opts);
    var include = createInclude({ source: source, options: options });
    var data = transformSource({ docSchema: docSchema, source: source, options: options, include: include });
    var included = include.get();
    var document = {
      jsonapi: {
        version: '1.0'
      }
      // add top level properties if available
    };var topLevel = ['links', 'meta'];
    topLevel.forEach(function (prop) {
      if (docSchema.schema[prop]) {
        var result = docSchema.schema[prop]({ source: source, options: options, data: data, included: included });
        if ((0, _utils.isObject)(result)) {
          document[prop] = result;
        }
      }
    });
    document.data = data;
    if (included.length) {
      document.included = included;
    }
    return document;
  }

  /**
   * Transform source into the "primary data" of the document
   * @param  {Object} args
   * @param  {Object} args.docSchema - the top level schema used for transforming the document
   * @param  {Object|Object[]} args.source - source data
   * @param  {Object} args.options - function level options
   * @param  {Object} args.include - include object
   * @return {Object|Object[]}
   */
  function transformSource(args) {
    var docSchema = args.docSchema,
        source = args.source,
        opts = args.options,
        include = args.include;

    if (Array.isArray(source)) {
      return source.map(function (data) {
        return transformData({ docSchema: docSchema, source: source, options: opts, data: data, include: include });
      });
    }
    return transformData({ docSchema: docSchema, source: source, options: opts, data: source, include: include });
  }

  /**
   * Transform a single source object into a valid resource object
   * @param  {Object} arg
   * @param  {Object} args.docSchema - the top level schema used for transforming the document
   * @param  {Object|Object[]} args.source - source data
   * @param  {Object} args.options - function level options
   * @param  {Object} args.data - current source object
   * @param  {Object} args.include - include object
   * @param  {String} [args._type] - (for use by transformRelationshipData)
   * @param  {String} [args._id] - (for use by transformRelationshipData)
   * @return {Object}
   */
  function transformData(args) {
    var docSchema = args.docSchema,
        source = args.source,
        options = args.options,
        data = args.data,
        include = args.include,
        _type = args._type,
        _id = args._id;
    // call dataSchema if defined and switch contexts if necessary

    var dataSchema = docSchema;
    if ((0, _utils.isFunction)(docSchema.schema.data.dataSchema)) {
      var name = docSchema.schema.data.dataSchema({ source: source, data: data, options: options });
      if (name !== docSchema.name) {
        dataSchema = registry[name];
        if (!dataSchema) {
          throw new Error('Missing Schema: ' + name);
        }
      }
    }
    var state = {};
    var params = { dataSchema: dataSchema, source: source, options: options, data: data, state: state };
    var type = params.type = _type || getType(params);
    var id = params.id = _id || getId(params);
    var attributes = params.attributes = getAttributes(params);
    var relationships = params.relationships = getRelationships(_extends({ include: include }, params));
    var links = params.links = getLinks(params);
    var meta = params.meta = getMeta(params);
    // build resulting resource
    var resource = { type: type, id: id };
    if ((0, _utils.isObject)(attributes)) {
      resource.attributes = attributes;
    }
    if ((0, _utils.isObject)(relationships)) {
      resource.relationships = relationships;
    }
    if ((0, _utils.isObject)(meta)) {
      resource.meta = meta;
    }
    if ((0, _utils.isObject)(links)) {
      resource.links = links;
    }
    return resource;
  }

  /**
   * Get the resource type for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @return {String} type
   * @private
   */
  function getType(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var type = dataSchema.schema.data.type(others);
    if (!(0, _utils.isString)(type)) {
      throw new _utils.TransformError('Invalid type, expected string but is \'' + (typeof type === 'undefined' ? 'undefined' : _typeof(type)) + '\'. ', args);
    }
    return type;
  }

  /**
   * Get the resource id for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @return {String} id
   * @private
   */
  function getId(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var id = dataSchema.schema.data.id(others);
    if (!(0, _utils.isString)(id)) {
      throw new _utils.TransformError('Invalid type, expected string but is \'' + (typeof id === 'undefined' ? 'undefined' : _typeof(id)) + '\'.', args);
    }
    return id;
  }

  /**
   * Get the resource attributes object for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @return {Object} attributes
   * @private
   */
  function getAttributes(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.attributes) {
      var attributes = dataSchema.schema.data.attributes(others);
      return attributes;
    }
    return undefined;
  }

  /**
   * Get the resource relationships object for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.include
   * @return {Object} relationships
   * @private
   */
  function getRelationships(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var relSchema = dataSchema.schema.data.relationships;
    if (relSchema) {
      var keys = Object.keys(relSchema);
      var relationships = keys.reduce(function (memo, key) {
        var fn = relSchema[key];
        var relationship = getRelationship(_extends({ fn: fn }, others));
        if ((0, _utils.isObject)(relationship)) {
          memo[key] = relationship;
        }
        return memo;
      }, {});
      if (!Object.keys(relationships).length) {
        return undefined;
      }
      return relationships;
    }
    return undefined;
  }

  /**
   * Get the resource relationship object for the current relationship of the
   * current source object
   * @param  {Object} args
   * @param  {Object} args.fn
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.include
   * @return {Object} relationship
   * @private
   */
  function getRelationship(args) {
    var fn = args.fn,
        include = args.include,
        others = _objectWithoutProperties(args, ['fn', 'include']);

    var result = fn(others);
    if (!(0, _utils.isObject)(result)) {
      return undefined;
    }
    var meta = result.meta,
        links = result.links,
        data = result.data;

    var invalidData = typeof data === 'undefined' || (typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object';
    if (!links && !meta && invalidData) {
      return undefined;
    }
    var relationship = {};
    if (!invalidData) {
      if (Array.isArray(data)) {
        relationship.data = data.map(function (item) {
          return transformRelationshipData({
            item: item,
            source: args.source,
            options: args.options,
            include: include
          });
        });
      } else if (data === null) {
        relationship.data = null;
      } else {
        relationship.data = transformRelationshipData({
          item: data,
          source: args.source,
          options: args.options,
          include: include
        });
      }
    }
    if ((0, _utils.isObject)(meta)) {
      relationship.meta = meta;
    }
    if ((0, _utils.isObject)(links)) {
      relationship.links = links;
    }
    return relationship;
  }

  /**
   * Get the data for the current relationship object for the current source
   * object
   * @param  {Object} args
   * @param  {Object} args.item - the current data item
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Function} args.include
   * @return {Object} data
   * @private
   */
  function transformRelationshipData(args) {
    var item = args.item,
        source = args.source,
        options = args.options,
        include = args.include;
    var name = item.name,
        data = item.data,
        included = item.included,
        meta = item.meta;

    if (!(0, _utils.isString)(name) || !registry[name]) {
      throw new _utils.TransformError('Missing Schema: ' + name, args);
    }
    var relSchema = registry[name];
    var type = getType({ dataSchema: relSchema, source: source, options: options, data: data });
    var id = getId({ dataSchema: relSchema, source: source, options: options, data: data });
    var result = { type: type, id: id };
    if ((0, _utils.isObject)(meta)) {
      result.meta = meta;
    }

    if (included === true && !include.exists({ type: type, id: id })) {
      include.markAsIncluded({ type: type, id: id });

      var resource = transformData({
        docSchema: relSchema,
        source: source,
        options: options,
        data: data,
        include: include,
        _type: type,
        _id: id
      });
      include.include(resource);
    }
    return result;
  }

  /**
   * Get the resource links for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.relationships
   * @return {Object} links
   * @private
   */
  function getLinks(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.links) {
      return dataSchema.schema.data.links(others);
    }
    return undefined;
  }

  /**
   * Get the resource meta for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.relationships
   * @param  {Object} args.links
   * @return {Object} meta
   * @private
   */
  function getMeta(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.meta) {
      return dataSchema.schema.data.meta(others);
    }
    return undefined;
  }

  /**
   * Create an include object
   * @return {Object} include
   * @private
   */
  function createInclude() {
    var included = [];
    var alreadyIncluded = {};
    return {
      /**
       * Determine whether or not a given resource has already been included
       * @param {Object} args
       * @param {String} args.type
       * @param {String} args.id
       * @return {Boolean}
       */
      exists: function exists(_ref4) {
        var type = _ref4.type,
            id = _ref4.id;

        return alreadyIncluded[type + ':' + id];
      },


      /**
       * Mark a resource as included
       * @param {Object} args
       * @param {String} args.type
       * @param {String} args.id
       * @return {Undefined}
       */
      markAsIncluded: function markAsIncluded(_ref5) {
        var type = _ref5.type,
            id = _ref5.id;

        alreadyIncluded[type + ':' + id] = true;
      },

      /**
       * Add an included resource to the included section of the document
       * @param {Object} resource
       * @return {Undefined}
       */
      include: function include(resource) {
        included.push(resource);
      },


      /**
       * Return the included array in its current state
       * @return {Object[]}
       */
      get: function get() {
        return included;
      }
    };
  }

  /**
   * Untransform a valid JSON API document into raw data
   * @param  {Object} args
   * @param  {Object} args.document - a json-api formatted document
   * @param  {Object} [options={}] - function level options
   * @return {Object[]} an array of data objects
   */
  function untransform(_ref6) {
    var document = _ref6.document,
        opts = _ref6.options;

    // validate json api document
    (0, _utils.validateJsonApiDocument)(document);

    var options = Object.assign({}, baseOptions, opts);
    var data = {};
    var resourceDataMap = [];

    if (Array.isArray(document.data)) {
      document.data.forEach(function (resource) {
        return untransformResource({ resource: resource, data: data, resourceDataMap: resourceDataMap, document: document, options: options });
      });
    } else {
      untransformResource({ resource: document.data, data: data, resourceDataMap: resourceDataMap, document: document, options: options });
    }

    var primaryDataObjects = resourceDataMap.map(function (mapping) {
      return mapping.object;
    });

    // untransform included resources if desired
    if (options.untransformIncluded && document.included) {
      document.included.forEach(function (resource) {
        return untransformResource({ resource: resource, data: data, resourceDataMap: resourceDataMap, document: document, options: options });
      });
    }

    // nest included resources if desired
    if (options.nestIncluded) {
      resourceDataMap.forEach(function (resourceDataMapping) {
        return nestRelatedResources({ resourceDataMapping: resourceDataMapping, data: data, options: options });
      });

      // remove circular dependencies if desired
      if (options.removeCircularDependencies) {
        var processed = new WeakSet();
        var visited = new WeakSet();

        removeCircularDependencies({ object: { root: primaryDataObjects }, processed: processed, visited: visited });
      }
    }

    return data;
  }

  /**
   * Untransform a single resource object into raw data
   * @param  {Object} args
   * @param  {Object} args.resource - the json-api resource object
   * @param  {Object} args.data - an object where each key is the name of a data type and each value is an array of raw data objects
   * @param  Object[] args.resourceDataMap - an array of objects that map resources to a raw data objects
   * @param  {Object} args.document - the json-api resource document
   * @param  {Object} args.options - function level options
   * @param  {Array} args.resourceDataMap - an array where each entry is an object that contains the reousrce and the corresponding raw data object
   */
  function untransformResource(_ref7) {
    var resource = _ref7.resource,
        data = _ref7.data,
        resourceDataMap = _ref7.resourceDataMap,
        document = _ref7.document,
        options = _ref7.options;

    // get the appropriate data schema to use
    var dataSchema = getUntransformedDataSchema({ type: resource.type, resource: resource, document: document, options: options });

    // untransform the resource id
    var id = getUntransformedId({ dataSchema: dataSchema, id: resource.id, type: resource.type, options: options });

    // untransform the resource attributes
    var attributes = getUntransformedAttributes({ dataSchema: dataSchema, id: id, type: resource.type, attributes: resource.attributes, resource: resource, options: options });

    // create a plain javascript object with the resource id and attributes
    var obj = Object.assign({ id: id }, attributes);

    if (resource.relationships) {
      // for each relationship, add the relationship to the plain javascript object
      Object.keys(resource.relationships).forEach(function (relationshipName) {
        var relationship = resource.relationships[relationshipName].data;

        if (Array.isArray(relationship)) {
          obj[relationshipName] = relationship.map(function (relationshipResource) {
            var relationshipDataSchema = getUntransformedDataSchema({ type: relationshipResource.type, resource: relationshipResource, document: document, options: options });

            return { id: getUntransformedId({ dataSchema: relationshipDataSchema, id: relationshipResource.id, type: relationshipResource.type, options: options }) };
          });
        } else {
          var relationshipDataSchema = getUntransformedDataSchema({ type: relationship.type, resource: relationship, document: document, options: options });

          obj[relationshipName] = { id: getUntransformedId({ dataSchema: relationshipDataSchema, id: relationship.id, type: relationship.type, options: options }) };
        }
      });
    }

    if (!data[resource.type]) {
      data[resource.type] = [];
    }

    // add the plain javascript object to the untransformed output and map it to the resource
    data[resource.type].push(obj);
    resourceDataMap.push({ resource: resource, object: obj });
  }

  /**
   * Get the data schema to use to untransform the resource object
   * @param  {Object} args
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.resource - the json-api resource object
   * @param  {Object} args.document - the json-api resource document
   * @param  {Object} args.options - function level options
   */
  function getUntransformedDataSchema(args) {
    var dataSchema = getSchema({ name: args.type });

    // if the base schema defines a dataSchema function, use that to retrieve the
    // actual schema to use, otherwise return the base schema
    if ((0, _utils.isFunction)(dataSchema.schema.data.untransformDataSchema)) {
      var name = dataSchema.schema.data.untransformDataSchema(args);

      if (name !== dataSchema.name) {
        dataSchema = getSchema(name);

        if (!dataSchema) {
          throw new Error('Missing Schema: ' + name);
        }
      }
    }

    return dataSchema;
  }

  /**
   * Untransform a resource object's id
   * @param  {Object} args
   * @param  {Object} args.dataSchema - the data schema for the resource object
   * @param  {Object} args.id - the json-api resource object id
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.options - function level options
   */
  function getUntransformedId(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var id = others.id;

    if (dataSchema.schema.data.untransformId) {
      id = dataSchema.schema.data.untransformId(others);
    }

    return id;
  }

  /**
   * Untransform a resource object's attributes
   * @param  {Object} args
   * @param  {Object} args.dataSchema - the data schema for the resource object
   * @param  {Object} args.id - the json-api resource object id, determined in the data.untransformId step
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.attributes - the json-api resource object attributes
   * @param  {Object} args.resource - the full json-api resource object
   * @param  {Object} args.options - function level options
   */
  function getUntransformedAttributes(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var attributes = others.attributes;

    if (dataSchema.schema.data.untransformAttributes) {
      attributes = dataSchema.schema.data.untransformAttributes(others);
    }

    return attributes;
  }

  /**
   * Nest related resources as defined by the json-api relationships
   * @param  {Object} args
   * @param  {Object} args.resourceDataMapping - An object that maps a resource to a raw data object
   * @param  {Object} args.data - An object where each key is the name of a data type and each value is an array of raw data objects
   */
  function nestRelatedResources(_ref8) {
    var resourceDataMapping = _ref8.resourceDataMapping,
        data = _ref8.data;

    var resource = resourceDataMapping.resource;
    var obj = resourceDataMapping.object;

    if (resource.relationships) {
      // for each relationship, add the relationship to the plain javascript object
      Object.keys(resource.relationships).forEach(function (relationshipName) {
        var relationship = resource.relationships[relationshipName].data;

        if (Array.isArray(relationship)) {
          obj[relationshipName] = relationship.map(function (relationshipResource, index) {
            var relationshipType = relationshipResource.type;
            var relatedObj = { id: obj[relationshipName][index].id };

            if (data[relationshipType]) {
              var tempRelatedObj = data[relationshipType].find(function (d) {
                return d.id === obj[relationshipName][index].id;
              });

              if (tempRelatedObj) {
                relatedObj = tempRelatedObj;
              }
            }

            return relatedObj;
          });
        } else {
          var relationshipType = relationship.type;

          if (data[relationshipType]) {
            var relatedObj = data[relationshipType].find(function (d) {
              return d.id === obj[relationshipName].id;
            });

            if (relatedObj) {
              obj[relationshipName] = relatedObj;
            }
          }
        }
      });
    }
  }

  /**
   * Remove any circular references from a raw data object
   * @param  {Object} args
   * @param  {Object} args.object - the object to check for circular references
   * @param  {Object} args.processed - a WeakSet of data objects already checked for circular references
   * @param  {Object} args.visited - a WeakSet of data objects already visited in the object hierarchy
   */
  function removeCircularDependencies(_ref9) {
    var object = _ref9.object,
        processed = _ref9.processed,
        visited = _ref9.visited;

    var queue = [];

    processed.add(object);

    Object.keys(object).forEach(function (key) {
      if (Array.isArray(object[key])) {
        object[key].forEach(function (item, index) {
          if ((0, _utils.isObject)(item) && item.id) {
            if (visited.has(item)) {
              // if the property has already been visited (i.e. the current data object is a descendant of the property object)
              // replace it with a new object that only contains the id
              object[key][index] = { id: object[key][index].id };
            } else if (!processed.has(item)) {
              // if the property has not been processed,
              // add it to the queue to remove any circular references it contains
              queue = queue.concat(object[key]);
            }
          }
        });
      } else if ((0, _utils.isObject)(object[key]) && object[key].id) {
        if (visited.has(object[key])) {
          // if the property has already been visited (i.e. the current data object is a descendant of the property object)
          // replace it with a new object that only contains the id
          object[key] = { id: object[key].id };
        } else if (!processed.has(object[key])) {
          // if the property has not been processed,
          // add it to the queue to remove any circular references it contains
          queue = queue.concat(object[key]);
        }
      }
    });

    // add items to visited
    queue.forEach(function (item) {
      visited.add(item);
    });

    // process the items
    queue.forEach(function (item) {
      removeCircularDependencies({ object: item, processed: processed, visited: visited });
    });

    // remove items from visited
    queue.forEach(function (item) {
      visited.delete(item);
    });
  }

  return {
    createInclude: createInclude,
    getAttributes: getAttributes,
    getId: getId,
    getRelationship: getRelationship,
    getRelationships: getRelationships,
    getSchema: getSchema,
    getType: getType,
    register: register,
    transform: transform,
    transformData: transformData,
    transformRelationshipData: transformRelationshipData,
    transformSource: transformSource,
    untransform: untransform,
    untransformResource: untransformResource,
    getUntransformedDataSchema: getUntransformedDataSchema,
    getUntransformedId: getUntransformedId,
    getUntransformedAttributes: getUntransformedAttributes,
    nestRelatedResources: nestRelatedResources,
    removeCircularDependencies: removeCircularDependencies
  };
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90cmFuc2Zvcm1hbGl6ZXIuanMiXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtYWxpemVyIiwiYmFzZU9wdGlvbnMiLCJyZWdpc3RyeSIsInJlZ2lzdGVyIiwibmFtZSIsInNjaGVtYSIsInNjaGVtYU9wdGlvbnMiLCJvcHRpb25zIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJnZXRTY2hlbWEiLCJ0cmFuc2Zvcm0iLCJzb3VyY2UiLCJvcHRzIiwiVHJhbnNmb3JtRXJyb3IiLCJkb2NTY2hlbWEiLCJPYmplY3QiLCJhc3NpZ24iLCJpbmNsdWRlIiwiY3JlYXRlSW5jbHVkZSIsImRhdGEiLCJ0cmFuc2Zvcm1Tb3VyY2UiLCJpbmNsdWRlZCIsImdldCIsImRvY3VtZW50IiwianNvbmFwaSIsInZlcnNpb24iLCJ0b3BMZXZlbCIsImZvckVhY2giLCJwcm9wIiwicmVzdWx0IiwibGVuZ3RoIiwiYXJncyIsIkFycmF5IiwiaXNBcnJheSIsIm1hcCIsInRyYW5zZm9ybURhdGEiLCJfdHlwZSIsIl9pZCIsImRhdGFTY2hlbWEiLCJzdGF0ZSIsInBhcmFtcyIsInR5cGUiLCJnZXRUeXBlIiwiaWQiLCJnZXRJZCIsImF0dHJpYnV0ZXMiLCJnZXRBdHRyaWJ1dGVzIiwicmVsYXRpb25zaGlwcyIsImdldFJlbGF0aW9uc2hpcHMiLCJsaW5rcyIsImdldExpbmtzIiwibWV0YSIsImdldE1ldGEiLCJyZXNvdXJjZSIsIm90aGVycyIsInJlbFNjaGVtYSIsImtleXMiLCJyZWR1Y2UiLCJtZW1vIiwia2V5IiwiZm4iLCJyZWxhdGlvbnNoaXAiLCJnZXRSZWxhdGlvbnNoaXAiLCJpbnZhbGlkRGF0YSIsInRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEiLCJpdGVtIiwiZXhpc3RzIiwibWFya0FzSW5jbHVkZWQiLCJhbHJlYWR5SW5jbHVkZWQiLCJwdXNoIiwidW50cmFuc2Zvcm0iLCJyZXNvdXJjZURhdGFNYXAiLCJ1bnRyYW5zZm9ybVJlc291cmNlIiwicHJpbWFyeURhdGFPYmplY3RzIiwibWFwcGluZyIsIm9iamVjdCIsInVudHJhbnNmb3JtSW5jbHVkZWQiLCJuZXN0SW5jbHVkZWQiLCJuZXN0UmVsYXRlZFJlc291cmNlcyIsInJlc291cmNlRGF0YU1hcHBpbmciLCJyZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyIsInByb2Nlc3NlZCIsIldlYWtTZXQiLCJ2aXNpdGVkIiwicm9vdCIsImdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hIiwiZ2V0VW50cmFuc2Zvcm1lZElkIiwiZ2V0VW50cmFuc2Zvcm1lZEF0dHJpYnV0ZXMiLCJvYmoiLCJyZWxhdGlvbnNoaXBOYW1lIiwicmVsYXRpb25zaGlwUmVzb3VyY2UiLCJyZWxhdGlvbnNoaXBEYXRhU2NoZW1hIiwidW50cmFuc2Zvcm1EYXRhU2NoZW1hIiwidW50cmFuc2Zvcm1JZCIsInVudHJhbnNmb3JtQXR0cmlidXRlcyIsImluZGV4IiwicmVsYXRpb25zaGlwVHlwZSIsInJlbGF0ZWRPYmoiLCJ0ZW1wUmVsYXRlZE9iaiIsImZpbmQiLCJkIiwicXVldWUiLCJhZGQiLCJoYXMiLCJjb25jYXQiLCJkZWxldGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7a0JBY3dCQSxxQjs7QUFkeEI7Ozs7QUFTQTs7Ozs7QUFLZSxTQUFTQSxxQkFBVCxHQUFpRDtBQUFBLE1BQWxCQyxXQUFrQix1RUFBSixFQUFJOztBQUM5RCxNQUFNQyxXQUFXLEVBQWpCOztBQUVBOzs7Ozs7OztBQVFBLFdBQVNDLFFBQVQsT0FBNEQ7QUFBQSxRQUF4Q0MsSUFBd0MsUUFBeENBLElBQXdDO0FBQUEsUUFBbENDLE1BQWtDLFFBQWxDQSxNQUFrQztBQUFBLFFBQWpCQyxhQUFpQixRQUExQkMsT0FBMEI7O0FBQzFELFFBQUksQ0FBQyxxQkFBU0gsSUFBVCxDQUFMLEVBQXFCO0FBQ25CLFlBQU0sSUFBSUksS0FBSixDQUFVLHNDQUFWLENBQU47QUFDRDtBQUNETixhQUFTRSxJQUFULElBQWlCO0FBQ2ZDLGNBQVEsMkJBQWUsRUFBRUQsVUFBRixFQUFRQyxj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SztBQWVMYSwwREFmSztBQWdCTEMsMENBaEJLO0FBaUJMQywwREFqQks7QUFrQkxULDhDQWxCSztBQW1CTEU7QUFuQkssR0FBUDtBQXFCRCIsImZpbGUiOiJ0cmFuc2Zvcm1hbGl6ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCxcbiAgaXNTdHJpbmcsXG4gIFRyYW5zZm9ybUVycm9yLFxuICB2YWxpZGF0ZVNjaGVtYSxcbiAgdmFsaWRhdGVKc29uQXBpRG9jdW1lbnQsXG59IGZyb20gJy4vdXRpbHMnXG5cbi8qKlxuICogVHJhbnNmb3JtYWxpemVyIGZhY3RvcnkgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtPYmplY3R9IFtiYXNlT3B0aW9ucz17fV1cbiAqIEByZXR1cm4ge09iamVjdH0gdHJhbnNmb3JtYWxpemVyXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zZm9ybWFsaXplcihiYXNlT3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0ge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBzY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5uYW1lIC0gc2NoZW1hIG5hbWUvaWRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnNjaGVtYSAtIHNjaGVtYSBkZWZpbml0aW9uXG4gICAqIEBwYXJhbSAge09iamVjdH0gW2FyZ3Mub3B0aW9ucz17fV0gLSBzY2hlbWEgb3B0aW9ucyB0byBiZSBtZXJnZWQgaW4gdG8gdHJhbnNmb3JtIG9wdGlvbnNcbiAgICogQHJldHVybiB7VW5kZWZpbmVkfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXIoeyBuYW1lLCBzY2hlbWEsIG9wdGlvbnM6IHNjaGVtYU9wdGlvbnMgfSkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcIm5hbWVcIiBQcm9wZXJ0eSAobm9uIHN0cmluZyknKVxuICAgIH1cbiAgICByZWdpc3RyeVtuYW1lXSA9IHtcbiAgICAgIHNjaGVtYTogdmFsaWRhdGVTY2hlbWEoeyBuYW1lLCBzY2hlbWEgfSksXG4gICAgICBvcHRpb25zOiBzY2hlbWFPcHRpb25zLFxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgc2NoZW1hIGZyb20gdGhlIHJlZ2lzdHJ5IGJ5IG5hbWVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBvcHRpb25zLm5hbWUgLSBzY2hlbWEgbmFtZS9pZFxuICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgICAtIHNjaGVtYVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U2NoZW1hKHsgbmFtZSB9KSB7XG4gICAgcmV0dXJuIHJlZ2lzdHJ5W25hbWVdXG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHJhdyBkYXRhIGludG8gYSB2YWxpZCBKU09OIEFQSSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLm5hbWUgLSB0aGUgdG9wIGxldmVsIHNjaGVtYSBuYW1lXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2UgLSBhIHNpbmdsZSBzb3VyY2Ugb2JqZWN0IG9yIGFuIGFyYXkgb2Ygc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBbb3B0aW9ucz17fV0gLSBmdW5jdGlvbiBsZXZlbCBvcHRpb25zXG4gICAqIEByZXR1cm4ge09iamVjdH0gZG9jdW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybSh7IG5hbWUsIHNvdXJjZSwgb3B0aW9uczogb3B0cyB9KSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBJbnZhbGlkIFwibmFtZVwiIFByb3BlcnR5IChub24gc3RyaW5nKSBhY3R1YWwgdHlwZTogJyR7dHlwZW9mIG5hbWV9J2AsIHsgbmFtZSwgc291cmNlLCBvcHRpb25zOiBvcHRzIH0pXG4gICAgfVxuICAgIGNvbnN0IGRvY1NjaGVtYSA9IHJlZ2lzdHJ5W25hbWVdXG4gICAgaWYgKCFkb2NTY2hlbWEpIHtcbiAgICAgIHRocm93IG5ldyBUcmFuc2Zvcm1FcnJvcihgTWlzc2luZyBTY2hlbWE6ICR7bmFtZX1gLCB7IG5hbWUsIHNvdXJjZSwgb3B0aW9uczogb3B0cyB9KVxuICAgIH1cbiAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgYmFzZU9wdGlvbnMsIG9wdHMpXG4gICAgY29uc3QgaW5jbHVkZSA9IGNyZWF0ZUluY2x1ZGUoeyBzb3VyY2UsIG9wdGlvbnMgfSlcbiAgICBjb25zdCBkYXRhID0gdHJhbnNmb3JtU291cmNlKHsgZG9jU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnMsIGluY2x1ZGUgfSlcbiAgICBjb25zdCBpbmNsdWRlZCA9IGluY2x1ZGUuZ2V0KClcbiAgICBjb25zdCBkb2N1bWVudCA9IHtcbiAgICAgIGpzb25hcGk6IHtcbiAgICAgICAgdmVyc2lvbjogJzEuMCcsXG4gICAgICB9LFxuICAgIH1cbiAgICAvLyBhZGQgdG9wIGxldmVsIHByb3BlcnRpZXMgaWYgYXZhaWxhYmxlXG4gICAgY29uc3QgdG9wTGV2ZWwgPSBbJ2xpbmtzJywgJ21ldGEnXVxuICAgIHRvcExldmVsLmZvckVhY2goKHByb3ApID0+IHtcbiAgICAgIGlmIChkb2NTY2hlbWEuc2NoZW1hW3Byb3BdKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGRvY1NjaGVtYS5zY2hlbWFbcHJvcF0oeyBzb3VyY2UsIG9wdGlvbnMsIGRhdGEsIGluY2x1ZGVkIH0pXG4gICAgICAgIGlmIChpc09iamVjdChyZXN1bHQpKSB7XG4gICAgICAgICAgZG9jdW1lbnRbcHJvcF0gPSByZXN1bHRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgZG9jdW1lbnQuZGF0YSA9IGRhdGFcbiAgICBpZiAoaW5jbHVkZWQubGVuZ3RoKSB7XG4gICAgICBkb2N1bWVudC5pbmNsdWRlZCA9IGluY2x1ZGVkXG4gICAgfVxuICAgIHJldHVybiBkb2N1bWVudFxuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBzb3VyY2UgaW50byB0aGUgXCJwcmltYXJ5IGRhdGFcIiBvZiB0aGUgZG9jdW1lbnRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2NTY2hlbWEgLSB0aGUgdG9wIGxldmVsIHNjaGVtYSB1c2VkIGZvciB0cmFuc2Zvcm1pbmcgdGhlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2UgLSBzb3VyY2UgZGF0YVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmluY2x1ZGUgLSBpbmNsdWRlIG9iamVjdFxuICAgKiBAcmV0dXJuIHtPYmplY3R8T2JqZWN0W119XG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2Zvcm1Tb3VyY2UoYXJncykge1xuICAgIGNvbnN0IHsgZG9jU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnM6IG9wdHMsIGluY2x1ZGUgfSA9IGFyZ3NcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICByZXR1cm4gc291cmNlLm1hcChkYXRhID0+IHRyYW5zZm9ybURhdGEoeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgZGF0YSwgaW5jbHVkZSB9KSlcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZm9ybURhdGEoeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgZGF0YTogc291cmNlLCBpbmNsdWRlIH0pXG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc2luZ2xlIHNvdXJjZSBvYmplY3QgaW50byBhIHZhbGlkIHJlc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZG9jU2NoZW1hIC0gdGhlIHRvcCBsZXZlbCBzY2hlbWEgdXNlZCBmb3IgdHJhbnNmb3JtaW5nIHRoZSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlIC0gc291cmNlIGRhdGFcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnMgLSBmdW5jdGlvbiBsZXZlbCBvcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhIC0gY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pbmNsdWRlIC0gaW5jbHVkZSBvYmplY3RcbiAgICogQHBhcmFtICB7U3RyaW5nfSBbYXJncy5fdHlwZV0gLSAoZm9yIHVzZSBieSB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IFthcmdzLl9pZF0gLSAoZm9yIHVzZSBieSB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKVxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRvY1NjaGVtYSwgc291cmNlLCBvcHRpb25zLCBkYXRhLCBpbmNsdWRlLCBfdHlwZSwgX2lkIH0gPSBhcmdzXG4gICAgLy8gY2FsbCBkYXRhU2NoZW1hIGlmIGRlZmluZWQgYW5kIHN3aXRjaCBjb250ZXh0cyBpZiBuZWNlc3NhcnlcbiAgICBsZXQgZGF0YVNjaGVtYSA9IGRvY1NjaGVtYVxuICAgIGlmIChpc0Z1bmN0aW9uKGRvY1NjaGVtYS5zY2hlbWEuZGF0YS5kYXRhU2NoZW1hKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGRvY1NjaGVtYS5zY2hlbWEuZGF0YS5kYXRhU2NoZW1hKHsgc291cmNlLCBkYXRhLCBvcHRpb25zIH0pXG4gICAgICBpZiAobmFtZSAhPT0gZG9jU2NoZW1hLm5hbWUpIHtcbiAgICAgICAgZGF0YVNjaGVtYSA9IHJlZ2lzdHJ5W25hbWVdXG4gICAgICAgIGlmICghZGF0YVNjaGVtYSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBTY2hlbWE6ICR7bmFtZX1gKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHN0YXRlID0ge31cbiAgICBjb25zdCBwYXJhbXMgPSB7IGRhdGFTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgZGF0YSwgc3RhdGUgfVxuICAgIGNvbnN0IHR5cGUgPSBwYXJhbXMudHlwZSA9IF90eXBlIHx8IGdldFR5cGUocGFyYW1zKVxuICAgIGNvbnN0IGlkID0gcGFyYW1zLmlkID0gX2lkIHx8IGdldElkKHBhcmFtcylcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gcGFyYW1zLmF0dHJpYnV0ZXMgPSBnZXRBdHRyaWJ1dGVzKHBhcmFtcylcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzID0gcGFyYW1zLnJlbGF0aW9uc2hpcHMgPSBnZXRSZWxhdGlvbnNoaXBzKHsgaW5jbHVkZSwgLi4ucGFyYW1zIH0pXG4gICAgY29uc3QgbGlua3MgPSBwYXJhbXMubGlua3MgPSBnZXRMaW5rcyhwYXJhbXMpXG4gICAgY29uc3QgbWV0YSA9IHBhcmFtcy5tZXRhID0gZ2V0TWV0YShwYXJhbXMpXG4gICAgLy8gYnVpbGQgcmVzdWx0aW5nIHJlc291cmNlXG4gICAgY29uc3QgcmVzb3VyY2UgPSB7IHR5cGUsIGlkIH1cbiAgICBpZiAoaXNPYmplY3QoYXR0cmlidXRlcykpIHtcbiAgICAgIHJlc291cmNlLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzXG4gICAgfVxuICAgIGlmIChpc09iamVjdChyZWxhdGlvbnNoaXBzKSkge1xuICAgICAgcmVzb3VyY2UucmVsYXRpb25zaGlwcyA9IHJlbGF0aW9uc2hpcHNcbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KG1ldGEpKSB7XG4gICAgICByZXNvdXJjZS5tZXRhID0gbWV0YVxuICAgIH1cbiAgICBpZiAoaXNPYmplY3QobGlua3MpKSB7XG4gICAgICByZXNvdXJjZS5saW5rcyA9IGxpbmtzXG4gICAgfVxuICAgIHJldHVybiByZXNvdXJjZVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgdHlwZSBmb3IgdGhlIGN1cnJlbnQgc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHR5cGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldFR5cGUoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgY29uc3QgdHlwZSA9IGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudHlwZShvdGhlcnMpXG4gICAgaWYgKCFpc1N0cmluZyh0eXBlKSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBJbnZhbGlkIHR5cGUsIGV4cGVjdGVkIHN0cmluZyBidXQgaXMgJyR7dHlwZW9mIHR5cGV9Jy4gYCwgYXJncylcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIGlkIGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEByZXR1cm4ge1N0cmluZ30gaWRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldElkKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGNvbnN0IGlkID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5pZChvdGhlcnMpXG4gICAgaWYgKCFpc1N0cmluZyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBUcmFuc2Zvcm1FcnJvcihgSW52YWxpZCB0eXBlLCBleHBlY3RlZCBzdHJpbmcgYnV0IGlzICcke3R5cGVvZiBpZH0nLmAsIGFyZ3MpXG4gICAgfVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgYXR0cmlidXRlcyBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLmlkXG4gICAqIEByZXR1cm4ge09iamVjdH0gYXR0cmlidXRlc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0QXR0cmlidXRlcyhhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBpZiAoZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb25zdCBhdHRyaWJ1dGVzID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5hdHRyaWJ1dGVzKG90aGVycylcbiAgICAgIHJldHVybiBhdHRyaWJ1dGVzXG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIHJlbGF0aW9uc2hpcHMgb2JqZWN0IGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaW5jbHVkZVxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHJlbGF0aW9uc2hpcHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldFJlbGF0aW9uc2hpcHMoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgY29uc3QgcmVsU2NoZW1hID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzXG4gICAgaWYgKHJlbFNjaGVtYSkge1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHJlbFNjaGVtYSlcbiAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBrZXlzLnJlZHVjZSgobWVtbywga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGZuID0gcmVsU2NoZW1hW2tleV1cbiAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gZ2V0UmVsYXRpb25zaGlwKHsgZm4sIC4uLm90aGVycyB9KVxuICAgICAgICBpZiAoaXNPYmplY3QocmVsYXRpb25zaGlwKSkge1xuICAgICAgICAgIG1lbW9ba2V5XSA9IHJlbGF0aW9uc2hpcFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vXG4gICAgICB9LCB7fSlcbiAgICAgIGlmICghT2JqZWN0LmtleXMocmVsYXRpb25zaGlwcykubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiByZWxhdGlvbnNoaXBzXG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIHJlbGF0aW9uc2hpcCBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHJlbGF0aW9uc2hpcCBvZiB0aGVcbiAgICogY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZm5cbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmluY2x1ZGVcbiAgICogQHJldHVybiB7T2JqZWN0fSByZWxhdGlvbnNoaXBcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldFJlbGF0aW9uc2hpcChhcmdzKSB7XG4gICAgY29uc3QgeyBmbiwgaW5jbHVkZSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgY29uc3QgcmVzdWx0ID0gZm4ob3RoZXJzKVxuICAgIGlmICghaXNPYmplY3QocmVzdWx0KSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICBjb25zdCB7IG1ldGEsIGxpbmtzLCBkYXRhIH0gPSByZXN1bHRcbiAgICBjb25zdCBpbnZhbGlkRGF0YSA9ICh0eXBlb2YgZGF0YSA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgIGlmICghbGlua3MgJiYgIW1ldGEgJiYgaW52YWxpZERhdGEpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG4gICAgY29uc3QgcmVsYXRpb25zaGlwID0ge31cbiAgICBpZiAoIWludmFsaWREYXRhKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICByZWxhdGlvbnNoaXAuZGF0YSA9IGRhdGEubWFwKGl0ZW0gPT4gdHJhbnNmb3JtUmVsYXRpb25zaGlwRGF0YSh7XG4gICAgICAgICAgaXRlbSxcbiAgICAgICAgICBzb3VyY2U6IGFyZ3Muc291cmNlLFxuICAgICAgICAgIG9wdGlvbnM6IGFyZ3Mub3B0aW9ucyxcbiAgICAgICAgICBpbmNsdWRlLFxuICAgICAgICB9KSlcbiAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICByZWxhdGlvbnNoaXAuZGF0YSA9IG51bGxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5kYXRhID0gdHJhbnNmb3JtUmVsYXRpb25zaGlwRGF0YSh7XG4gICAgICAgICAgaXRlbTogZGF0YSxcbiAgICAgICAgICBzb3VyY2U6IGFyZ3Muc291cmNlLFxuICAgICAgICAgIG9wdGlvbnM6IGFyZ3Mub3B0aW9ucyxcbiAgICAgICAgICBpbmNsdWRlLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNPYmplY3QobWV0YSkpIHtcbiAgICAgIHJlbGF0aW9uc2hpcC5tZXRhID0gbWV0YVxuICAgIH1cbiAgICBpZiAoaXNPYmplY3QobGlua3MpKSB7XG4gICAgICByZWxhdGlvbnNoaXAubGlua3MgPSBsaW5rc1xuICAgIH1cbiAgICByZXR1cm4gcmVsYXRpb25zaGlwXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBkYXRhIGZvciB0aGUgY3VycmVudCByZWxhdGlvbnNoaXAgb2JqZWN0IGZvciB0aGUgY3VycmVudCBzb3VyY2VcbiAgICogb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaXRlbSAtIHRoZSBjdXJyZW50IGRhdGEgaXRlbVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBhcmdzLmluY2x1ZGVcbiAgICogQHJldHVybiB7T2JqZWN0fSBkYXRhXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKGFyZ3MpIHtcbiAgICBjb25zdCB7IGl0ZW0sIHNvdXJjZSwgb3B0aW9ucywgaW5jbHVkZSB9ID0gYXJnc1xuICAgIGNvbnN0IHsgbmFtZSwgZGF0YSwgaW5jbHVkZWQsIG1ldGEgfSA9IGl0ZW1cbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFyZWdpc3RyeVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBNaXNzaW5nIFNjaGVtYTogJHtuYW1lfWAsIGFyZ3MpXG4gICAgfVxuICAgIGNvbnN0IHJlbFNjaGVtYSA9IHJlZ2lzdHJ5W25hbWVdXG4gICAgY29uc3QgdHlwZSA9IGdldFR5cGUoeyBkYXRhU2NoZW1hOiByZWxTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgZGF0YSB9KVxuICAgIGNvbnN0IGlkID0gZ2V0SWQoeyBkYXRhU2NoZW1hOiByZWxTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgZGF0YSB9KVxuICAgIGNvbnN0IHJlc3VsdCA9IHsgdHlwZSwgaWQgfVxuICAgIGlmIChpc09iamVjdChtZXRhKSkge1xuICAgICAgcmVzdWx0Lm1ldGEgPSBtZXRhXG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVkID09PSB0cnVlICYmICFpbmNsdWRlLmV4aXN0cyh7IHR5cGUsIGlkIH0pKSB7XG4gICAgICBpbmNsdWRlLm1hcmtBc0luY2x1ZGVkKHsgdHlwZSwgaWQgfSlcblxuICAgICAgY29uc3QgcmVzb3VyY2UgPSB0cmFuc2Zvcm1EYXRhKHtcbiAgICAgICAgZG9jU2NoZW1hOiByZWxTY2hlbWEsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgaW5jbHVkZSxcbiAgICAgICAgX3R5cGU6IHR5cGUsXG4gICAgICAgIF9pZDogaWQsXG4gICAgICB9KVxuICAgICAgaW5jbHVkZS5pbmNsdWRlKHJlc291cmNlKVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBsaW5rcyBmb3IgdGhlIGN1cnJlbnQgc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlbGF0aW9uc2hpcHNcbiAgICogQHJldHVybiB7T2JqZWN0fSBsaW5rc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TGlua3MoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEubGlua3MpIHtcbiAgICAgIHJldHVybiBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmxpbmtzKG90aGVycylcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgbWV0YSBmb3IgdGhlIGN1cnJlbnQgc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlbGF0aW9uc2hpcHNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmxpbmtzXG4gICAqIEByZXR1cm4ge09iamVjdH0gbWV0YVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWV0YShhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBpZiAoZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5tZXRhKSB7XG4gICAgICByZXR1cm4gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5tZXRhKG90aGVycylcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBpbmNsdWRlIG9iamVjdFxuICAgKiBAcmV0dXJuIHtPYmplY3R9IGluY2x1ZGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUluY2x1ZGUoKSB7XG4gICAgY29uc3QgaW5jbHVkZWQgPSBbXVxuICAgIGNvbnN0IGFscmVhZHlJbmNsdWRlZCA9IHt9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8qKlxuICAgICAgICogRGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gcmVzb3VyY2UgaGFzIGFscmVhZHkgYmVlbiBpbmNsdWRlZFxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IGFyZ3NcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhcmdzLmlkXG4gICAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAgICovXG4gICAgICBleGlzdHMoeyB0eXBlLCBpZCB9KSB7XG4gICAgICAgIHJldHVybiBhbHJlYWR5SW5jbHVkZWRbYCR7dHlwZX06JHtpZH1gXVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBNYXJrIGEgcmVzb3VyY2UgYXMgaW5jbHVkZWRcbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXJncy50eXBlXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXJncy5pZFxuICAgICAgICogQHJldHVybiB7VW5kZWZpbmVkfVxuICAgICAgICovXG4gICAgICBtYXJrQXNJbmNsdWRlZDogZnVuY3Rpb24gbWFya0FzSW5jbHVkZWQoeyB0eXBlLCBpZCB9KSB7XG4gICAgICAgIGFscmVhZHlJbmNsdWRlZFtgJHt0eXBlfToke2lkfWBdID0gdHJ1ZVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBBZGQgYW4gaW5jbHVkZWQgcmVzb3VyY2UgdG8gdGhlIGluY2x1ZGVkIHNlY3Rpb24gb2YgdGhlIGRvY3VtZW50XG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzb3VyY2VcbiAgICAgICAqIEByZXR1cm4ge1VuZGVmaW5lZH1cbiAgICAgICAqL1xuICAgICAgaW5jbHVkZShyZXNvdXJjZSkge1xuICAgICAgICBpbmNsdWRlZC5wdXNoKHJlc291cmNlKVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBSZXR1cm4gdGhlIGluY2x1ZGVkIGFycmF5IGluIGl0cyBjdXJyZW50IHN0YXRlXG4gICAgICAgKiBAcmV0dXJuIHtPYmplY3RbXX1cbiAgICAgICAqL1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gaW5jbHVkZWRcbiAgICAgIH0sXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVudHJhbnNmb3JtIGEgdmFsaWQgSlNPTiBBUEkgZG9jdW1lbnQgaW50byByYXcgZGF0YVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY3VtZW50IC0gYSBqc29uLWFwaSBmb3JtYXR0ZWQgZG9jdW1lbnRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBbb3B0aW9ucz17fV0gLSBmdW5jdGlvbiBsZXZlbCBvcHRpb25zXG4gICAqIEByZXR1cm4ge09iamVjdFtdfSBhbiBhcnJheSBvZiBkYXRhIG9iamVjdHNcbiAgICovXG4gIGZ1bmN0aW9uIHVudHJhbnNmb3JtKHsgZG9jdW1lbnQsIG9wdGlvbnM6IG9wdHMgfSkge1xuICAgIC8vIHZhbGlkYXRlIGpzb24gYXBpIGRvY3VtZW50XG4gICAgdmFsaWRhdGVKc29uQXBpRG9jdW1lbnQoZG9jdW1lbnQpXG5cbiAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgYmFzZU9wdGlvbnMsIG9wdHMpXG4gICAgY29uc3QgZGF0YSA9IHt9XG4gICAgY29uc3QgcmVzb3VyY2VEYXRhTWFwID0gW11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGRvY3VtZW50LmRhdGEpKSB7XG4gICAgICBkb2N1bWVudC5kYXRhLmZvckVhY2gocmVzb3VyY2UgPT4gdW50cmFuc2Zvcm1SZXNvdXJjZSh7IHJlc291cmNlLCBkYXRhLCByZXNvdXJjZURhdGFNYXAsIGRvY3VtZW50LCBvcHRpb25zIH0pKVxuICAgIH0gZWxzZSB7XG4gICAgICB1bnRyYW5zZm9ybVJlc291cmNlKHsgcmVzb3VyY2U6IGRvY3VtZW50LmRhdGEsIGRhdGEsIHJlc291cmNlRGF0YU1hcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcbiAgICB9XG5cbiAgICBjb25zdCBwcmltYXJ5RGF0YU9iamVjdHMgPSByZXNvdXJjZURhdGFNYXAubWFwKG1hcHBpbmcgPT4gbWFwcGluZy5vYmplY3QpXG5cbiAgICAvLyB1bnRyYW5zZm9ybSBpbmNsdWRlZCByZXNvdXJjZXMgaWYgZGVzaXJlZFxuICAgIGlmIChvcHRpb25zLnVudHJhbnNmb3JtSW5jbHVkZWQgJiYgZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICAgIGRvY3VtZW50LmluY2x1ZGVkLmZvckVhY2gocmVzb3VyY2UgPT4gdW50cmFuc2Zvcm1SZXNvdXJjZSh7IHJlc291cmNlLCBkYXRhLCByZXNvdXJjZURhdGFNYXAsIGRvY3VtZW50LCBvcHRpb25zIH0pKVxuICAgIH1cblxuICAgIC8vIG5lc3QgaW5jbHVkZWQgcmVzb3VyY2VzIGlmIGRlc2lyZWRcbiAgICBpZiAob3B0aW9ucy5uZXN0SW5jbHVkZWQpIHtcbiAgICAgIHJlc291cmNlRGF0YU1hcC5mb3JFYWNoKHJlc291cmNlRGF0YU1hcHBpbmcgPT4gbmVzdFJlbGF0ZWRSZXNvdXJjZXMoeyByZXNvdXJjZURhdGFNYXBwaW5nLCBkYXRhLCBvcHRpb25zIH0pKVxuXG4gICAgICAvLyByZW1vdmUgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIGlmIGRlc2lyZWRcbiAgICAgIGlmIChvcHRpb25zLnJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IG5ldyBXZWFrU2V0KClcbiAgICAgICAgY29uc3QgdmlzaXRlZCA9IG5ldyBXZWFrU2V0KClcblxuICAgICAgICByZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyh7IG9iamVjdDogeyByb290OiBwcmltYXJ5RGF0YU9iamVjdHMgfSwgcHJvY2Vzc2VkLCB2aXNpdGVkIH0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGFcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRyYW5zZm9ybSBhIHNpbmdsZSByZXNvdXJjZSBvYmplY3QgaW50byByYXcgZGF0YVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlc291cmNlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YSAtIGFuIG9iamVjdCB3aGVyZSBlYWNoIGtleSBpcyB0aGUgbmFtZSBvZiBhIGRhdGEgdHlwZSBhbmQgZWFjaCB2YWx1ZSBpcyBhbiBhcnJheSBvZiByYXcgZGF0YSBvYmplY3RzXG4gICAqIEBwYXJhbSAgT2JqZWN0W10gYXJncy5yZXNvdXJjZURhdGFNYXAgLSBhbiBhcnJheSBvZiBvYmplY3RzIHRoYXQgbWFwIHJlc291cmNlcyB0byBhIHJhdyBkYXRhIG9iamVjdHNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY3VtZW50IC0gdGhlIGpzb24tYXBpIHJlc291cmNlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKiBAcGFyYW0gIHtBcnJheX0gYXJncy5yZXNvdXJjZURhdGFNYXAgLSBhbiBhcnJheSB3aGVyZSBlYWNoIGVudHJ5IGlzIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSByZW91c3JjZSBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgcmF3IGRhdGEgb2JqZWN0XG4gICAqL1xuICBmdW5jdGlvbiB1bnRyYW5zZm9ybVJlc291cmNlKHsgcmVzb3VyY2UsIGRhdGEsIHJlc291cmNlRGF0YU1hcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSkge1xuICAgIC8vIGdldCB0aGUgYXBwcm9wcmlhdGUgZGF0YSBzY2hlbWEgdG8gdXNlXG4gICAgY29uc3QgZGF0YVNjaGVtYSA9IGdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hKHsgdHlwZTogcmVzb3VyY2UudHlwZSwgcmVzb3VyY2UsIGRvY3VtZW50LCBvcHRpb25zIH0pXG5cbiAgICAvLyB1bnRyYW5zZm9ybSB0aGUgcmVzb3VyY2UgaWRcbiAgICBjb25zdCBpZCA9IGdldFVudHJhbnNmb3JtZWRJZCh7IGRhdGFTY2hlbWEsIGlkOiByZXNvdXJjZS5pZCwgdHlwZTogcmVzb3VyY2UudHlwZSwgb3B0aW9ucyB9KVxuXG4gICAgLy8gdW50cmFuc2Zvcm0gdGhlIHJlc291cmNlIGF0dHJpYnV0ZXNcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0VW50cmFuc2Zvcm1lZEF0dHJpYnV0ZXMoeyBkYXRhU2NoZW1hLCBpZCwgdHlwZTogcmVzb3VyY2UudHlwZSwgYXR0cmlidXRlczogcmVzb3VyY2UuYXR0cmlidXRlcywgcmVzb3VyY2UsIG9wdGlvbnMgfSlcblxuICAgIC8vIGNyZWF0ZSBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0IHdpdGggdGhlIHJlc291cmNlIGlkIGFuZCBhdHRyaWJ1dGVzXG4gICAgY29uc3Qgb2JqID0gT2JqZWN0LmFzc2lnbih7IGlkIH0sIGF0dHJpYnV0ZXMpXG5cbiAgICBpZiAocmVzb3VyY2UucmVsYXRpb25zaGlwcykge1xuICAgICAgLy8gZm9yIGVhY2ggcmVsYXRpb25zaGlwLCBhZGQgdGhlIHJlbGF0aW9uc2hpcCB0byB0aGUgcGxhaW4gamF2YXNjcmlwdCBvYmplY3RcbiAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbGF0aW9uc2hpcE5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBOYW1lXS5kYXRhXG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsYXRpb25zaGlwKSkge1xuICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHJlbGF0aW9uc2hpcC5tYXAoKHJlbGF0aW9uc2hpcFJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXBEYXRhU2NoZW1hID0gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoeyB0eXBlOiByZWxhdGlvbnNoaXBSZXNvdXJjZS50eXBlLCByZXNvdXJjZTogcmVsYXRpb25zaGlwUmVzb3VyY2UsIGRvY3VtZW50LCBvcHRpb25zIH0pXG5cbiAgICAgICAgICAgIHJldHVybiB7IGlkOiBnZXRVbnRyYW5zZm9ybWVkSWQoeyBkYXRhU2NoZW1hOiByZWxhdGlvbnNoaXBEYXRhU2NoZW1hLCBpZDogcmVsYXRpb25zaGlwUmVzb3VyY2UuaWQsIHR5cGU6IHJlbGF0aW9uc2hpcFJlc291cmNlLnR5cGUsIG9wdGlvbnMgfSkgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwRGF0YVNjaGVtYSA9IGdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hKHsgdHlwZTogcmVsYXRpb25zaGlwLnR5cGUsIHJlc291cmNlOiByZWxhdGlvbnNoaXAsIGRvY3VtZW50LCBvcHRpb25zIH0pXG5cbiAgICAgICAgICBvYmpbcmVsYXRpb25zaGlwTmFtZV0gPSB7IGlkOiBnZXRVbnRyYW5zZm9ybWVkSWQoeyBkYXRhU2NoZW1hOiByZWxhdGlvbnNoaXBEYXRhU2NoZW1hLCBpZDogcmVsYXRpb25zaGlwLmlkLCB0eXBlOiByZWxhdGlvbnNoaXAudHlwZSwgb3B0aW9ucyB9KSB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKCFkYXRhW3Jlc291cmNlLnR5cGVdKSB7XG4gICAgICBkYXRhW3Jlc291cmNlLnR5cGVdID0gW11cbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0IHRvIHRoZSB1bnRyYW5zZm9ybWVkIG91dHB1dCBhbmQgbWFwIGl0IHRvIHRoZSByZXNvdXJjZVxuICAgIGRhdGFbcmVzb3VyY2UudHlwZV0ucHVzaChvYmopXG4gICAgcmVzb3VyY2VEYXRhTWFwLnB1c2goeyByZXNvdXJjZSwgb2JqZWN0OiBvYmogfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRhdGEgc2NoZW1hIHRvIHVzZSB0byB1bnRyYW5zZm9ybSB0aGUgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MudHlwZSAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3QgdHlwZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVzb3VyY2UgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2N1bWVudCAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICovXG4gIGZ1bmN0aW9uIGdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hKGFyZ3MpIHtcbiAgICBsZXQgZGF0YVNjaGVtYSA9IGdldFNjaGVtYSh7IG5hbWU6IGFyZ3MudHlwZSB9KVxuXG4gICAgLy8gaWYgdGhlIGJhc2Ugc2NoZW1hIGRlZmluZXMgYSBkYXRhU2NoZW1hIGZ1bmN0aW9uLCB1c2UgdGhhdCB0byByZXRyaWV2ZSB0aGVcbiAgICAvLyBhY3R1YWwgc2NoZW1hIHRvIHVzZSwgb3RoZXJ3aXNlIHJldHVybiB0aGUgYmFzZSBzY2hlbWFcbiAgICBpZiAoaXNGdW5jdGlvbihkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtRGF0YVNjaGVtYSkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtRGF0YVNjaGVtYShhcmdzKVxuXG4gICAgICBpZiAobmFtZSAhPT0gZGF0YVNjaGVtYS5uYW1lKSB7XG4gICAgICAgIGRhdGFTY2hlbWEgPSBnZXRTY2hlbWEobmFtZSlcblxuICAgICAgICBpZiAoIWRhdGFTY2hlbWEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgU2NoZW1hOiAke25hbWV9YClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkYXRhU2NoZW1hXG4gIH1cblxuICAvKipcbiAgICogVW50cmFuc2Zvcm0gYSByZXNvdXJjZSBvYmplY3QncyBpZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWEgLSB0aGUgZGF0YSBzY2hlbWEgZm9yIHRoZSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmlkIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCBpZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MudHlwZSAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3QgdHlwZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICovXG4gIGZ1bmN0aW9uIGdldFVudHJhbnNmb3JtZWRJZChhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBsZXQgaWQgPSBvdGhlcnMuaWRcblxuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWQpIHtcbiAgICAgIGlkID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS51bnRyYW5zZm9ybUlkKG90aGVycylcbiAgICB9XG5cbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRyYW5zZm9ybSBhIHJlc291cmNlIG9iamVjdCdzIGF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hIC0gdGhlIGRhdGEgc2NoZW1hIGZvciB0aGUgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pZCAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3QgaWQsIGRldGVybWluZWQgaW4gdGhlIGRhdGEudW50cmFuc2Zvcm1JZCBzdGVwXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy50eXBlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCB0eXBlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5hdHRyaWJ1dGVzIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCBhdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZXNvdXJjZSAtIHRoZSBmdWxsIGpzb24tYXBpIHJlc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICovXG4gIGZ1bmN0aW9uIGdldFVudHJhbnNmb3JtZWRBdHRyaWJ1dGVzKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGxldCBhdHRyaWJ1dGVzID0gb3RoZXJzLmF0dHJpYnV0ZXNcblxuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtQXR0cmlidXRlcykge1xuICAgICAgYXR0cmlidXRlcyA9IGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzKG90aGVycylcbiAgICB9XG5cbiAgICByZXR1cm4gYXR0cmlidXRlc1xuICB9XG5cbiAgLyoqXG4gICAqIE5lc3QgcmVsYXRlZCByZXNvdXJjZXMgYXMgZGVmaW5lZCBieSB0aGUganNvbi1hcGkgcmVsYXRpb25zaGlwc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlc291cmNlRGF0YU1hcHBpbmcgLSBBbiBvYmplY3QgdGhhdCBtYXBzIGEgcmVzb3VyY2UgdG8gYSByYXcgZGF0YSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGEgLSBBbiBvYmplY3Qgd2hlcmUgZWFjaCBrZXkgaXMgdGhlIG5hbWUgb2YgYSBkYXRhIHR5cGUgYW5kIGVhY2ggdmFsdWUgaXMgYW4gYXJyYXkgb2YgcmF3IGRhdGEgb2JqZWN0c1xuICAgKi9cbiAgZnVuY3Rpb24gbmVzdFJlbGF0ZWRSZXNvdXJjZXMoeyByZXNvdXJjZURhdGFNYXBwaW5nLCBkYXRhIH0pIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IHJlc291cmNlRGF0YU1hcHBpbmcucmVzb3VyY2VcbiAgICBjb25zdCBvYmogPSByZXNvdXJjZURhdGFNYXBwaW5nLm9iamVjdFxuXG4gICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIC8vIGZvciBlYWNoIHJlbGF0aW9uc2hpcCwgYWRkIHRoZSByZWxhdGlvbnNoaXAgdG8gdGhlIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0XG4gICAgICBPYmplY3Qua2V5cyhyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKChyZWxhdGlvbnNoaXBOYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwTmFtZV0uZGF0YVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbGF0aW9uc2hpcCkpIHtcbiAgICAgICAgICBvYmpbcmVsYXRpb25zaGlwTmFtZV0gPSByZWxhdGlvbnNoaXAubWFwKChyZWxhdGlvbnNoaXBSZXNvdXJjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcFR5cGUgPSByZWxhdGlvbnNoaXBSZXNvdXJjZS50eXBlXG4gICAgICAgICAgICBsZXQgcmVsYXRlZE9iaiA9IHsgaWQ6IG9ialtyZWxhdGlvbnNoaXBOYW1lXVtpbmRleF0uaWQgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YVtyZWxhdGlvbnNoaXBUeXBlXSkge1xuICAgICAgICAgICAgICBjb25zdCB0ZW1wUmVsYXRlZE9iaiA9IGRhdGFbcmVsYXRpb25zaGlwVHlwZV0uZmluZChkID0+IGQuaWQgPT09IG9ialtyZWxhdGlvbnNoaXBOYW1lXVtpbmRleF0uaWQpXG5cbiAgICAgICAgICAgICAgaWYgKHRlbXBSZWxhdGVkT2JqKSB7XG4gICAgICAgICAgICAgICAgcmVsYXRlZE9iaiA9IHRlbXBSZWxhdGVkT2JqXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJlbGF0ZWRPYmpcbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcFR5cGUgPSByZWxhdGlvbnNoaXAudHlwZVxuXG4gICAgICAgICAgaWYgKGRhdGFbcmVsYXRpb25zaGlwVHlwZV0pIHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRPYmogPSBkYXRhW3JlbGF0aW9uc2hpcFR5cGVdLmZpbmQoZCA9PiBkLmlkID09PSBvYmpbcmVsYXRpb25zaGlwTmFtZV0uaWQpXG5cbiAgICAgICAgICAgIGlmIChyZWxhdGVkT2JqKSB7XG4gICAgICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHJlbGF0ZWRPYmpcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbnkgY2lyY3VsYXIgcmVmZXJlbmNlcyBmcm9tIGEgcmF3IGRhdGEgb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub2JqZWN0IC0gdGhlIG9iamVjdCB0byBjaGVjayBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucHJvY2Vzc2VkIC0gYSBXZWFrU2V0IG9mIGRhdGEgb2JqZWN0cyBhbHJlYWR5IGNoZWNrZWQgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnZpc2l0ZWQgLSBhIFdlYWtTZXQgb2YgZGF0YSBvYmplY3RzIGFscmVhZHkgdmlzaXRlZCBpbiB0aGUgb2JqZWN0IGhpZXJhcmNoeVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQ2lyY3VsYXJEZXBlbmRlbmNpZXMoeyBvYmplY3QsIHByb2Nlc3NlZCwgdmlzaXRlZCB9KSB7XG4gICAgbGV0IHF1ZXVlID0gW11cblxuICAgIHByb2Nlc3NlZC5hZGQob2JqZWN0KVxuXG4gICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdFtrZXldKSkge1xuICAgICAgICBvYmplY3Rba2V5XS5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGlmIChpc09iamVjdChpdGVtKSAmJiBpdGVtLmlkKSB7XG4gICAgICAgICAgICBpZiAodmlzaXRlZC5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGhhcyBhbHJlYWR5IGJlZW4gdmlzaXRlZCAoaS5lLiB0aGUgY3VycmVudCBkYXRhIG9iamVjdCBpcyBhIGRlc2NlbmRhbnQgb2YgdGhlIHByb3BlcnR5IG9iamVjdClcbiAgICAgICAgICAgICAgLy8gcmVwbGFjZSBpdCB3aXRoIGEgbmV3IG9iamVjdCB0aGF0IG9ubHkgY29udGFpbnMgdGhlIGlkXG4gICAgICAgICAgICAgIG9iamVjdFtrZXldW2luZGV4XSA9IHsgaWQ6IG9iamVjdFtrZXldW2luZGV4XS5pZCB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFwcm9jZXNzZWQuaGFzKGl0ZW0pKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkLFxuICAgICAgICAgICAgICAvLyBhZGQgaXQgdG8gdGhlIHF1ZXVlIHRvIHJlbW92ZSBhbnkgY2lyY3VsYXIgcmVmZXJlbmNlcyBpdCBjb250YWluc1xuICAgICAgICAgICAgICBxdWV1ZSA9IHF1ZXVlLmNvbmNhdChvYmplY3Rba2V5XSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9iamVjdFtrZXldKSAmJiBvYmplY3Rba2V5XS5pZCkge1xuICAgICAgICBpZiAodmlzaXRlZC5oYXMob2JqZWN0W2tleV0pKSB7XG4gICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGhhcyBhbHJlYWR5IGJlZW4gdmlzaXRlZCAoaS5lLiB0aGUgY3VycmVudCBkYXRhIG9iamVjdCBpcyBhIGRlc2NlbmRhbnQgb2YgdGhlIHByb3BlcnR5IG9iamVjdClcbiAgICAgICAgICAvLyByZXBsYWNlIGl0IHdpdGggYSBuZXcgb2JqZWN0IHRoYXQgb25seSBjb250YWlucyB0aGUgaWRcbiAgICAgICAgICBvYmplY3Rba2V5XSA9IHsgaWQ6IG9iamVjdFtrZXldLmlkIH1cbiAgICAgICAgfSBlbHNlIGlmICghcHJvY2Vzc2VkLmhhcyhvYmplY3Rba2V5XSkpIHtcbiAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCxcbiAgICAgICAgICAvLyBhZGQgaXQgdG8gdGhlIHF1ZXVlIHRvIHJlbW92ZSBhbnkgY2lyY3VsYXIgcmVmZXJlbmNlcyBpdCBjb250YWluc1xuICAgICAgICAgIHF1ZXVlID0gcXVldWUuY29uY2F0KG9iamVjdFtrZXldKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIGFkZCBpdGVtcyB0byB2aXNpdGVkXG4gICAgcXVldWUuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgdmlzaXRlZC5hZGQoaXRlbSlcbiAgICB9KVxuXG4gICAgLy8gcHJvY2VzcyB0aGUgaXRlbXNcbiAgICBxdWV1ZS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICByZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyh7IG9iamVjdDogaXRlbSwgcHJvY2Vzc2VkLCB2aXNpdGVkIH0pXG4gICAgfSlcblxuICAgIC8vIHJlbW92ZSBpdGVtcyBmcm9tIHZpc2l0ZWRcbiAgICBxdWV1ZS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICB2aXNpdGVkLmRlbGV0ZShpdGVtKVxuICAgIH0pXG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZUluY2x1ZGUsXG4gICAgZ2V0QXR0cmlidXRlcyxcbiAgICBnZXRJZCxcbiAgICBnZXRSZWxhdGlvbnNoaXAsXG4gICAgZ2V0UmVsYXRpb25zaGlwcyxcbiAgICBnZXRTY2hlbWEsXG4gICAgZ2V0VHlwZSxcbiAgICByZWdpc3RlcixcbiAgICB0cmFuc2Zvcm0sXG4gICAgdHJhbnNmb3JtRGF0YSxcbiAgICB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhLFxuICAgIHRyYW5zZm9ybVNvdXJjZSxcbiAgICB1bnRyYW5zZm9ybSxcbiAgICB1bnRyYW5zZm9ybVJlc291cmNlLFxuICAgIGdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hLFxuICAgIGdldFVudHJhbnNmb3JtZWRJZCxcbiAgICBnZXRVbnRyYW5zZm9ybWVkQXR0cmlidXRlcyxcbiAgICBuZXN0UmVsYXRlZFJlc291cmNlcyxcbiAgICByZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyxcbiAgfVxufVxuIl19