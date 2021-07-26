/**
 * Asynch test with Jest
 *
 * Proof of Concept to show how to run asynchronous tests with
 * Jest.
 *
 *   npm init -y
 *   npm install mongoose
 *   npm i jest --save-dev
 *
 * Add to package.json:
 *
 *   "scripts": {
 *     "test": "jest --detectOpenHandles --passWithNoTests"
 *   },
 *
 * A connection to a MongoDB database is opened asynchronously
 * before tests begin, and closed by a timeout, hopefully after
 * all the tests have been run.
 *
 * This script attempts to create two MongoDB documents, but one
 * has the wrong format, so the creation should fail.
 */

const openDB = require('./db') // Promise resolves when db is open
const TestModel = require('./model')

const TIMEOUT_DELAY = 1000

const testData = [
  {
    // data in the right format, so validation will succeed
    username: "username",
    password: "password",
    willBeCreated: true,
    willPass: true
  },
  {
    // data in the wrong format, so no record will be created
    user: "user",
    password: "password",
    willBeCreated: false,
    willPass: false
  },
  {
    // data with extra properties, which will not be included
    username: "with-added-prop",
    password: "password",
    prop: "value",
    willBeCreated: true,
    willPass: false
  }
]

describe("Test connection to database", testDatabase)

function testDatabase() {
  test("Test that model validates correctly", testModel);
}

function testModel(done) {
  // result will be passed to the closeDB method. It will hold
  // the done function, so that it can be called after the database
  // closes. It may also have an `error` property added if a test
  // fails.
  // If`silent` is true, the closeDB() function will not log any
  // messages to the console.

  const result = { done, silent: false }

  // The number of tests depends on whether the first model-
  // validation test succeeds or not
  const assertionCount = testData.reduce((count, data) => {
    return count + 1 + (2 * data.willBeCreated)
  }, 0)
  expect.assertions(assertionCount)

  // Wait until the openDB promise resolves before running tests
  openDB.then(runTest)

  function runTest({ db, closeDB, mongoose }) {
    // Start by preparing to drop the test database and close the
    // connection. If this is not done, Node will not exit after
    // the tests are complete.
    setTimeoutToCloseConnection(TIMEOUT_DELAY)

    testData.forEach(expectedData => {
      const testDoc = new TestModel(expectedData)
      // testDoc will contain a postulate _id plus all the
      // properties that have been validated. The non-conforming
      // "user" property will have been removed. The _id will not
      // be used if the testDoc is not valid.

      testDoc.save((error, doc) => {
        // .save will produce an error if testDoc does not
        // correspond to the model schema

        try {
          if (expectedData.willBeCreated) {
            expect(error).toBeNull()

            const { username } = expectedData
            const query = { username }

            // Tell mongoose to return a Plain Old JavaScript Object
            // (POJO), by using `.lean()`
            TestModel.findOne(query, callback).lean()

          } else {
            expect(error).not.toBeNull()
          }

        } catch { error } {
          // The input for one of the expect() statements was not
          // the value expected. A failed `expect()` test will
          // throw an error
          //
          // We need to catch the error, so that it will not be
          // thrown immediately. We add it to `result` so that it
          // can be passed as an argument to the done() function.
          result.error = error
        }
      })

      /**
       * Callback for the TestModel.findOne() call.
       */
      function callback(error, retrievedData) {
        if (error) {
          // Not tested. How would this happen?
          result.error = error
          return
        }

        try {
          expect(retrievedData).not.toBeNull()
          // It would be null if the username were wrong or if no
          // record had been created

          if (retrievedData) {
            // Delete properties added by Mongoose
            delete retrievedData._id
            delete retrievedData.__v

            if (retrievedData.willPass) {
              expect(retrievedData).toEqual(expectedData);
            } else {
              expect(retrievedData).not.toEqual(expectedData)
            }
          }
        } catch (error) {
          result.error = error
        }
      }
    })

    function setTimeoutToCloseConnection(delay) {
      setTimeout(() => {
        // We need to close the database connection, or Jest
        // will keep Node hanging. We can take this opportunity
        // to delete the `test` database completely so that the
        // next time we run the test, we start with a clean slate.

        db.dropDatabase().then(() => {
          // closeDB will check for the presence of
          // * a `done` function
          // * an `error`
          // * a `silent` flag
          closeDB(result)
        })
      }, delay)
    }
  }
}
