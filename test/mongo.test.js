var toMongodb = require('../jsonPatchUtil').jsonPatchToMongoUpdateObject
var jsonpatch = require('fast-json-patch')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var should = require('should')

mongoose.set('debug', true)
describe.only('mytests', function () {
  var TestModel
  before(function (done) {
    mongoose.connect('mongodb://localhost/local')
    mongoose.connection.once('connected', function () {
      console.log('Connected to database')
      var testSchema = new Schema({
        name: { type: String, patch: true },
        count: { type: Number, patch: true },
        isValid: { type: Boolean, patch: true },
        address: { type: String },
        basicAuth: {
          username: {type: String, patch: true}
        },
        headers: [{
          name: { type: String, patch: true },
          value: { type: String, patch: true },
          _id: false
        }],
        footers: [{
          name: { type: String },
          value: { type: String, patch: true },
          _id: false
        }]
      })
      TestModel = mongoose.model('testPatchschema', testSchema)
      // patchWhitelist = modelUtil.getPatchWhitelist(TestModel)
      done()
    })
  })
  after(function (done) {
    TestModel.remove(done)
  })

  it('add', function (done) {
    var originalDoc = {
      name: 'doc1'
    }
    var expectedFinalDoc = {
      name: 'doc1',
      count: 1
    }
    var patchData = [
      {
        op: 'add',
        path: '/count',
        value: 1
      }
    ]

    patchMongoDoc(originalDoc, patchData, function (err, updatedDoc) {
      if (err) return done(err)
      updatedDoc.should.containEql(expectedFinalDoc)
      done()
    })
  })

  it('remove', function (done) {
    var originalDoc = {
      name: 'doc1',
      count: 1
    }
    var expectedFinalDoc = {
      name: 'doc1'
    }
    var patchData = [
      {
        op: 'remove',
        path: '/count'
      }
    ]
    patchMongoDoc(originalDoc, patchData, function (err, updatedDoc) {
      if (err) return done(err)
      updatedDoc.should.containEql(expectedFinalDoc)
      done()
    })
  })

  it('replace', function (done) {
    var originalDoc = {
      name: 'doc1'
    }
    var expectedFinalDoc = {
      name: 'New doc'
    }
    var patchData = [
      {
        op: 'replace',
        path: '/name',
        value: 'New doc'
      }
    ]

    patchMongoDoc(originalDoc, patchData, function (err, updatedDoc) {
      if (err) return done(err)
      updatedDoc.should.containEql(expectedFinalDoc)
      done()
    })
  })
  it('move', function (done) {
    var originalDoc = {
      name: 'doc1',
      count: 1,
      isValid: true,
      address: 'hyderabad',
      basicAuth: { username: 'username1' },
      headers: [{name: 'h0_n', value: 'h0_v'}, {name: 'h1_n', value: 'h1_v'}, {name: 'h2_n', value: 'h2_v'}],
      footers: [{name: 'f0_n', value: 'f0_v'}, {name: 'f1_n', value: 'f1_v'}, {name: 'f2_n', value: 'f2_v'}]
    }
    var expectedFinalDoc = {
      name: 'doc1',
      count: 1,
      isValid: true,
      address: 'hyderabad',
      basicAuth: { username: 'username1' },
      footers: [{name: 'h0_n', value: 'h0_v'}, {name: 'h1_n', value: 'h1_v'}, {name: 'h2_n', value: 'h2_v'}]
    }
    var patchData = [
      {
        op: 'move',
        from: '/headers',
        path: '/footers'
      }
    ]

    patchMongoDoc(originalDoc, patchData, function (err, updatedDoc) {
      if (err) return done(err)
      updatedDoc.should.containEql(expectedFinalDoc)
      done()
    })
  })

  it('add, remove and replace at a time', function (done) {
    var originalDoc = {
      name: 'doc1',
      count: 1,
      isValid: true,
      address: 'hyderabad',
      basicAuth: { username: 'username1' },
      headers: [{name: 'h0_n', value: 'h0_v'}, {name: 'h1_n', value: 'h1_v'}, {name: 'h2_n', value: 'h2_v'}],
      footers: [{name: 'f0_n', value: 'f0_v'}, {name: 'f1_n', value: 'f1_v'}, {name: 'f2_n', value: 'f2_v'}]
    }

    var expectedFinalDoc = {
      name: 'doc1_patch',
      count: 10,
      address: 'hyderabad',
      // isValid: false,
      // phone: '+91987654321',
      basicAuth: { username: 'username1_patch' },
      headers: [{name: 'h0_n', value: 'h0_v'}, {name: 'h1_n', value: 'h1_v'}, {name: 'h2_n', value: 'h2_v'}, {name: 'h3_n', value: 'h3_v'}],
      footers: [{name: 'f0_n', value: 'f0_v'}, {name: 'f1_n', value: 'f1_v_patched'}, {name: 'f2_n', value: 'f2_v'}]
      // headers: [{name: 'h0_n_patch', value: 'h0_v_patch'}],
      // footers: [{name: 'f0_n', value: 'f0_v_patch'}, {name: 'f1_n', value: 'f1_v_patch'}, {name: 'f2_n', value: 'f2_v'}]
      // headers: [{name: 'f0_n', value: 'f0_v'}, {name: 'f1_n', value: 'f1_v'}, {name: 'f2_n', value: 'f2_v'}],
      // footers: [{name: 'f0_n_new', value: 'f0_v_new'}]
    }

    var patchData = [
      // {
      //   "op": "replace",
      //   "path": "/footers/1/name",
      //   "value": 'hack 123'
      // },
      // {
      //   "op": "replace",
      //   "path": "/footers/1",
      //   "value": {
      //     "name": "f1_n",
      //     "value": "f1_v_patched"
      //   }
      // },
      // {
      //   "op": "replace",
      //   "path": "/footers/0",
      //   "value": {"name": "f1_n0", "value": "f0_v_patched", gen: 123}
      // },
      {
        "op": "add",
        "path": "/headers/3",
        "value": {
          "name": "h3_n",
          "value": "h3_v"
        }
      },
      {
        "op": "replace",
        "path": "/basicAuth/username",
        "value": "username1_patch"
      },
      {
        "op": "add",
        "path": "/phone",
        "value": "+91987654321"
      },
      {
        "op": "replace",
        "path": "/count",
        "value": 10
      },
      {
        "op": "replace",
        "path": "/name",
        "value": "doc1_patch"
      },
      {
        "op": "remove",
        "path": "/isValid"
      }
    ]

    // patchData = jsonpatch.compare(originalDoc, expectedFinalDoc)
    // var jiff = require('jiff')
    // patchData = jiff.diff(originalDoc, expectedFinalDoc, {invertible: false})

    patchMongoDoc(originalDoc, patchData, function (err, updatedDoc) {
      if (err) return done(err)
      console.log('updatedDoc', JSON.stringify(updatedDoc, null, 2))
      console.log('expectedFinalDoc', JSON.stringify(expectedFinalDoc, null, 2))
      // updatedDoc.should.containEql(expectedFinalDoc)
      done()
    })
  })

  function patchMongoDoc (originalDoc, patchData, callback) {
    // saveApproach(originalDoc, patchData, callback)
    updateApproach(originalDoc, patchData, callback)
  }

  function saveApproach (originalDoc, patchData, callback) {
    var mongoDoc = new TestModel(originalDoc)
    mongoDoc.save(function (err, mongoDoc) {
      if (err) return callback(err)
      // var savedDocObj = savedDoc.toObject()
      // console.log('before => ', JSON.stringify(savedDocObj, null, 2))
      // validateForWhiteListedProps(patchWhitelist, patches[key])

      jsonpatch.apply(mongoDoc, patchData)
      mongoDoc.save(function (err, finalMongoDoc) {
        if (err) return callback(err)
        // var finalSavedDoc = finalMongoDoc.toObject()
        // console.log('after => ', JSON.stringify(finalSavedDoc, null, 2))
        return callback(err, finalMongoDoc.toObject())
      })
    })
  }

  function updateApproach (originalDoc, patchData, callback) {
    var mongoDoc = new TestModel(originalDoc)
    mongoDoc.save(function (err, mongoDoc) {
      if (err) return callback(err)
      console.log('patchData ->', JSON.stringify(patchData, null, 2))
      var updateObj = toMongodb(patchData)
      console.log('updateObj ->', JSON.stringify(updateObj, null, 2))
      TestModel.update({_id: mongoDoc._id}, updateObj, {}, function (err, rawMongoResponse) {
        if (err) return callback(err)
        // console.log('rawMongoResponse', rawMongoResponse)
        // return callback(err, rawMongoResponse)
        TestModel.findOne({_id: mongoDoc._id}, function (err, finalMongoDoc) {
          if (err) return callback(err)
          // var finalSavedDoc = finalMongoDoc.toObject()
          // console.log('after => ', JSON.stringify(finalSavedDoc, null, 2))
          return callback(err, finalMongoDoc.toObject())
        })
      })
    })
  }
})
