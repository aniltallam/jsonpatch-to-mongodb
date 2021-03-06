var assert = require('assert')
// var toMongodb = require('../');
var toMongoPatch = require('../jsonPatchUtil').toMongoPatch
var chai = require('chai')

describe('jsonpatch to mongodb', function () {
  it('should work with single add', function () {
    var patches = [{
      op: 'add',
      path: '/name',
      value: 'dave'
    }]
    var expected = {
      $set: {
        name: 'dave'
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should work with multiple adds', function () {
    var patches = [{
      op: 'add',
      path: '/name',
      value: 'dave'
    }, {
      op: 'add',
      path: '/name',
      value: 'bob'
    }, {
      op: 'add',
      path: '/name',
      value: 'john'
    }]
    var expected = {
      $set: {
        name: 'john'
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should work with array set', function () {
    var patches = [{
      op: 'add',
      path: '/name/1',
      value: 'dave'
    }]
    var expected = {
      $push: {
        name: {
          $each: [
            'dave'
          ],
          $position: 1
        }
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should work with multiple set', function () {
    var patches = [{
      op: 'add',
      path: '/name/1',
      value: 'dave'
    }, {
      op: 'add',
      path: '/name/2',
      value: 'bob'
    }]
    // var expected = {
    //   $push: {
    //     name: {
    //       $each: [
    //         'dave',
    //         'bob'
    //       ],
    //       $position: 1
    //     }
    //   }
    // }
    // assert.deepEqual(toMongodb(patches), expected)
    chai.expect(function () { toMongoPatch(patches) }).to.throw('Cannot support insertion at multiple positions')
  })

  it('should work with multiple adds -', function () {
    var patches = [{
      op: 'add',
      path: '/name/-',
      value: 'dave'
    }, {
      op: 'add',
      path: '/name/-',
      value: 'bob'
    }, {
      op: 'add',
      path: '/name/-',
      value: 'john'
    }]
    var expected = {
      $push: {
        name: {$each: ['dave', 'bob', 'john']}
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should work with remove', function () {
    var patches = [{
      op: 'remove',
      path: '/name',
      value: 'dave'
    }]
    var expected = {
      $unset: {
        name: ''
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should work with replace', function () {
    var patches = [{
      op: 'replace',
      path: '/name',
      value: 'dave'
    }]
    var expected = {
      $set: {
        name: 'dave'
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should blow up on move', function () {
    var patches = [{
      op: 'move',
      path: '/name',
      from: '/old_name'
    }]
    var expected = {
      $rename: {
        old_name: 'name'
      }
    }
    assert.deepEqual(toMongoPatch(patches), expected)
  })

  it('should blow up on test', function () {
    var patches = [{
      op: 'test',
      path: '/name',
      value: 'dave'
    }]
    chai.expect(function () { toMongoPatch(patches) }).to.throw('Operation \'test\' is not supported')
  })

  it('should blow up on copy', function () {
    var patches = [{
      op: 'copy',
      path: '/name',
      from: '/old_name'
    }]
    chai.expect(function () { toMongoPatch(patches) }).to.throw('Operation \'copy\' is not supported')
  })
})

