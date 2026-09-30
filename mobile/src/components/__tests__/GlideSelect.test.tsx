import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { GlideSelect } from '../GlideSelect';

describe('GlideSelect Component', () => {
  const options = [
    { value: '7d', label: '7 Days', tag: 'Weekly' },
    { value: '30d', label: '30 Days', tag: 'Monthly' },
    { value: '90d', label: '90 Days', tag: 'Quarter' },
  ];

  it('renders trigger with current value label', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <GlideSelect options={options} value="7d" />
      );
    });
    expect(testRenderer).toBeDefined();
    const testInstance = testRenderer.root;
    const textNodes = testInstance.findAllByType('Text' as any);
    const hasLabel = textNodes.some((node: any) => node.props.children === '7 Days');
    expect(hasLabel).toBe(true);
  });

  it('renders placeholder when no value is provided', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <GlideSelect options={options} value="" placeholder="Choose period..." />
      );
    });
    expect(testRenderer).toBeDefined();
    const testInstance = testRenderer.root;
    const textNodes = testInstance.findAllByType('Text' as any);
    const hasPlaceholder = textNodes.some((node: any) => node.props.children === 'Choose period...');
    expect(hasPlaceholder).toBe(true);
  });

  it('instantiates properly with custom props and normalized options', async () => {
    const stringOptions = ['Alpha', 'Beta', 'Gamma'];
    const onChange = jest.fn();
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <GlideSelect
          options={stringOptions}
          value="Beta"
          onChange={onChange}
          size="sm"
          menuWidth={160}
        />
      );
    });
    expect(testRenderer).toBeDefined();
    const testInstance = testRenderer.root;
    const textNodes = testInstance.findAllByType('Text' as any);
    const hasBeta = textNodes.some((node: any) => node.props.children === 'Beta');
    expect(hasBeta).toBe(true);
  });
});
