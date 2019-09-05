import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
import iam = require("@aws-cdk/aws-iam");
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfn_tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import lambda = require('@aws-cdk/aws-lambda');
import sns = require('@aws-cdk/aws-sns');
import sam = require('@aws-cdk/aws-sam');
// import cfn = require('@aws-cdk/aws-cloudformation');


const DefaultSNSTopicArn = 'arn:aws:sns:ap-northeast-1:903779448426:SNS2IM'

class FargateCdkStack extends cdk.Stack {
    public fargateWatcherFuncArn: string;
    //   public snsTopicArn: string;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //new vpc
        const vpc = new ec2.Vpc(this, 'cdk-fargate-vpc', {
            cidr: '10.100.0.0/16',
            maxAzs: 3
        });

        //sg for HTTP public access
        const httpPublicSecurityGroup = new ec2.SecurityGroup(this, "HttpPublicSecurityGroup", {
            allowAllOutbound: true,
            securityGroupName: 'HttpPublicSecurityGroup',
            vpc: vpc
        });

        httpPublicSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80));


        // // Fargate Cluster
        const fgCluster = new ecs.Cluster(this, 'fgCluster', {
            vpc: vpc
        });


        // // task iam role
        const taskIAMRole = new iam.Role(this, 'fgDemoTaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        taskIAMRole.addToPolicy(new iam.PolicyStatement({
            resources: ['*'],
            actions: ['xray:PutTraceSegments']
        }));

        // ECS task definition
        const demoTaskDef = new ecs.FargateTaskDefinition(this, 'cdk-fargate-demo-taskdef', {
            cpu: 256,
            memoryLimitMiB: 512,
            taskRole: taskIAMRole,

        })

        const mainContainer = demoTaskDef.addContainer('main', {
            image: ecs.ContainerImage.fromAsset('./nginx', {}),
            cpu: 0,
            logging: new ecs.AwsLogDriver({
                streamPrefix: 'echo-http-req'
            }),
        })

        const phpContainer = demoTaskDef.addContainer('backend', {
            image: ecs.ContainerImage.fromAsset('./php', {}),
            cpu: 0,
            logging: new ecs.AwsLogDriver({
                streamPrefix: 'echo-http-req'
            })
        })

        //   mainContainer.addLink(phpContainer, 'app')
        mainContainer.addPortMappings({
            containerPort: 80
        })

        phpContainer.addPortMappings({
            containerPort: 2015
        })

        const demoService = new ecs.FargateService(this, 'demo-service', {
            cluster: fgCluster,
            desiredCount: 2,
            taskDefinition: demoTaskDef,
            securityGroup: ec2.SecurityGroup.fromSecurityGroupId(this, 'SgDemoService', vpc.vpcDefaultSecurityGroup),
        });


        const externalLB = new elbv2.ApplicationLoadBalancer(this, 'external', {
            vpc: vpc,
            internetFacing: true,
            securityGroup: httpPublicSecurityGroup,
        });

        const externalListener = externalLB.addListener('PublicListener', {
            port: 80
        });


        const healthCheckDefault = {
            "port": 'traffic-port',
            "path": '/',
            "intervalSecs": 30,
            "timeoutSeconds": 5,
            "healthyThresholdCount": 5,
            "unhealthyThresholdCount": 2,
            "healthyHttpCodes": "200,301,302"
        };

        externalListener.addTargets('fg-echo-req', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            healthCheck: healthCheckDefault,
            targets: [demoService],
            deregistrationDelay: cdk.Duration.seconds(3)
        });


        // SAM
        // IAM role for lambda
        const lambdaRole = new iam.Role(this, 'lambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });
        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'))
        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'))

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            resources: ['*'],
            actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
            ]
        }));


        lambdaRole.addToPolicy(new iam.PolicyStatement({
            resources: ['*'],
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ]
        }));

        // create aws-lambda-layer-awscli lambda layer from SAR
        const lambdaLayerAwscli = new sam.CfnApplication(this, 'Lawscli', {
            location: {
                applicationId: 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli',
                semanticVersion: '1.16.207',
            },
            parameters: {}

        })
        // Array.isArray(lambdaLayerAwscli) 

        const awscliLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'awscliLayer', lambdaLayerAwscli.getAtt('Outputs.LayerVersionArn').toString())

        const fargateWatcherFunc = new lambda.Function(this, 'fargateWatcherFunc', {
            runtime: lambda.Runtime.PROVIDED,
            handler: 'main',
            code: lambda.Code.asset('./sam/fargateWatcherFunc/lambda.zip'),
            layers: [awscliLayer],
            memorySize: 1024,
            timeout: cdk.Duration.minutes(1),
            role: lambdaRole,
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
            securityGroup: ec2.SecurityGroup.fromSecurityGroupId(this, 'Sg', vpc.vpcDefaultSecurityGroup),
            environment: {
                cluster: fgCluster.clusterName,
                service: demoService.serviceName,
                disable_scalein: 'yes',
                region: 'ap-northeast-1'
            },
        });

        this.fargateWatcherFuncArn = fargateWatcherFunc.functionArn

        Array.isArray(fargateWatcherFunc)
        new cdk.CfnOutput(this, 'ClusterARN: ', { value: fgCluster.clusterArn });
        new cdk.CfnOutput(this, 'URL: ', { value: 'http://' + externalListener.loadBalancer.loadBalancerDnsName });
        new cdk.CfnOutput(this, 'FargateWatcherLambdaArn: ', { value: fargateWatcherFunc.functionArn });
    }
}


