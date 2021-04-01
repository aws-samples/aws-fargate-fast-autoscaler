const { AwsCdkConstructLibrary } = require('projen');
const { Automation } = require('projen-automate-it');


const AWS_CDK_LATEST_RELEASE = '1.78.0';
const PROJECT_NAME = 'cdk-fargate-fastautoscaler';
const PROJECT_DESCRIPTION = 'A JSII construct lib to build AWS Fargate Fast Autoscaler';
const PROJECT_REPOSITORY = 'https://github.com/aws-samples/aws-fargate-fast-autoscaler.git';
const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  authorName: 'Pahud Hsieh',
  authorEmail: 'pahudnet@gmail.com',
  name: PROJECT_NAME,
  description: PROJECT_DESCRIPTION,
  repository: PROJECT_REPOSITORY,
  dependabot: false,
  defaultReleaseBranch: 'main',
  keywords: [
    'aws',
    'fargate',
    'autoscaler',
  ],
  deps: [
    'projen-automate-it',
  ],
  bundledDeps: [
    'projen-automate-it',
  ],
  catalog: {
    twitter: 'pahudnet',
    announce: false,
  },

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
    module: 'cdk_fargate_fastautoscaler',
  },
});

const automation = new Automation(project, {
  automationToken: AUTOMATION_TOKEN,
});
automation.autoApprove();
automation.autoMerge();
automation.projenYarnUpgrade();

const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude, '/codebase');
project.gitignore.exclude(...common_exclude);

project.synth();
