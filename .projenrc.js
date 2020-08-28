const {
  ConstructLibraryAws,
} = require('projen');

const AWS_CDK_LATEST_RELEASE = '1.61.1';
const PROJEN_PINNED_VERSION = '0.3.47';
const PROJECT_NAME = 'cdk-fargate-fastautoscaler';
const PROJECT_DESCRIPTION = 'A JSII construct lib to build AWS Fargate Fast Autoscaler';
const PROJECT_REPOSITORY = 'https://github.com/pahud/cdk-spot-one.git'

const project = new ConstructLibraryAws({
  "authorName": "Pahud Hsieh",
  "authorEmail": "pahudnet@gmail.com",
  "name": PROJECT_NAME,
  "description": PROJECT_DESCRIPTION,
  "repository": PROJECT_REPOSITORY,

  keywords: [
    'aws',
    'fargate',
    'autoscaler',
  ],

  catalog: {
    twitter: 'pahudnet',
    announce: false,
  },

  // creates PRs for projen upgrades
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',

  cdkVersion: AWS_CDK_LATEST_RELEASE,
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-elasticloadbalancingv2',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-sns',
    '@aws-cdk/aws-stepfunctions',
    '@aws-cdk/aws-stepfunctions-tasks',
  ],

  python: {
    distName: 'cdk-fargate-fastautoscaler',
    module: 'cdk_fargate_fastautoscaler'
  }
});


if (PROJEN_PINNED_VERSION) {
  project.devDependencies.projen = PROJEN_PINNED_VERSION;
}

const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude, '/codebase');
project.gitignore.exclude(...common_exclude);

project.synth();