interface StepFunCdkStackProps extends cdk.StackProps {
    lambdaArn: string,
    snsTopicArn: string,
}

class StepFuncCdkStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: StepFunCdkStackProps) {
        super(scope, id, props);

        const wait3 = new sfn.Wait(this, 'Wait 3 Seconds', {
            // time: sfn.WaitTime.secondsPath('$.wait_time') 
            time: sfn.WaitTime.duration(cdk.Duration.seconds(3))
        });
        const wait60 = new sfn.Wait(this, 'Wait 60 Seconds', {
            time: sfn.WaitTime.duration(cdk.Duration.seconds(60))
        });

        const getEcsTasks = new sfn.Task(this, 'GetECSTasks', {
            task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'getEcsTasks', props.lambdaArn)),
            resultPath: '$.status',
        });

        const snsScaleOut = new sfn.Task(this, 'SNSScaleOut', {
            task: new sfn_tasks.PublishToTopic(sns.Topic.fromTopicArn(this, 'snsTopic', props.snsTopicArn), {
                // message: sfn.TaskInput.fromDataAt('$'),
                message: sfn.TaskInput.fromObject({
                    'Input.$': '$'
                }),
                subject: "Fargate Start Scaling Out",
            }),
            resultPath: "$.taskresult",

        });
        const svcScaleOut = new sfn.Task(this, 'ServiceScaleOut', {
            task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'svcScaleOut', props.lambdaArn)),

        });

        const isServiceOverloaded = new sfn.Choice(this, 'IsServiceOverloaded', {
            inputPath: '$.status'
        });
        const isDone = new sfn.Pass(this, 'Done')

        const desire2 = new sfn.Pass(this, 'Desire2', {
            outputPath: '$',
            result: sfn.Result.fromObject({ Desired: 2 })
        })
        // const desire5 = new sfn.Pass(this, 'Desire5', {
        //     outputPath: DISCARD,
        //     result: sfn.Result.fromObject({Desired: 5})
        // })
        const desire10 = new sfn.Pass(this, 'Desire10', {
            outputPath: '$',
            result: sfn.Result.fromObject({ Desired: 10 })
        })
        const desire15 = new sfn.Pass(this, 'Desire15', {
            outputPath: '$',
            result: sfn.Result.fromObject({ Desired: 15 })
        })
        const desire20 = new sfn.Pass(this, 'Desire20', {
            outputPath: '$',
            result: sfn.Result.fromObject({ Desired: 20 }),
        })

        const chain = sfn.Chain
            .start(getEcsTasks)
            .next(isServiceOverloaded
                .when(sfn.Condition.numberGreaterThanEquals('$.avg', 500), desire20
                    .next(snsScaleOut
                        .next(svcScaleOut
                            .next(wait60
                                .next(getEcsTasks
                                )))))
                .when(sfn.Condition.numberGreaterThanEquals('$.avg', 300), desire15
                    .next(snsScaleOut
                    ))
                .when(sfn.Condition.numberGreaterThanEquals('$.avg', 100), desire10
                    .next(snsScaleOut
                    ))
                .when(sfn.Condition.numberGreaterThanEquals('$.avg', 50), desire2
                    .next(snsScaleOut
                    ))
                // .when(sfn.Condition.numberLessThanEquals('$.avg', 10), desire2
                //     .next(snsScaleOut
                // ))
                .when(sfn.Condition.numberLessThan('$.avg', 0), isDone)
                .otherwise(wait3
                    .next(getEcsTasks)
                ));

        new sfn.StateMachine(this, 'FargateFastAutoscaler', {
            definition: chain,
            timeout: cdk.Duration.hours(24)
        });

    }
}

exports.FargateCdkStack = FargateCdkStack;
exports.StepFuncCdkStack = StepFuncCdkStack;

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env['CDK_DEFAULT_REGION'] || process.env['AWS_DEFAULT_REGION'],
    account: app.node.tryGetContext('account') || process.env['CDK_DEFAULT_ACCOUNT'] || process.env['AWS_ACCOUNT'],
}


const FgStack = new FargateCdkStack(app, 'fargate-fast-autoscaling', {
    env: env
});
const StepFuncStack = new StepFuncCdkStack(app, 'fargate-fast-autoscaling-stepfunc', {
    env: env,
    lambdaArn: FgStack.fargateWatcherFuncArn,
    snsTopicArn: app.node.tryGetContext('snsTopicArn') || DefaultSNSTopicArn
});

Array.isArray(StepFuncStack)

app.synth();