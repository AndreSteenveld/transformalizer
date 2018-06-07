'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isFunction = isFunction;
exports.isString = isString;
exports.isObject = isObject;
exports.TransformError = TransformError;
exports.validateSchema = validateSchema;
exports.validateJsonApiDocument = validateJsonApiDocument;
/**
 * isFunction borrowed from underscore.js
 * @param  {*} object
 * @return {Boolean}
 * @private
 */
function isFunction(object) {
  return !!(object && object.constructor && object.call && object.apply);
}

/**
 * Determine if a variable is a string
 * @param  {*} val
 * @return {Boolean}
 * @private
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a variable is plain old javascript object (non array, non null, non date)
 * @param  {*} object
 * @return {Boolean}
 */
function isObject(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && !Array.isArray(object) && !(object instanceof Date);
}

/**
 * Transform Error Constructor
 * @param {String} msg
 * @param {Object} args
 */
function TransformError(msg, args) {
  this.constructor.prototype.__proto__ = Error.prototype; // eslint-disable-line
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = msg;
  this.args = args;
}

/**
 * Validate a schema definition
 * @param  {Object} args
 * @param  {String} args.name - schema name/id
 * @param  {Object} args.schema - schema definition
 * @return {Object} validated
 * @private
 */
function validateSchema(_ref) {
  var name = _ref.name,
      _ref$schema = _ref.schema,
      schema = _ref$schema === undefined ? {} : _ref$schema;

  if (!isObject(schema)) {
    throw new Error('Invalid "schema" Property');
  }
  if (!isObject(schema.data)) {
    schema.data = {};
  }
  // validate untransform dataSchema
  if (schema.data.untransformDataSchema && !isFunction(schema.data.untransformDataSchema)) {
    throw new Error('Invalid "schema.data.untransformDataSchema" Property');
  }
  // validate id
  if (!isFunction(schema.data.id)) {
    schema.data.id = function getId(_ref2) {
      var data = _ref2.data;

      return data.id.toString();
    };
  }
  // validate untransform id
  if (schema.data.untransformId && !isFunction(schema.data.untransformId)) {
    throw new Error('Invalid "schema.data.untransformId" Property');
  }
  // validate type
  if (!isFunction(schema.data.type)) {
    schema.data.type = function type() {
      return name;
    };
  }
  if (schema.data.links && !isFunction(schema.data.links)) {
    throw new Error('Invalid "schema.data.links" Property');
  }
  if (schema.data.meta && !isFunction(schema.data.meta)) {
    throw new Error('Invalid "schema.data.meta" Property');
  }
  // validate attributes
  if (schema.data.attributes && !isFunction(schema.data.attributes)) {
    throw new Error('Invalid "schema.data.attributes" Property');
  }
  // validate untransform attributes
  if (schema.data.untransformAttributes && !isFunction(schema.data.untransformAttributes)) {
    throw new Error('Invalid "schema.data.untransformAttributes" Property');
  }
  // validate relationships
  if (schema.data.relationships) {
    if (!isObject(schema.data.relationships)) {
      throw new Error('Invalid "schema.data.relationships" Property');
    } else {
      Object.keys(schema.data.relationships).forEach(function (rel) {
        if (!isFunction(schema.data.relationships[rel])) {
          throw new Error('Invalid Schema: Relationship "' + rel + '" should be a function');
        }
      });
    }
  }
  // validate top level links
  if (schema.links && !isFunction(schema.links)) {
    throw new Error('Invalid "schema.links" Property');
  }
  // validate top level meta
  if (schema.meta && !isFunction(schema.meta)) {
    throw new Error('Invalid "schema.meta" Property');
  }
  return schema;
}

/**
 * Validate a json-api document
 * @param  {Object} document - an object in json-api format
 * @private
 */
