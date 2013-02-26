REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require assert \
		--reporter $(REPORTER) \
		--timeout 60000

.PHONY: test