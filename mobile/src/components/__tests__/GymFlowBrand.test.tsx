import React, { ReactElement } from 'react';
import { GymFlowLogo, GymFlowWordmark, GymFlowBrandHeader } from '../GymFlowBrand';

describe('GymFlowBrand Components', () => {
  it('instantiates components as JSX elements', () => {
    const logoEl = <GymFlowLogo size={36} />;
    expect(logoEl.props.size).toBe(36);

    const wordmarkEl = <GymFlowWordmark variant="dark" height={28} />;
    expect(wordmarkEl.props.height).toBe(28);

    const headerEl = <GymFlowBrandHeader layout="row" subtitle="Member Companion" />;
    expect(headerEl.props.subtitle).toBe('Member Companion');
  });

  it('evaluates GymFlowLogo component output with proportional dimensions', () => {
    const output = GymFlowLogo({ size: 40 }) as ReactElement<any>;
    expect(output).toBeTruthy();
    expect(output.props.accessibilityLabel).toBe('GymFlow Logo');
    expect(output.props.style[0].height).toBe(40);
    expect(output.props.style[0].width).toBe(40);
  });

  it('evaluates GymFlowWordmark component output with light and dark variants', () => {
    const darkOutput = GymFlowWordmark({ variant: 'dark', height: 28 }) as ReactElement<any>;
    expect(darkOutput).toBeTruthy();
    expect(darkOutput.props.accessibilityLabel).toBe('GymFlow');
    expect(darkOutput.props.style[0].height).toBe(28);
    expect(darkOutput.props.style[0].width).toBe(Math.round(28 * (2170 / 725)));

    const lightOutput = GymFlowWordmark({ variant: 'light', height: 32 }) as ReactElement<any>;
    expect(lightOutput).toBeTruthy();
    expect(lightOutput.props.style[0].height).toBe(32);
  });

  it('evaluates GymFlowBrandHeader in row and column layout', () => {
    const rowOutput = GymFlowBrandHeader({
      layout: 'row',
      subtitle: 'Member Companion',
    }) as ReactElement<any>;
    expect(rowOutput).toBeTruthy();
    expect(rowOutput.props.accessibilityLabel).toBe('GymFlow Brand Header');

    const colOutput = GymFlowBrandHeader({
      layout: 'column',
      subtitle: 'Peak Performance',
    }) as ReactElement<any>;
    expect(colOutput).toBeTruthy();
    expect(colOutput.props.accessibilityLabel).toBe('GymFlow Brand Header');
  });
});
