import { formatDate } from '@/utils/format';
// was: import { formatDate } from '../utils/format';

export const Home = () => <p>{formatDate(new Date())}</p>;
