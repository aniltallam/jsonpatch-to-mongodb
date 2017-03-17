function jsonPatchToMongoUpdateObject (jsonPatch) {
  var mongoUpdate = {}
  jsonPatch.forEach(function (oprn) {
    if (!oprn['op']) throw new Error('missing \'op\' property in patch operation data')
    if (!oprn['path']) throw new Error('missing \'path\' property in patch operation data')

    switch (oprn['op']) {
      case 'add':
        if (!oprn['value']) throw new Error('missing \'value\' property in add operation data')
        return addOp(mongoUpdate, oprn['path'], oprn['value'])
      case 'remove':
        return removeOp(mongoUpdate, oprn['path'])
      case 'replace':
        if (!oprn['value']) throw new Error('missing \'value\' property in replace operation data')
        return replaceOp(mongoUpdate, oprn['path'], oprn['value'])
      case 'move':
        if (!oprn['from']) throw new Error('missing \'from\' property in move operation data')
        return moveOp(mongoUpdate, oprn['path'], oprn['from'])
      default:
        // 'copy' and 'test' oeprations are not supported.
        throw new Error('Operation \'' + oprn['op'] + '\' is not supported')
    }
  })
  return mongoUpdate
}

function addOp (mongoUpdate, jsonPath, value) {
  var path
  var lastToken = getLastToken(jsonPath)
  if (isArrayIndex(lastToken)) { // Insert to array
    var addAtPos = Number.parseInt(lastToken)
    path = getMongoPathTillParent(jsonPath)
    if (!mongoUpdate['$push']) mongoUpdate['$push'] = {}

    if (!mongoUpdate['$push'].hasOwnProperty(path)) {
      mongoUpdate['$push'][path] = {'$each': [], '$position': -99}
    } else if (!mongoUpdate['$push'][path].hasOwnProperty('$position')) {
      // already append to array operation was proccessed from patch data. cannot support both insert and append to array in a single mongo update call.
      throw new Error('Cannot support both insert and append to array')
    } else if (mongoUpdate['$push'][path]['$position'] !== -99 && mongoUpdate['$push'][path]['$position'] !== addAtPos) {
      // already data is getting added at different position. cannot support insertion at multiple positions in a single mongo update call.
      throw new Error('Cannot support insertion at multiple positions')
    }
    mongoUpdate['$push'][path]['$each'].push(value)
    mongoUpdate['$push'][path]['$position'] = addAtPos
  } else if (lastToken === '-') { // Append to array
    path = getMongoPathTillParent(jsonPath)

    if (!mongoUpdate['$push']) mongoUpdate['$push'] = {}

    if (!mongoUpdate['$push'].hasOwnProperty(path)) {
      mongoUpdate['$push'][path] = {'$each': []}
    } else if (mongoUpdate['$push'][path].hasOwnProperty('$position')) {
      // already insert in array operation was proccessed from patch data. cannot support both insert and append to array in a single mongo update call.
      throw new Error('Cannot support both insert and append to array')
    }
    mongoUpdate['$push'][path]['$each'].push(value)
  } else { // add to or replace in an object
    path = toMongoPath(jsonPath)
    if (!mongoUpdate['$set']) mongoUpdate['$set'] = {}
    mongoUpdate['$set'][path] = value
  }
}

function removeOp (mongoUpdate, jsonPath) {
  var path
  var lastToken = getLastToken(jsonPath)
  if (isArrayIndex(lastToken)) { // remove from array
    // Currently remove by index is not supported by mongo.
    // https://jira.mongodb.org/browse/SERVER-1014
    throw new Error('Remove at array index is not supported')
    // path = toMongoPath(jsonPath)
    // var pathToParent = getMongoPathTillParent(jsonPath)
    // if (!mongoUpdate['$unset']) mongoUpdate['$unset'] = {}
    // if (!mongoUpdate['$pull']) mongoUpdate['$pull'] = {}
    // mongoUpdate['$unset'][path] = '' // doesn't matter what we assign here. in db the value is set to null
    // mongoUpdate['$pull'][pathToParent] = null // Removes the previously set null value item from array.
  } else { // remove from object
    path = toMongoPath(jsonPath)
    if (!mongoUpdate['$unset']) mongoUpdate['$unset'] = {}
    mongoUpdate['$unset'][path] = '' // doesn't matter what we assign here
  }
}

function replaceOp (mongoUpdate, jsonPath, value) {
  if (isArrayIndex(getLastToken(jsonPath))) { // remove from array
    // Replace at array index is not working in mongoose version "4.6.8",
    // but works in latest mongoose versions.
    throw new Error('Replace at array index is not supported')
  }
  if (!mongoUpdate['$set']) mongoUpdate['$set'] = {}
  var path = toMongoPath(jsonPath)
  // As per json patch replace spec we have to unset and set same property
  // but both of them on same property in single update operation is not supported in mongo.
  mongoUpdate['$set'][path] = value
}

function moveOp (mongoUpdate, toPath, fromPath) {
  toPath = toMongoPath(toPath)
  fromPath = toMongoPath(fromPath)
  if (!mongoUpdate['$rename']) mongoUpdate['$rename'] = {}
  mongoUpdate['$rename'][fromPath] = toPath
}

// Helper methods

// returns true for value = (0,1,2...) and false for others including -1, 0.5 etc
function isArrayIndex (value) { return /^\d+$/.test(value) }

// converts json path (/a/b/c) to mongo path (a.b.c)
function toMongoPath (path) {
  return path.replace(/\//g, '.').replace(/./, '')
}

// convets json path (/a/b/c/d) to mongo path (a.b.c)
function getMongoPathTillParent (jsonPath) {
  return jsonPath.split('/').slice(0, -1).join('.').replace(/./, '')
}

// returns 'c' for '/a/b/c'
function getLastToken (jsonPath) {
  return jsonPath.split('/').slice(-1)[0]
}

exports.jsonPatchToMongoUpdateObject = jsonPatchToMongoUpdateObject
