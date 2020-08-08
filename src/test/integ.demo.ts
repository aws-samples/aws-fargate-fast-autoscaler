import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2';
import { AwsLogDriver, ContainerImage } from '@aws-cdk/aws-ecs';
import { FargateFastAutoscaler } from '../autoscaler';
import * as path from 'path';



const app = new cdk.App()

const env = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

const stack = new cdk.Stack(app, 'FargateFastAutoscalerDemo', { env })

const vpc = ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true })

new FargateFastAutoscaler(stack, 'FargateFastAutoscaler', {
  vpc,
  backendContainer: {
    image: ContainerImage.fromAsset(path.join(__dirname, '../../sample/backend/php')),
    cpu: 0,
    logging: new AwsLogDriver({
      streamPrefix: 'echo-http-req',
    }),
  },
  backendContainerPortMapping: [
    { containerPort: 2015 },
  ],
})