function validateJsonApiDocument(document) {
  // validate top level JSON-API document
  if (!isObject(document)) {
    throw new Error('JSON-API document must be an object');
  }

  if (!document.data && !document.errors && !document.meta) {
    throw new Error('JSON-API document must contain at least one of "data", "errors", or "meta"');
  }

  if (document.data && document.errors) {
    throw new Error('JSON-API document must not contain both "data" and "errors"');
  }

  if (!document.data && document.included) {
    throw new Error('JSON-API document cannot contain "included" without "data"');
  }

  if (document.data) {
    var resources = void 0;

    if (!Array.isArray(document.data)) {
      resources = [document.data];
    } else {
      resources = document.data;
    }

    // validate primary resources
    resources.forEach(function (resource) {
      // validate id
      if (resource.id && !isString(resource.id)) {
        throw new Error('Primary data resource id "' + resource.id + '" must be a string');
      }

      // validate type
      if (!resource.type) {
        throw new Error('Primary data resource "' + resource.id + '" must have a "type" field');
      }

      if (!isString(resource.type)) {
        throw new Error('Primary data resource type "' + resource.type + '" must be a string');
      }

      // validate attributes
      if (resource.attributes && !isObject(resource.attributes)) {
        throw new Error('Primary data resource "' + resource.id + ', ' + resource.type + '" field "attributes" must be an object');
      }

      // validate relationships
      if (resource.relationships) {
        if (!isObject(resource.relationships)) {
          throw new Error('Primary data resource "' + resource.id + ', ' + resource.type + '" field "relationships" must be an object');
        }

        Object.keys(resource.relationships).forEach(function (relationshipName) {
          var relationship = resource.relationships[relationshipName];

          if (!relationship.data) {
            throw new Error('Relationship "' + relationshipName + '" of primary data resource "' + resource.id + ', ' + resource.type + '" must have a "data" field');
          }

          var data = void 0;

          if (!Array.isArray(relationship.data)) {
            data = [relationship.data];
          } else {
            data = relationship.data;
          }

          data.forEach(function (d) {
            if (!d.id) {
              throw new Error('Data of relationship "' + relationshipName + '" of primary data resource "' + resource.id + ', ' + resource.type + '" must have an "id" field');
            }

            if (!isString(d.id)) {
              throw new Error('Data "' + d.id + '" of relationship "' + relationshipName + '" of primary data resource "' + resource.id + ', ' + resource.type + '" must be a string');
            }

            if (!d.type) {
              throw new Error('Data "' + d.id + '" of relationship "' + relationshipName + '" of primary data resource "' + resource.id + ', ' + resource.type + '" must have a "type" field');
            }

            if (!isString(d.type)) {
              throw new Error('Type "' + d.type + '" of relationship "' + relationshipName + '" of primary data resource "' + resource.id + ', ' + resource.type + '" must be a string');
            }
          });
        });
      }
    });
  }

  if (document.included) {
    if (!Array.isArray(document.included)) {
      throw new Error('JSON-API document property "included" must be array');
    }

    // validate included resources
    document.included.forEach(function (resource) {
      // validate id
      if (!resource.id) {
        throw new Error('Included data resource must have an "id" field');
      }

      if (!isString(resource.id)) {
        throw new Error('Included data resource id "' + resource.id + '" must be a string');
      }

      // validate type
      if (!resource.type) {
        throw new Error('Included data resource "' + resource.id + '" must have a "type" field');
      }

      if (!isString(resource.type)) {
        throw new Error('Included data resource type "' + resource.type + '" must be a string');
      }

      // validate attributes
      if (resource.attributes && !isObject(resource.attributes)) {
        throw new Error('Included data resource "' + resource.id + ', ' + resource.type + '" field "attributes" must be an object');
      }

      // validate relationships
      if (resource.relationships) {
        if (!isObject(resource.relationships)) {
          throw new Error('Included data resource "' + resource.id + ', ' + resource.type + '" field "relationships" must be an object');
        }

        Object.keys(resource.relationships).forEach(function (relationshipName) {
          var relationship = resource.relationships[relationshipName];

          if (!relationship.data) {
            throw new Error('Relationship "' + relationshipName + '" of included data resource "' + resource.id + ', ' + resource.type + '" must have a "data" field');
          }

          var data = void 0;

          if (!Array.isArray(relationship.data)) {
            data = [relationship.data];
          } else {
            data = relationship.data;
          }

          data.forEach(function (d) {
            if (!d.id) {
              throw new Error('Data of relationship "' + relationshipName + '" of included data resource "' + resource.id + ', ' + resource.type + '" must have an "id" field');
            }

            if (!isString(d.id)) {
              throw new Error('Data "' + d.id + '" of relationship "' + relationshipName + '" of included data resource "' + resource.id + ', ' + resource.type + '" must be a string');
            }

            if (!d.type) {
              throw new Error('Data "' + d.id + '" of relationship "' + relationshipName + '" of included data resource "' + resource.id + ', ' + resource.type + '" must have a "type" field');
            }

            if (!isString(d.type)) {
              throw new Error('Type "' + d.type + '" of relationship "' + relationshipName + '" of included data resource "' + resource.id + ', ' + resource.type + '" must be a string');
            }
          });
        });
      }
    });
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi91dGlscy5qcyJdLCJuYW1lcyI6WyJpc0Z1bmN0aW9uIiwiaXNTdHJpbmciLCJpc09iamVjdCIsIlRyYW5zZm9ybUVycm9yIiwidmFsaWRhdGVTY2hlbWEiLCJ2YWxpZGF0ZUpzb25BcGlEb2N1bWVudCIsIm9iamVjdCIsImNvbnN0cnVjdG9yIiwiY2FsbCIsImFwcGx5IiwidmFsIiwiQXJyYXkiLCJpc0FycmF5IiwiRGF0ZSIsIm1zZyIsImFyZ3MiLCJwcm90b3R5cGUiLCJfX3Byb3RvX18iLCJFcnJvciIsImNhcHR1cmVTdGFja1RyYWNlIiwibmFtZSIsIm1lc3NhZ2UiLCJzY2hlbWEiLCJkYXRhIiwidW50cmFuc2Zvcm1EYXRhU2NoZW1hIiwiaWQiLCJnZXRJZCIsInRvU3RyaW5nIiwidW50cmFuc2Zvcm1JZCIsInR5cGUiLCJsaW5rcyIsIm1ldGEiLCJhdHRyaWJ1dGVzIiwidW50cmFuc2Zvcm1BdHRyaWJ1dGVzIiwicmVsYXRpb25zaGlwcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicmVsIiwiZG9jdW1lbnQiLCJlcnJvcnMiLCJpbmNsdWRlZCIsInJlc291cmNlcyIsInJlc291cmNlIiwicmVsYXRpb25zaGlwTmFtZSIsInJlbGF0aW9uc2hpcCIsImQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O1FBTWdCQSxVLEdBQUFBLFU7UUFVQUMsUSxHQUFBQSxRO1FBU0FDLFEsR0FBQUEsUTtRQVNBQyxjLEdBQUFBLGM7UUFnQkFDLGMsR0FBQUEsYztRQW1FQUMsdUIsR0FBQUEsdUI7QUFySGhCOzs7Ozs7QUFNTyxTQUFTTCxVQUFULENBQW9CTSxNQUFwQixFQUE0QjtBQUNqQyxTQUFPLENBQUMsRUFBRUEsVUFBVUEsT0FBT0MsV0FBakIsSUFBZ0NELE9BQU9FLElBQXZDLElBQStDRixPQUFPRyxLQUF4RCxDQUFSO0FBQ0Q7O0FBRUQ7Ozs7OztBQU1PLFNBQVNSLFFBQVQsQ0FBa0JTLEdBQWxCLEVBQXVCO0FBQzVCLFNBQU8sT0FBT0EsR0FB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LENBQUNBLEVBQUVyQixFQUFQLEVBQVc7QUFDVCxvQkFBTSxJQUFJUCxLQUFKLDRCQUFtQzBCLGdCQUFuQyxxQ0FBbUZELFNBQVNsQixFQUE1RixVQUFtR2tCLFNBQVNkLElBQTVHLCtCQUFOO0FBQ0Q7O0FBRUQsZ0JBQUksQ0FBQzVCLFNBQVM2QyxFQUFFckIsRUFBWCxDQUFMLEVBQXFCO0FBQ25CLG9CQUFNLElBQUlQLEtBQUosWUFBbUI0QixFQUFFckIsRUFBckIsMkJBQTZDbUIsZ0JBQTdDLHFDQUE2RkQsU0FBU2xCLEVBQXRHLFVBQTZHa0IsU0FBU2QsSUFBdEgsd0JBQU47QUFDRDs7QUFFRCxnQkFBSSxDQUFDaUIsRUFBRWpCLElBQVAsRUFBYTtBQUNYLG9CQUFNLElBQUlYLEtBQUosWUFBbUI0QixFQUFFckIsRUFBckIsMkJBQTZDbUIsZ0JBQTdDLHFDQUE2RkQsU0FBU2xCLEVBQXRHLFVBQTZHa0IsU0FBU2QsSUFBdEgsZ0NBQU47QUFDRDs7QUFFRCxnQkFBSSxDQUFDNUIsU0FBUzZDLEVBQUVqQixJQUFYLENBQUwsRUFBdUI7QUFDckIsb0JBQU0sSUFBSVgsS0FBSixZQUFtQjRCLEVBQUVqQixJQUFyQiwyQkFBK0NlLGdCQUEvQyxxQ0FBK0ZELFNBQVNsQixFQUF4RyxVQUErR2tCLFNBQVNkLElBQXhILHdCQUFOO0FBQ0Q7QUFDRixXQWhCRDtBQWlCRCxTQWhDRDtBQWlDRDtBQUNGLEtBaEVEO0FBaUVEO0FBQ0YiLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIGlzRnVuY3Rpb24gYm9ycm93ZWQgZnJvbSB1bmRlcnNjb3JlLmpzXG4gKiBAcGFyYW0gIHsqfSBvYmplY3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbihvYmplY3QpIHtcbiAgcmV0dXJuICEhKG9iamVjdCAmJiBvYmplY3QuY29uc3RydWN0b3IgJiYgb2JqZWN0LmNhbGwgJiYgb2JqZWN0LmFwcGx5KVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhcmlhYmxlIGlzIGEgc3RyaW5nXG4gKiBAcGFyYW0gIHsqfSB2YWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJ1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhcmlhYmxlIGlzIHBsYWluIG9sZCBqYXZhc2NyaXB0IG9iamVjdCAobm9uIGFycmF5LCBub24gbnVsbCwgbm9uIGRhdGUpXG4gKiBAcGFyYW0gIHsqfSBvYmplY3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdChvYmplY3QpIHtcbiAgcmV0dXJuIG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShvYmplY3QpICYmICEob2JqZWN0IGluc3RhbmNlb2YgRGF0ZSlcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gRXJyb3IgQ29uc3RydWN0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2dcbiAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBUcmFuc2Zvcm1FcnJvcihtc2csIGFyZ3MpIHtcbiAgdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuX19wcm90b19fID0gRXJyb3IucHJvdG90eXBlIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3RvcilcbiAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lXG4gIHRoaXMubWVzc2FnZSA9IG1zZ1xuICB0aGlzLmFyZ3MgPSBhcmdzXG59XG5cbi8qKlxuICogVmFsaWRhdGUgYSBzY2hlbWEgZGVmaW5pdGlvblxuICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MubmFtZSAtIHNjaGVtYSBuYW1lL2lkXG4gKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Muc2NoZW1hIC0gc2NoZW1hIGRlZmluaXRpb25cbiAqIEByZXR1cm4ge09iamVjdH0gdmFsaWRhdGVkXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVTY2hlbWEoeyBuYW1lLCBzY2hlbWEgPSB7fSB9KSB7XG4gIGlmICghaXNPYmplY3Qoc2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYVwiIFByb3BlcnR5JylcbiAgfVxuICBpZiAoIWlzT2JqZWN0KHNjaGVtYS5kYXRhKSkge1xuICAgIHNjaGVtYS5kYXRhID0ge31cbiAgfVxuICAvLyB2YWxpZGF0ZSB1bnRyYW5zZm9ybSBkYXRhU2NoZW1hXG4gIGlmIChzY2hlbWEuZGF0YS51bnRyYW5zZm9ybURhdGFTY2hlbWEgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLnVudHJhbnNmb3JtRGF0YVNjaGVtYVwiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSBpZFxuICBpZiAoIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEuaWQpKSB7XG4gICAgc2NoZW1hLmRhdGEuaWQgPSBmdW5jdGlvbiBnZXRJZCh7IGRhdGEgfSkge1xuICAgICAgcmV0dXJuIGRhdGEuaWQudG9TdHJpbmcoKVxuICAgIH1cbiAgfVxuICAvLyB2YWxpZGF0ZSB1bnRyYW5zZm9ybSBpZFxuICBpZiAoc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1JZCAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUlkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWRcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgdHlwZVxuICBpZiAoIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEudHlwZSkpIHtcbiAgICBzY2hlbWEuZGF0YS50eXBlID0gZnVuY3Rpb24gdHlwZSgpIHsgcmV0dXJuIG5hbWUgfVxuICB9XG4gIGlmIChzY2hlbWEuZGF0YS5saW5rcyAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS5saW5rcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS5saW5rc1wiIFByb3BlcnR5JylcbiAgfVxuICBpZiAoc2NoZW1hLmRhdGEubWV0YSAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS5tZXRhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLm1ldGFcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgYXR0cmlidXRlc1xuICBpZiAoc2NoZW1hLmRhdGEuYXR0cmlidXRlcyAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS5hdHRyaWJ1dGVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLmF0dHJpYnV0ZXNcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgdW50cmFuc2Zvcm0gYXR0cmlidXRlc1xuICBpZiAoc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtQXR0cmlidXRlcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUF0dHJpYnV0ZXNcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgcmVsYXRpb25zaGlwc1xuICBpZiAoc2NoZW1hLmRhdGEucmVsYXRpb25zaGlwcykge1xuICAgIGlmICghaXNPYmplY3Qoc2NoZW1hLmRhdGEucmVsYXRpb25zaGlwcykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHNcIiBQcm9wZXJ0eScpXG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5rZXlzKHNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbCkgPT4ge1xuICAgICAgICBpZiAoIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEucmVsYXRpb25zaGlwc1tyZWxdKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBTY2hlbWE6IFJlbGF0aW9uc2hpcCBcIiR7cmVsfVwiIHNob3VsZCBiZSBhIGZ1bmN0aW9uYClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cbiAgLy8gdmFsaWRhdGUgdG9wIGxldmVsIGxpbmtzXG4gIGlmIChzY2hlbWEubGlua3MgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmxpbmtzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5saW5rc1wiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSB0b3AgbGV2ZWwgbWV0YVxuICBpZiAoc2NoZW1hLm1ldGEgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLm1ldGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLm1ldGFcIiBQcm9wZXJ0eScpXG4gIH1cbiAgcmV0dXJuIHNjaGVtYVxufVxuXG4vKipcbiAqIFZhbGlkYXRlIGEganNvbi1hcGkgZG9jdW1lbnRcbiAqIEBwYXJhbSAge09iamVjdH0gZG9jdW1lbnQgLSBhbiBvYmplY3QgaW4ganNvbi1hcGkgZm9ybWF0XG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVKc29uQXBpRG9jdW1lbnQoZG9jdW1lbnQpIHtcbiAgLy8gdmFsaWRhdGUgdG9wIGxldmVsIEpTT04tQVBJIGRvY3VtZW50XG4gIGlmICghaXNPYmplY3QoZG9jdW1lbnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLUFQSSBkb2N1bWVudCBtdXN0IGJlIGFuIG9iamVjdCcpXG4gIH1cblxuICBpZiAoIWRvY3VtZW50LmRhdGEgJiYgIWRvY3VtZW50LmVycm9ycyAmJiAhZG9jdW1lbnQubWV0YSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSlNPTi1BUEkgZG9jdW1lbnQgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBvZiBcImRhdGFcIiwgXCJlcnJvcnNcIiwgb3IgXCJtZXRhXCInKVxuICB9XG5cbiAgaWYgKGRvY3VtZW50LmRhdGEgJiYgZG9jdW1lbnQuZXJyb3JzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLUFQSSBkb2N1bWVudCBtdXN0IG5vdCBjb250YWluIGJvdGggXCJkYXRhXCIgYW5kIFwiZXJyb3JzXCInKVxuICB9XG5cbiAgaWYgKCFkb2N1bWVudC5kYXRhICYmIGRvY3VtZW50LmluY2x1ZGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLUFQSSBkb2N1bWVudCBjYW5ub3QgY29udGFpbiBcImluY2x1ZGVkXCIgd2l0aG91dCBcImRhdGFcIicpXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZGF0YSkge1xuICAgIGxldCByZXNvdXJjZXNcblxuICAgIGlmICghQXJyYXkuaXNBcnJheShkb2N1bWVudC5kYXRhKSkge1xuICAgICAgcmVzb3VyY2VzID0gW2RvY3VtZW50LmRhdGFdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc291cmNlcyA9IGRvY3VtZW50LmRhdGFcbiAgICB9XG5cbiAgICAvLyB2YWxpZGF0ZSBwcmltYXJ5IHJlc291cmNlc1xuICAgIHJlc291cmNlcy5mb3JFYWNoKChyZXNvdXJjZSkgPT4ge1xuICAgICAgLy8gdmFsaWRhdGUgaWRcbiAgICAgIGlmIChyZXNvdXJjZS5pZCAmJiAhaXNTdHJpbmcocmVzb3VyY2UuaWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJpbWFyeSBkYXRhIHJlc291cmNlIGlkIFwiJHtyZXNvdXJjZS5pZH1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgdHlwZVxuICAgICAgaWYgKCFyZXNvdXJjZS50eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICB9XG5cbiAgICAgIGlmICghaXNTdHJpbmcocmVzb3VyY2UudHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmltYXJ5IGRhdGEgcmVzb3VyY2UgdHlwZSBcIiR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgYXR0cmlidXRlc1xuICAgICAgaWYgKHJlc291cmNlLmF0dHJpYnV0ZXMgJiYgIWlzT2JqZWN0KHJlc291cmNlLmF0dHJpYnV0ZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBmaWVsZCBcImF0dHJpYnV0ZXNcIiBtdXN0IGJlIGFuIG9iamVjdGApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIHJlbGF0aW9uc2hpcHNcbiAgICAgIGlmIChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgIGlmICghaXNPYmplY3QocmVzb3VyY2UucmVsYXRpb25zaGlwcykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgZmllbGQgXCJyZWxhdGlvbnNoaXBzXCIgbXVzdCBiZSBhbiBvYmplY3RgKVxuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UucmVsYXRpb25zaGlwcykuZm9yRWFjaCgocmVsYXRpb25zaGlwTmFtZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwTmFtZV1cblxuICAgICAgICAgIGlmICghcmVsYXRpb25zaGlwLmRhdGEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBoYXZlIGEgXCJkYXRhXCIgZmllbGRgKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBkYXRhXG5cbiAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVsYXRpb25zaGlwLmRhdGEpKSB7XG4gICAgICAgICAgICBkYXRhID0gW3JlbGF0aW9uc2hpcC5kYXRhXVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gcmVsYXRpb25zaGlwLmRhdGFcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgICAgIGlmICghZC5pZCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBoYXZlIGFuIFwiaWRcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC5pZCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIFwiJHtkLmlkfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBwcmltYXJ5IGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWQudHlwZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgXCIke2QuaWR9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBoYXZlIGEgXCJ0eXBlXCIgZmllbGRgKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWlzU3RyaW5nKGQudHlwZSkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUeXBlIFwiJHtkLnR5cGV9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgaWYgKGRvY3VtZW50LmluY2x1ZGVkKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGRvY3VtZW50LmluY2x1ZGVkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLUFQSSBkb2N1bWVudCBwcm9wZXJ0eSBcImluY2x1ZGVkXCIgbXVzdCBiZSBhcnJheScpXG4gICAgfVxuXG4gICAgLy8gdmFsaWRhdGUgaW5jbHVkZWQgcmVzb3VyY2VzXG4gICAgZG9jdW1lbnQuaW5jbHVkZWQuZm9yRWFjaCgocmVzb3VyY2UpID0+IHtcbiAgICAgIC8vIHZhbGlkYXRlIGlkXG4gICAgICBpZiAoIXJlc291cmNlLmlkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5jbHVkZWQgZGF0YSByZXNvdXJjZSBtdXN0IGhhdmUgYW4gXCJpZFwiIGZpZWxkJylcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc1N0cmluZyhyZXNvdXJjZS5pZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIGlkIFwiJHtyZXNvdXJjZS5pZH1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgdHlwZVxuICAgICAgaWYgKCFyZXNvdXJjZS50eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9XCIgbXVzdCBoYXZlIGEgXCJ0eXBlXCIgZmllbGRgKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzU3RyaW5nKHJlc291cmNlLnR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jbHVkZWQgZGF0YSByZXNvdXJjZSB0eXBlIFwiJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcyAmJiAhaXNPYmplY3QocmVzb3VyY2UuYXR0cmlidXRlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBmaWVsZCBcImF0dHJpYnV0ZXNcIiBtdXN0IGJlIGFuIG9iamVjdGApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIHJlbGF0aW9uc2hpcHNcbiAgICAgIGlmIChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgIGlmICghaXNPYmplY3QocmVzb3VyY2UucmVsYXRpb25zaGlwcykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIGZpZWxkIFwicmVsYXRpb25zaGlwc1wiIG11c3QgYmUgYW4gb2JqZWN0YClcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbGF0aW9uc2hpcE5hbWUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSByZXNvdXJjZS5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcE5hbWVdXG5cbiAgICAgICAgICBpZiAoIXJlbGF0aW9uc2hpcC5kYXRhKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcImRhdGFcIiBmaWVsZGApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGRhdGFcblxuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXAuZGF0YSkpIHtcbiAgICAgICAgICAgIGRhdGEgPSBbcmVsYXRpb25zaGlwLmRhdGFdXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSByZWxhdGlvbnNoaXAuZGF0YVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFkLmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgaW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBoYXZlIGFuIFwiaWRcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC5pZCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIFwiJHtkLmlkfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkLnR5cGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIFwiJHtkLmlkfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC50eXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFR5cGUgXCIke2QudHlwZX1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgaW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG59XG4iXX0=