import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2';
import { AwsLogDriver, ContainerImage } from '@aws-cdk/aws-ecs';
import { FargateFastAutoscaler } from './autoscaler';
import * as path from 'path';

export class IntegTesting {
  readonly stack: cdk.Stack[];
  constructor() {

    const app = new cdk.App()

    const stack = new cdk.Stack(app, 'FargateFastAutoscalerDemo')

    const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 })

    new FargateFastAutoscaler(stack, 'FargateFastAutoscaler', {
      vpc,
      backendContainer: {
        image: ContainerImage.fromAsset(path.join(__dirname, '../sample/backend/php')),
        cpu: 0,
        logging: new AwsLogDriver({
          streamPrefix: 'echo-http-req',
        }),
      },
      backendContainerPortMapping: [
        { containerPort: 2015 },
      ],
    })

    this.stack = [ stack ]
  }
}

// run the integ testing
new IntegTesting();
