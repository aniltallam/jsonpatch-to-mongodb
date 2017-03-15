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
  var pathTokens = jsonPath.split('/')
  pathTokens.shift()

  var path
  var lastToken = pathTokens.slice(-1)[0]
  if (isArrayIndex(lastToken)) { // Insert to array
    var addAtPos = Number.parseInt(lastToken)
    path = getDotPathTillParent(pathTokens)

    if (!mongoUpdate['$push']) mongoUpdate['$push'] = {}

    if (!mongoUpdate['$push'].hasOwnProperty(path)) {
      mongoUpdate['$push'][path] = {'$each': [], '$position': -99}
    } else if (!mongoUpdate['$push'][path].hasOwnProperty('$position')) {
      // already append to array operation was proccessed from patch data. cannot support both insert and append to array in a single mongo update call.
      throw new Error('Invalid Operation')
    } else if (mongoUpdate['$push'][path]['$position'] !== -99 && mongoUpdate['$push'][path]['$position'] !== addAtPos) {
      // already data is getting added at different position. cannot support insertion at multiple positions in a single mongo update call.
      throw new Error('Invalid Operation')
    }
    mongoUpdate['$push'][path]['$each'].push(value)
    mongoUpdate['$push'][path]['$position'] = addAtPos
  } else if (lastToken === '-') { // Append to array
    path = getDotPathTillParent(pathTokens)

    if (!mongoUpdate['$push']) mongoUpdate['$push'] = {}

    if (!mongoUpdate['$push'].hasOwnProperty(path)) {
      mongoUpdate['$push'][path] = {'$each': []}
    } else if (mongoUpdate['$push'][path].hasOwnProperty('$position')) {
      // already insert in array operation was proccessed from patch data. cannot support both insert and append to array in a single mongo update call.
      throw new Error('Invalid Operation')
    }
    mongoUpdate['$push'][path]['$each'].push(value)
  } else { // add to or replace in an object
    path = getDotPath(pathTokens)
    if (!mongoUpdate['$set']) mongoUpdate['$set'] = {}
    mongoUpdate['$set'][path] = value
  }
}

function removeOp (mongoUpdate, jsonPath) {
  var pathTokens = jsonPath.split('/')
  pathTokens.shift()

  var path
  var lastToken = pathTokens.slice(-1)[0]
  if (isArrayIndex(lastToken)) { // remove from array
    path = getDotPath(pathTokens)
    var pathToParent = getDotPathTillParent(pathTokens)
    if (!mongoUpdate['$unset']) mongoUpdate['$unset'] = {}
    // Currently remove by index is not supported by mongo. following is the workaround for that.
    // https://jira.mongodb.org/browse/SERVER-1014
    mongoUpdate['$unset'][path] = '' // doesn't matter what we assign here. in db the value is set to null
    mongoUpdate['$pull'][pathToParent] = null // Removes the previously set null value item from array.
  } else { // remove from object
    path = getDotPath(pathTokens)
    if (!mongoUpdate['$unset']) mongoUpdate['$unset'] = {}
    mongoUpdate['$unset'][path] = '' // doesn't matter what we assign here
  }
}

function replaceOp (mongoUpdate, path, value) {
  // as per json patch replace spec we have to unset and set same property
  // but both of them on same property in single update operation is not supported in mongo.
  path = toMongoPath(path)
  if (!mongoUpdate['$set']) mongoUpdate['$set'] = {}
  mongoUpdate['$set'][path] = value
}

function moveOp (mongoUpdate, toPath, fromPath) {
  toPath = toMongoPath(toPath)
  fromPath = toMongoPath(fromPath)
  if (!mongoUpdate['$rename']) mongoUpdate['$rename'] = {}
  mongoUpdate['$rename'][fromPath] = toPath
}

// Helper methods

function isArrayIndex (value) { return /^\d+$/.test(value) }

// converts json path (/a/b/c) to mongo path (a.b.c)
function toMongoPath (path) {
  return path.replace(/\//g, '.').replace(/./, '')
}

function getDotPath (pathTokens) {
  var tokenCount = pathTokens.length
  return pathTokens.reduce(function (path, token, index) {
    path += token
    if (index < tokenCount - 1) path += '.'
    return path
  }, '')
}

function getDotPathTillParent (pathTokens) {
  pathTokens = pathTokens.slice(0, -1)
  return getDotPath(pathTokens)
}

exports.jsonPatchToMongoUpdateObject = jsonPatchToMongoUpdateObject
