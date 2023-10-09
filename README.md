# BuildLog

The lambdas for BuildLog, simple CRUD with AWS integration

START UP

-   nvm install 18 (make sure you have nvm)
-   npm i
-   brew install tmux (make sure to have homebrew)
-   brew install overmind

TO RUN

-   overmind start

(Note: For local development you need to delete .aws-sam directory, so that overmind doesnt use the code from there.)

REPO REFERENCES

Structure of the lambdas
https://github.com/DevSazal/aws-sam-nodejs-app-with-lambda-dynamodb

Setting up the lambda layer dependencies, overmind for local development, Makefile for deployment
https://github.com/Envek/aws-sam-typescript-layers-example

CICD with SAM Pipeline template to Github Actions
https://aws.amazon.com/blogs/compute/introducing-aws-sam-pipelines-automatically-generate-deployment-pipelines-for-serverless-applications/
