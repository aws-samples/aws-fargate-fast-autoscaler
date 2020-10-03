import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { IntegTesting } from '../src/integ.default';

test('integ snapshot validation', () => {
  const integ = new IntegTesting();
  integ.stack.forEach(stack => {
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
