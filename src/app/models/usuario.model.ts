import { User } from '@supabase/supabase-js';

export interface Usuario extends User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  rol: string;
}