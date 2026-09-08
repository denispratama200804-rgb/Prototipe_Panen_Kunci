import { SupabaseUserRepository } from './SupabaseUserRepository.js';

/**
 * UserRepository
 * Alias & Singleton wrapper untuk SupabaseUserRepository demi backwards-compatibility.
 */
export const UserRepository = SupabaseUserRepository;
export { SupabaseUserRepository };
