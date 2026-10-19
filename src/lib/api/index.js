import { IS_DEMO } from '../config';
import { supabaseApi } from './supabase';
import { mockApi } from './mock';

export const api = IS_DEMO ? mockApi : supabaseApi;
