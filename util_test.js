//browser_test and node_test have tests that actually test the rpc, sending, receiving, etc

const util = require("./util.js");

let total = 0;
let passed = 0;

function pass(test_name) {
  total += 1;
  passed += 1;
  console.log(`\x1B[32mTest PASS\x1B[m ${test_name}`);
}

function fail(test_name) {
  total += 1;
  console.log(`\x1B[31mTEST FAIL\x1B[m ${test_name}`);
}

//i miss rust
function equal_test(expected, actual) {
  return () => {
    if (expected === actual || (typeof expected === "object" && JSON.stringify(expected) === JSON.stringify(actual))) {
      return true;
    } else {
      console.log(`Found:${actual}\nExpected:${expected}`);
      return false;
    }
  };
}

//the actual tests

const tests = [
  ["whole_to_raw 1", equal_test(97380144586000000000000000000000000000n, util.whole_to_raw("973801445.86"))],
  ["whole_to_raw 2", equal_test(4224n, util.whole_to_raw("0.00000000000000000000000004224"))],
  ["whole_to_raw 3", equal_test(120700500000000000000000000004224n, util.whole_to_raw("1207.00500000000000000000000004224"))],
  ["raw_to_whole 1", equal_test("973801445.86", util.raw_to_whole(97380144586000000000000000000000000000n))],
  ["raw_to_whole 2", equal_test("0.00000000000000000000000004224", util.raw_to_whole(4224n))],
  ["raw_to_whole 3", equal_test("1207.00500000000000000000000004224", util.raw_to_whole(120700500000000000000000000004224n))],
  ["raw_to_whole 4", equal_test("1200", util.raw_to_whole(120000000000000000000000000000000n))],
  //more to come
  //
];

for (const test of tests) {
  //let exceptions happen
  let ret = test[1]();
  if (ret) {
    pass(test[0]);
  } else {
    fail(test[0]);
  }
}

console.log(`\n\x1B[${passed === total ? "32" : "31"}m${passed}/${total} tests PASSED, meaning ${total - passed} tests FAILED\x1B[m`);

if (passed < total) {
  process.exit(1);
}
