const {
  JsiiProject,
  Semver
} = require('projen');

const AWS_CDK_LATEST_RELEASE = '1.60.0';
const CONSTRUCTS_VERSION = '3.0.4';
const PROJECT_NAME = 'cdk-fargate-fastautoscaler';
const PROJECT_DESCRIPTION = 'A JSII construct lib to build AWS Fargate Fast Autoscaler';

const project = new JsiiProject({
  name: PROJECT_NAME,
  jsiiVersion: Semver.caret('1.5.0'),
  description: PROJECT_DESCRIPTION,
  repository: 'https://github.com/aws-samples/aws-fargate-fast-autoscaler.git',
  authorName: 'Pahud Hsieh',
  authorEmail: 'hunhsieh@amazon.com',
  stability: 'experimental',
  devDependencies: {
    '@aws-cdk/assert': Semver.caret(AWS_CDK_LATEST_RELEASE),
    '@types/jest': Semver.caret('25.2.3'),
    '@types/node': Semver.caret('14.0.11'),
    'ts-jest': Semver.caret('25.3.1'),
    'jest': Semver.caret('25.5.0'),
    'dot-prop': Semver.caret('5.1.1'),
  },
  peerDependencies: {
    constructs: Semver.pinned(CONSTRUCTS_VERSION),
    '@aws-cdk/core': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-ec2': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-ecs': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-elasticloadbalancingv2': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-iam': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-lambda': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-sns': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions-tasks': Semver.pinned(AWS_CDK_LATEST_RELEASE),
  },
  dependencies: {
    constructs: Semver.pinned(CONSTRUCTS_VERSION),
    '@aws-cdk/core': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-ec2': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-ecs': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-elasticloadbalancingv2': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-iam': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-lambda': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-sns': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions': Semver.pinned(AWS_CDK_LATEST_RELEASE),
    '@aws-cdk/aws-stepfunctions-tasks': Semver.pinned(AWS_CDK_LATEST_RELEASE),
  },
  python: {
    distName: 'cdk-fargate-fastautoscaler',
    module: 'cdk_fargate_fastautoscaler'
  }
});

project.addFields({
  'keywords': [
    'aws',
    'fargate',
    'autoscaler',
  ]
});

project.addFields({
  'awscdkio': {
    'twitter': '@pahudnet',
    'announce': false,
  }
});


const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();
