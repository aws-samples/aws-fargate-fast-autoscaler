import { expect, haveResource } from '@aws-cdk/assert';
import { Test } from 'nodeunit';
import cdk = require('@aws-cdk/core');
import { AwsFargateFastAutoscalerStack } from '../lib/cdk-stack';

export = {
    'default construct'(test: Test) {
        // GIVEN
        const app = new cdk.App();
        const env = {
            region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
            account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
        };
        // WHEN
        const stack = new AwsFargateFastAutoscalerStack(app, 'MyTestStack', {
            env
        });
        // THEN
        expect(stack).to(haveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
            Scheme: 'internet-facing',
            Type: 'application'
        }));

        stack.fargateService.taskDefinition

        expect(stack).to(haveResource("AWS::StepFunctions::StateMachine"));
        expect(stack).to(haveResource("AWS::ECS::Service"));
        expect(stack).to(haveResource("AWS::ECS::TaskDefinition"));

        test.done();
    }
}