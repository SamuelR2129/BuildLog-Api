.PHONY: build-CRUDDependencyLayer build-lambda-common
.PHONY: build-UploadPostToDynamo build-GetPostsFromDynamo build-GetTableData build-DeletePostFromDynamo build-UpdatePostInDynamo

# Feed Api's
build-UploadPostToDynamo:
	$(MAKE) HANDLER=src/posts/savePost.ts build-lambda-common
build-GetPostsFromDynamo:
	$(MAKE) HANDLER=src/posts/getPosts.ts build-lambda-common
build-DeletePostFromDynamo:
	$(MAKE) HANDLER=src/posts/deletePost.ts build-lambda-common
build-UpdatePostInDynamo:
	$(MAKE) HANDLER=src/posts/updatePost.ts build-lambda-common

# Table Api's
build-GetTableData:
	$(MAKE) HANDLER=src/table/getTableData.ts build-lambda-common

build-lambda-common:
	npm install
	rm -rf dist
	echo "{\"extends\": \"./tsconfig.json\", \"include\": [\"${HANDLER}\"] }" > tsconfig-only-handler.json
	npm run build -- --build tsconfig-only-handler.json
	cp -r dist "$(ARTIFACTS_DIR)/"

build-CRUDDependencyLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/nodejs/"
	npm install --production --prefix "$(ARTIFACTS_DIR)/nodejs/"
	rm "$(ARTIFACTS_DIR)/nodejs/package.json" # to avoid rebuilding when changes doesn't relate to dependencies