include make.d/make.mk
include make.d/version.mk
include make.d/nexus.mk

in-ci ?= $(in-cluster)



workspace: ## setup workspace, including npm and environment variables

install-and-build: install build

install:
	npm $(if $(filter false,$(in-ci)),install,ci)

.PHONY:install

build:
	npm run build

.PHONY:build

test:
	npm run test

.PHONY:test

gulp-command = npx gulp

release: ## Make release
release: version~print create-release

create-release: export TAG_VERSION=$(version)

create-release:
	@: $(info Create release $(version-tag))
	$(gulp-command) release

publish-release-gh: export GITHUB_USER=$(git-github-username)
publish-release-gh: export GITHUB_TOKEN=$(git-github-password)

publish-release-gh:
	gh release create $(version-tag) ./package/*/*.zip --title 'Nuxeo Browser Extension ${version-tag}' -n '    Release Note - Browser Developer Extensions - Version $(version-tag)'