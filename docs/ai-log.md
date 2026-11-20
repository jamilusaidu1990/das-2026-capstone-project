# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 1

### Prompt 1: Build 1 audit and reference generator correction
- **What I asked:** Review the existing Build 1 implementation against docs/build-1.md and identify any requirement gaps.
- **What came back:** The audit identified that the reference generator was named referenceCode() instead of the required newReference().
- **What was wrong (or "nothing"):** The function name did not match the Build 1 requirement. I renamed it, updated its imports and usages, reran all 43 tests, checked the demo, and verified the benchmark.

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:** Implement Build 2 according to the requirements in docs/build-2.md, including event publishing, ticket tiers, booking, merge sort, search, filtering, sorting and automated tests.
- **What came back:** The Build 2 domain functionality and automated tests were implemented.
- **What was wrong (or "nothing"):** During review, the event search test file was found to be missing its final closing bracket. We corrected it and verified that all 53 tests passed.

### Prompt 2: Build 2 requirements and test review
- **What I asked:** Review the Build 2 requirements, user stories, tests and documentation for remaining gaps.
- **What came back:** The review identified that the three S04 acceptance criteria had not been filled in and that the Build 2 AI log entries were incomplete.
- **What was wrong (or "nothing"):** The S04 criteria and AI log entries were incomplete. We filled in the three S04 criteria based on the existing implementation and tests, and documented the review findings.

### Prompt 3: Build 2 final test audit
- **What I asked:** Check for missing Build 2 acceptance-test coverage, verify merge sort stability, and run the complete test suite.
- **What came back:** The review found that price-filter tests did not explicitly cover events without ticket tiers.
- **What was wrong (or "nothing"):** Added a test for events without ticket tiers, corrected its expected result, and verified that all 54 tests passed. Merge sort stability and input immutability were also verified.

## Build 3

### Prompt 1: Build 3 prompt (docs/build-3.md)
- **What I asked:** Add the architecture diagrams, booking state machine, Node HTTP router/server, configuration, startup script, and tests.
- **What came back:** A layered architecture document, explicit booking transitions, static-file HTTP server, `/health` route, startup configuration, and `node:test` coverage.
- **What was wrong (or "nothing"):** The first server draft relied on an implicit response/request property for HEAD handling and had redundant error-status logic; both were simplified. Added a regression test proving static requests cannot escape `public/`.
