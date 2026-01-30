import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  });
};
