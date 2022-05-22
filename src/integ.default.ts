import {
  Stack, App,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { FargateFastAutoscaler } from './autoscaler';

export class IntegTesting {
  readonly stack: Stack[];
  constructor() {

    const app = new App();

    const stack = new Stack(app, 'FargateFastAutoscalerDemo');

    const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 });

    new FargateFastAutoscaler(stack, 'FargateFastAutoscaler', {
      vpc,
    });

    this.stack = [stack];
  }
}

// run the integ testing
new IntegTesting();
