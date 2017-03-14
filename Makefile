MOCHA=./node_modules/.bin/mocha

ENVIRONMENT_VARIABLES = NODE_ENV=unittest

test:
	@$(ENVIRONMENT_VARIABLES) \
	$(MOCHA) test

.PHONY: test
