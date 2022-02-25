const { awscdk, DevEnvironmentDockerImage, Gitpod } = require('projen');

const PROJECT_NAME = 'cdk-fargate-fastautoscaler';
const PROJECT_DESCRIPTION = 'A JSII construct lib to build AWS Fargate Fast Autoscaler';
const PROJECT_REPOSITORY = 'https://github.com/aws-samples/aws-fargate-fast-autoscaler.git';

const project = new awscdk.AwsCdkConstructLibrary({
  authorName: 'Pahud Hsieh',
  authorEmail: 'pahudnet@gmail.com',
  cdkVersion: '2.1.0',
  minNodeVersion: '14.17.0',
  name: PROJECT_NAME,
  description: PROJECT_DESCRIPTION,
  repository: PROJECT_REPOSITORY,
  defaultReleaseBranch: 'main',
  keywords: [
    'aws',
    'fargate',
    'autoscaler',
  ],
  catalog: {
    twitter: 'pahudnet',
    announce: false,
  },
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['pahud'],
  },
  python: {
    distName: 'cdk-fargate-fastautoscaler',
    module: 'cdk_fargate_fastautoscaler',
  },
});

project.package.addField('resolutions', {
  'pac-resolver': '^5.0.0',
  'set-value': '^4.0.1',
  'ansi-regex': '^5.0.1',
});


const gitpodPrebuild = project.addTask('gitpod:prebuild', {
  description: 'Prebuild setup for Gitpod',
});
// install and compile only, do not test or package.
gitpodPrebuild.exec('yarn install --frozen-lockfile --check-files');
gitpodPrebuild.exec('npx projen compile');

let gitpod = new Gitpod(project, {
  dockerImage: DevEnvironmentDockerImage.fromImage('public.ecr.aws/pahudnet/gitpod-workspace:latest'),
  prebuilds: {
    addCheck: true,
    addBadge: true,
    addLabel: true,
    branches: true,
    pullRequests: true,
    pullRequestsFromForks: true,
  },
});

gitpod.addCustomTask({
  init: 'yarn gitpod:prebuild',
  // always upgrade after init
  command: 'npx projen upgrade',
});

gitpod.addVscodeExtensions(
  'dbaeumer.vscode-eslint',
  'ms-azuretools.vscode-docker',
  'AmazonWebServices.aws-toolkit-vscode',
);

const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude, '/codebase');
project.gitignore.exclude(...common_exclude);

project.synth();
