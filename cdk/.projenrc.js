const {
  JsiiProject,
  Semver
} = require('projen');

const AWS_CDK_LATEST_RELEASE = '1.45.0';
const PROJECT_NAME = 'fargate-fast-autoscaler';
const PROJECT_DESCRIPTION = 'A Serverless Fargate Autoscaler';

const project = new JsiiProject({
  name: PROJECT_NAME,
  jsiiVersion: Semver.caret('1.5.0'),
  description: PROJECT_DESCRIPTION,
  repository: 'https://github.com/aws-samples/aws-fargate-fast-autoscaler.git',
  authorName: 'Pahud Hsieh',
  authorEmail: 'hunhsieh@amazon.com',
  stability: 'experimental',
  devDependencies: {
    '@aws-cdk/assert': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@types/jest': Semver.caret('25.2.3'),
    '@types/node': Semver.caret('14.0.11'),
  },
  dependencies: {
    constructs: Semver.pinned('3.0.3'),
    '@aws-cdk/core': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-ecs': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions-tasks': Semver.pinned(AWS_CDK_LATEST_RELEASE),

  },
  python: {
    distName: 'cdk-fargate-fast-autoscaler',
    module: 'cdk_fargate_fast_autoscaler'
  }
});

project.addFields({
  'keywords': [
    'cdk',
    'aws',
    'fargate',
    'autoscaling'
  ]
});

project.synth();
