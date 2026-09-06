import { setupServer } from 'msw/native';
import { handlers } from './index';

export const server = setupServer(...handlers);
