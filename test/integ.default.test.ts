import '@aws-cdk/assert/jest';
import { IntegTesting } from '../src/integ.default';
import { SynthUtils } from '@aws-cdk/assert';

test('integ snapshot validation', () => {
  const integ = new IntegTesting();
  integ.stack.forEach(stack => {
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
})
